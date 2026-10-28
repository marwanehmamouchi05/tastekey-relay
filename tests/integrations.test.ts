import { beforeAll, expect, it } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import {
  put,
  tenantFor,
  newSession,
  deleteWorkspace,
  workspace,
} from "../apps/web/lib/db";
import {
  completeSignIn,
  inviteMember,
  acceptInvite,
} from "../apps/web/lib/identity";
import {
  configureSite,
  saveOffer,
  removeOffer,
  publicCatalog,
  integration,
  OfferInput,
} from "../apps/web/lib/integrations";
import { widgetResponse } from "../apps/web/lib/widget";
beforeAll(() => {
  process.env.TASTEKEY_DB_PATH = join(
    mkdtempSync(join(tmpdir(), "tastekey-widget-")),
    "test.db",
  );
  process.env.APP_ORIGIN = "https://tastekey.example";
});
function fixture() {
  const id = crypto.randomUUID(),
    token = completeSignIn({
      iss: "https://fixture.example",
      sub: id,
      email: id + "@example.org",
      email_verified: true,
    }),
    tenant = tenantFor(token)!,
    businessId = crypto.randomUUID();
  put(tenant, "business", businessId, {
    id: businessId,
    name: "Synthetic bookshop",
    budget: 9999,
    constraints: "Private internal details",
  } as any);
  return { token, tenant, businessId };
}
const offer = () =>
  OfferInput.parse({
    title: "Architecture book",
    url: "https://shop.example.org/books/architecture",
    category: "book",
    tags: ["architecture", "design"],
    price: 18,
    currency: "USD",
  });
