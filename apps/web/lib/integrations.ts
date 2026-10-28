import { z } from "zod";
import { Category, type Business } from "@tastekey/shared-types";
import { db, get, put, tenantFor } from "./db";
import { AccessError, assertWrite, requireRole, audit } from "./identity";
export const OfferInput = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600).default(""),
  url: z
    .url()
    .max(1000)
    .refine((v) => {
      const u = new URL(v);
      return u.protocol === "https:" && !u.username && !u.password;
    }, "Use a public HTTPS offer link."),
  category: Category,
  tags: z.array(z.string().trim().min(2).max(60)).min(1).max(12),
  price: z.number().min(0).max(10000000).nullable().default(null),
  currency: z.enum(["USD", "MAD", "EUR"]).default("USD"),
});
export type Offer = z.infer<typeof OfferInput> & {
  id: string;
  businessId: string;
  published: boolean;
};
export type Site = {
  id: string;
  businessId: string;
  origin: string;
  enabled: boolean;
};
function business(tenant: string, id: string) {
  const b = get<Business>(tenant, "business", id);
  if (!b) throw new AccessError("Business not found.", 404);
  return b;
}
function records<T>(tenant: string, kind: string, businessId: string): T[] {
  return (
    db()
      .prepare(
        "SELECT data FROM records WHERE tenant=? AND kind=? AND business=? ORDER BY rowid",
      )
      .all(tenant, kind, businessId) as { data: string }[]
  ).map((r) => JSON.parse(r.data));
}
export function integration(tenant: string, businessId: string) {
  business(tenant, businessId);
  return {
    site: records<Site>(tenant, "embed", businessId)[0] || null,
    offers: records<Offer>(tenant, "offer", businessId),
  };
}
export function configureSite(
  token: string,
  tenant: string,
  businessId: string,
  input: { origin: string; enabled: boolean },
) {
  const who = requireRole(token, ["owner", "admin"]);
  if (who.workspace !== tenant)
    throw new AccessError("Workspace not available.");
  business(tenant, businessId);
  const url = new URL(input.origin);
  const local =
    process.env.APP_ORIGIN?.startsWith("http://") &&
    ["localhost", "127.0.0.1"].includes(url.hostname);
  if (
    (!local && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new AccessError(
      "Enter your website origin, such as https://shop.example.com.",
      400,
    );
  const current = integration(tenant, businessId);
  if (input.enabled && !current.offers.some((o) => o.published))
    throw new AccessError(
      "Add at least one published offer before turning on the widget.",
      400,
    );
  if (current.offers.some((o) => new URL(o.url).origin !== url.origin))
    throw new AccessError(
      "Offer links must belong to the website you connect. Remove old offers before changing the website.",
      400,
    );
  const site: Site = {
    id: current.site?.id || crypto.randomUUID(),
    businessId,
    origin: url.origin,
    enabled: input.enabled,
  };
  put(tenant, "embed", businessId, site);
  audit(
    tenant,
    who.id,
    "widget.settings",
    input.enabled
      ? "Public offer widget enabled."
      : "Public offer widget disabled or configured.",
  );
  return site;
}
export function saveOffer(
  token: string | undefined,
  tenant: string,
  businessId: string,
  input: z.infer<typeof OfferInput>,
  id?: string,
  published = false,
) {
  if (tenantFor(token) !== tenant)
    throw new AccessError("Workspace not available.");
  assertWrite(token);
  const config = integration(tenant, businessId);
  if (!config.site)
    throw new AccessError(
      "Ask an owner or admin to connect the website first.",
      400,
    );
  if (new URL(input.url).origin !== config.site.origin)
    throw new AccessError("Use an offer link on your connected website.", 400);
  if (id && !get<Offer>(tenant, "offer", id))
    throw new AccessError("Offer not found.", 404);
  if (id && get<Offer>(tenant, "offer", id)?.businessId !== businessId)
    throw new AccessError("Offer belongs to a different business.");
  if (!id && config.offers.length >= 50)
    throw new AccessError("This widget supports up to 50 offers.", 400);
  const offer: Offer = {
    ...input,
    id: id || crypto.randomUUID(),
    businessId,
    published,
  };
  put(tenant, "offer", businessId, offer);
  return offer;
}
export function removeOffer(
  token: string | undefined,
  tenant: string,
  id: string,
) {
  if (tenantFor(token) !== tenant)
    throw new AccessError("Workspace not available.");
  assertWrite(token);
  if (!get(tenant, "offer", id)) throw new AccessError("Offer not found.", 404);
  db()
    .prepare("DELETE FROM records WHERE tenant=? AND kind='offer' AND id=?")
    .run(tenant, id);
}
export function publicCatalog(id: string) {
  if (id === "demo")
    return {
      id: "demo",
      demo: true,
      businessName: "Sample bookshop (demo)",
      origin: new URL(process.env.APP_ORIGIN || "http://localhost:3000").origin,
      offers: [
        {
          id: "demo-1",
          title: "Stories from the sea (sample)",
          description: "A made-up book offer for testing.",
          url: "https://example.org/tastekey-demo/sea",
          category: "book",
          tags: ["sea", "adventure"],
          price: 12,
          currency: "USD",
        },
        {
          id: "demo-2",
          title: "Modern architecture (sample)",
          description: "A made-up design book offer for testing.",
          url: "https://example.org/tastekey-demo/design",
          category: "book",
          tags: ["architecture", "design", "modern spaces"],
          price: 18,
          currency: "USD",
        },
      ],
    };
  if (!z.uuid().safeParse(id).success) return null;
  const row = db()
    .prepare(
      "SELECT tenant,business,data FROM records WHERE kind='embed' AND id=?",
    )
    .get(id) as { tenant: string; business: string; data: string } | undefined;
  if (!row) return null;
  const site = JSON.parse(row.data) as Site;
  if (!site.enabled) return null;
  const b = get<Business>(row.tenant, "business", row.business);
  if (!b) return null;
  return {
    id,
    businessName: b.name,
    origin: site.origin,
    offers: records<Offer>(row.tenant, "offer", row.business)
      .filter((o) => o.published && new URL(o.url).origin === site.origin)
      .map(
        ({ id, title, description, url, tags, category, price, currency }) => ({
          id,
          title,
          description,
          url,
          tags,
          category,
          price,
          currency,
        }),
      ),
  };
}