it("requires a verified manager to connect/publish a site and enforces same-site offer links", () => {
  const f = fixture();
  expect(() =>
    configureSite(newSession(), f.tenant, f.businessId, {
      origin: "https://shop.example.org",
      enabled: false,
    }),
  ).toThrow("Sign in");
  expect(() =>
    configureSite(f.token, f.tenant, f.businessId, {
      origin: "https://shop.example.org/path",
      enabled: false,
    }),
  ).toThrow("website origin");
  expect(() =>
    configureSite(f.token, f.tenant, f.businessId, {
      origin: "http://shop.example.org",
      enabled: false,
    }),
  ).toThrow();
  configureSite(f.token, f.tenant, f.businessId, {
    origin: "https://shop.example.org",
    enabled: false,
  });
  expect(() =>
    saveOffer(f.token, f.tenant, f.businessId, {
      ...offer(),
      url: "https://other.example.org/offer",
    }),
  ).toThrow("connected website");
  expect(() =>
    configureSite(f.token, f.tenant, f.businessId, {
      origin: "https://shop.example.org",
      enabled: true,
    }),
  ).toThrow("published offer");
  const editor = completeSignIn({
    iss: "https://fixture.example",
    sub: "editor",
    email: "editor@example.org",
    email_verified: true,
  });
  acceptInvite(editor, inviteMember(f.token, "editor@example.org", "editor"));
  expect(() =>
    configureSite(editor, f.tenant, f.businessId, {
      origin: "https://shop.example.org",
      enabled: false,
    }),
  ).toThrow("role");
});
it("publishes only explicit offers, excludes private business data, and disables new widget loads", () => {
  const f = fixture();
  const site = configureSite(f.token, f.tenant, f.businessId, {
    origin: "https://shop.example.org",
    enabled: false,
  });
  saveOffer(
    f.token,
    f.tenant,
    f.businessId,
    { ...offer(), title: "Private draft" },
    undefined,
    false,
  );
  const published = saveOffer(
    f.token,
    f.tenant,
    f.businessId,
    offer(),
    undefined,
    true,
  );
  expect(publicCatalog(site.id)).toBeNull();
  configureSite(f.token, f.tenant, f.businessId, {
    origin: "https://shop.example.org",
    enabled: true,
  });
  const catalog = publicCatalog(site.id)!;
  expect(catalog.offers.map((o) => o.title)).toEqual(["Architecture book"]);
  expect(JSON.stringify(catalog)).not.toMatch(
    /Private internal|9999|Private draft|tenant|email/,
  );
  expect(workspace(f.tenant).offers).toHaveLength(2);
  configureSite(f.token, f.tenant, f.businessId, {
    origin: "https://shop.example.org",
    enabled: false,
  });
  expect(publicCatalog(site.id)).toBeNull();
  removeOffer(f.token, f.tenant, published.id);
  expect(integration(f.tenant, f.businessId).offers).toHaveLength(1);
  deleteWorkspace(f.tenant);
  expect(publicCatalog(site.id)).toBeNull();
});
it("blocks cross-workspace and cross-business edits and viewer changes", () => {
  const a = fixture(),
    b = fixture();
  configureSite(a.token, a.tenant, a.businessId, {
    origin: "https://shop.example.org",
    enabled: false,
  });
  configureSite(b.token, b.tenant, b.businessId, {
    origin: "https://shop.example.org",
    enabled: false,
  });
  const saved = saveOffer(a.token, a.tenant, a.businessId, offer());
  expect(() =>
    saveOffer(b.token, b.tenant, b.businessId, offer(), saved.id),
  ).toThrow("not found");
  expect(() =>
    configureSite(b.token, a.tenant, a.businessId, {
      origin: "https://shop.example.org",
      enabled: false,
    }),
  ).toThrow("Workspace");
  const viewer = completeSignIn({
    iss: "https://fixture.example",
    sub: "viewer",
    email: "viewer@example.org",
    email_verified: true,
  });
  acceptInvite(viewer, inviteMember(a.token, "viewer@example.org", "viewer"));
  expect(() => saveOffer(viewer, a.tenant, a.businessId, offer())).toThrow(
    "role",
  );
});
it("rejects unsafe links and constrains the widget frame to the registered origin", async () => {
  expect(
    OfferInput.safeParse({ ...offer(), url: "javascript:alert(1)" }).success,
  ).toBe(false);
  expect(
    OfferInput.safeParse({
      ...offer(),
      url: "https://user:password@shop.example.org/",
    }).success,
  ).toBe(false);
  const f = fixture();
  const site = configureSite(f.token, f.tenant, f.businessId, {
    origin: "https://shop.example.org",
    enabled: false,
  });
  saveOffer(
    f.token,
    f.tenant,
    f.businessId,
    { ...offer(), title: "</script><img src=x onerror=alert(1)>" },
    undefined,
    true,
  );
  configureSite(f.token, f.tenant, f.businessId, {
    origin: "https://shop.example.org",
    enabled: true,
  });
  const res = widgetResponse(publicCatalog(site.id)!);
  expect(res.headers.get("Content-Security-Policy")).toContain(
    "frame-ancestors 'self' https://shop.example.org",
  );
  expect(res.headers.get("Content-Security-Policy")).toContain(
    "connect-src 'none'",
  );
  expect(res.headers.get("X-Frame-Options")).toBeNull();
  expect(await res.text()).not.toContain("</script><img");
});
it("matches chosen words and categories locally, preserves ties and applies only same-currency known prices", () => {
  const context: any = {};
  runInNewContext(
    readFileSync("apps/web/public/integration/match.js", "utf8"),
    context,
  );
  const rank = context.TasteKeyMatch.rank;
  const items = [
    {
      id: "sea",
      title: "Sea stories",
      category: "book",
      tags: ["adventure"],
      price: 10,
      currency: "USD",
    },
    {
      id: "design",
      title: "Modern architecture",
      category: "book",
      tags: ["design"],
      price: 18,
      currency: "USD",
    },
    {
      id: "unknown",
      title: "Architecture review",
      tags: [],
      price: null,
      currency: "USD",
    },
    {
      id: "eur",
      title: "Architecture Europe",
      tags: [],
      price: 9,
      currency: "EUR",
    },
  ];
  expect(
    rank(items, [{ label: "architecture", category: "design" }])[0].item.id,
  ).toBe("design");
  expect(rank(items, [], undefined).map((r: any) => r.item.id)).toEqual(
    items.map((i) => i.id),
  );
  expect(
    rank(items, [], { max: 12, currency: "USD" }).map((r: any) => r.item.id),
  ).toEqual(["sea"]);
  expect(rank([{ title: "cart", tags: [] }], [{ label: "art" }])[0].score).toBe(
    0,
  );
  expect(
    rank([{ title: "Cafe", tags: [] }], [{ label: "Café" }])[0].score,
  ).toBeGreaterThan(0);
});
