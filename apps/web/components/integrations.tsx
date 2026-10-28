"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { ProfileSchema } from "@tastekey/shared-types";
import type { Offer, Site } from "@/lib/integrations";
type SavedLike = { label: string; category: string };
export function ConnectLikes() {
  const [catalog, setCatalog] = useState<{
    businessName: string;
    origin: string;
  }>();
  const [likes, setLikes] = useState<SavedLike[]>([]),
    [selected, setSelected] = useState<number[]>([]),
    [consent, setConsent] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false),
    [sending, setSending] = useState(false);
  const pending = useRef(false);
  const acknowledgementTimer = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);
  function loadLikes() {
    try {
      const raw = localStorage.getItem("tastekey.profile.v1");
      const p = raw ? ProfileSchema.parse(JSON.parse(raw)) : null;
      setLikes(
        (p?.nodes || [])
          .filter((n) => ["stated", "confirmed"].includes(n.status))
          .slice(0, 60)
          .map(({ label, category }) => ({ label, category })),
      );
      setSelected([]);
      setConsent(false);
    } catch {
      setError(
        "Your saved likes could not be read. Open TasteKey to check them.",
      );
    }
  }
  useEffect(() => {
    const q = new URLSearchParams(location.search),
      id = q.get("widget");
    if (!id || !q.get("state") || !window.opener) {
      setError("Open this page using “Use my likes” on a business widget.");
      return;
    }
    fetch("/api/widget-data/" + encodeURIComponent(id))
      .then(async (r) => {
        if (!r.ok) throw new Error("This widget is no longer available.");
        setCatalog(await r.json());
      })
      .catch((e) => setError(e.message));
    loadLikes();
    const source = window.opener;
    const acknowledge = (event: MessageEvent) => {
      if (
        !pending.current ||
        event.origin !== location.origin ||
        event.source !== source ||
        event.data?.type !== "tastekey:likes-ack" ||
        event.data.state !== q.get("state") ||
        event.data.widget !== id ||
        !["accepted", "expired"].includes(event.data.status)
      )
        return;
      pending.current = false;
      clearTimeout(acknowledgementTimer.current);
      setSending(false);
      if (event.data.status === "accepted") setSent(true);
      else
        setError(
          "This connection expired. Return to the offers window and click “Use my likes” again.",
        );
    };
    window.addEventListener("message", acknowledge);
    return () => {
      window.removeEventListener("message", acknowledge);
      clearTimeout(acknowledgementTimer.current);
    };
  }, []);
  return (
    <div className="connect-likes panel">
      <h1>Choose what to use</h1>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {sent ? (
        <>
          <p>Your chosen likes are ready. Return to the offers window.</p>
          <button className="primary" onClick={() => window.close()}>
            Close this window
          </button>
        </>
      ) : (
        <>
          {catalog && (
            <>
              <p>
                Show offers from <strong>{catalog.businessName}</strong> that
                match the likes you choose.
              </p>
              <p className="microcopy">
                Business website: {catalog.origin}. Your list stays inside
                TasteKey. It is not sent to the business.
              </p>
            </>
          )}
          <div className="consent-options">
            {likes.map((like, i) => (
              <label key={i}>
                <input
                  type="checkbox"
                  checked={selected.includes(i)}
                  onChange={(e) =>
                    setSelected((s) =>
                      e.target.checked
                        ? [...s, i].slice(0, 20)
                        : s.filter((n) => n !== i),
                    )
                  }
                />
                <span>{like.label}</span>
              </label>
            ))}
          </div>
          {!likes.length && (
            <p>
              No likes are saved in this browser yet.{" "}
              <Link
                href="/personal/discover"
                target="_blank"
                rel="noopener noreferrer"
              >
                Add some in TasteKey
              </Link>
              , then come back.
            </p>
          )}
          <button className="text-button" onClick={loadLikes}>
            Reload my likes
          </button>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Use only these selected likes for this widget. Clear them after 15
            minutes or when the widget closes.
          </label>
          <button
            className="primary"
            disabled={
              !catalog || !consent || !selected.length || sent || sending
            }
            onClick={() => {
              const q = new URLSearchParams(location.search);
              setError("");
              setSending(true);
              pending.current = true;
              acknowledgementTimer.current = setTimeout(() => {
                pending.current = false;
                setSending(false);
                setError(
                  "The offers window did not confirm your choice. Return there and click “Use my likes” again. Your likes have not been confirmed as applied.",
                );
              }, 12000);
              window.opener?.postMessage(
                {
                  type: "tastekey:likes",
                  state: q.get("state"),
                  widget: q.get("widget"),
                  likes: selected.map((i) => likes[i]),
                },
                location.origin,
              );
            }}
          >
            {sending ? "Waiting for the offers window…" : "Use selected likes"}
          </button>
        </>
      )}
    </div>
  );
}
export function IntegrationHome() {
  return (
    <div className="integration-home">
      <h1>Use TasteKey on other websites</h1>
      <p>Choose how TasteKey helps you.</p>
      <section className="panel">
        <h2>For you: filter a search page</h2>
        <p>
          Choose a few likes, open a search page and use the extension to show
          matches. Filtering happens on your device.
        </p>
        <a
          className="primary"
          href="/downloads/tastekey-extension.zip"
          download
        >
          Download the extension
        </a>
        <details>
          <summary>How to install it</summary>
          <ol>
            <li>Download and unzip the file.</li>
            <li>
              In Chrome or Edge, open the Extensions page and turn on Developer
              mode.
            </li>
            <li>Choose “Load unpacked” and select the unzipped folder.</li>
            <li>
              Open TasteKey, click the extension and choose “Copy my likes from
              TasteKey.”
            </li>
            <li>
              Choose which likes to keep. Open a search page, click the
              extension and choose “Show matches.”
            </li>
          </ol>
          <p>
            This is a developer build, not a Chrome Web Store listing. It reads
            the current page only when you open it and ask. It works with
            supported search-result cards, not every website. It does not change
            the search engine's own ranking.
          </p>
        </details>
      </section>
      <section className="panel">
        <h2>For businesses: show offers that fit</h2>
        <p>
          Add your offers in Studio. Put the widget on your website. Visitors
          can choose which likes to use, and matching happens inside TasteKey.
        </p>
        <Link className="primary" href="/studio/integrations">
          Set up a website widget
        </Link>
        <p className="microcopy">
          Your offer links bring visitors to your website. This does not promise
          more customers or sales.
        </p>
      </section>
      <details className="panel">
        <summary>Try a sample widget</summary>
        <p>
          These are made-up offers for testing, not real products or prices. The
          example links do not sell anything.
        </p>
        <iframe
          title="Sample TasteKey widget"
          src="/api/widget/demo"
          className="widget-preview"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        />
      </details>
    </div>
  );
}
type IntegrationData = { site: Site | null; offers: Offer[] };
const emptyOffer = {
  title: "",
  description: "",
  url: "",
  category: "book",
  tags: "",
  price: "",
  currency: "USD",
  published: false,
};
export function BusinessIntegration({
  businessId,
  role,
}: {
  businessId: string;
  role: string;
}) {
  const [data, setData] = useState<IntegrationData>(),
    [origin, setOrigin] = useState(""),
    [enabled, setEnabled] = useState(false),
    [offer, setOffer] = useState(emptyOffer),
    [editing, setEditing] = useState<string>(),
    [offerOpen, setOfferOpen] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const manager = ["owner", "admin"].includes(role),
    writer = role !== "viewer";
  async function refresh() {
    const d = await api<IntegrationData>(
      "integration?businessId=" + businessId,
    );
    setData(d);
    setOrigin(d.site?.origin || "");
    setEnabled(d.site?.enabled || false);
  }
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
  }, [businessId]);
  async function save(path: string, body: unknown) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(path, body);
      await refresh();
      setNotice("Saved.");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  const base = typeof location === "undefined" ? "" : location.origin;
  const snippet = data?.site
    ? `<div data-tastekey-widget="${data.site.id}"></div>\n<script src="${base}/tastekey-widget.js" data-tastekey="${data.site.id}" defer></script>`
    : "";
  return (
    <div className="business-integration">
      <h1>Show the right offers</h1>
      <p>
        Visitors choose their likes. Your widget puts matching offers first.
      </p>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <section className="panel">
        <h2>Connect your website</h2>
        <p>
          Only published offers are public. Your other business records stay
          private.
        </p>
        {!manager && (
          <p className="notice">
            An owner or admin must connect the website and turn the widget on.
          </p>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await save("integration/settings", { businessId, origin, enabled });
          }}
        >
          <label className="field-label">
            Your website address
            <input
              type="url"
              required
              placeholder="https://your-shop.com"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              disabled={!manager || busy}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={!manager || busy}
            />
            Turn on the public widget
          </label>
          <button className="primary" disabled={!manager || busy}>
            Save website settings
          </button>
        </form>
        <p className="microcopy">
          First save your website with the widget off. Add an offer, then turn
          it on. A verified email account is needed to publish.
        </p>
      </section>
      {data?.site && (
        <details
          className="panel"
          open={offerOpen || Boolean(editing) || !data.offers.length}
          onToggle={(e) => setOfferOpen(e.currentTarget.open)}
        >
          <summary>
            <h2>{editing ? "Edit an offer" : "Add an offer"}</h2>
          </summary>
          <p>
            Use offers you actually provide. Visitors will see the title,
            description, price and link.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await save("integration/offer", {
                  businessId,
                  id: editing,
                  published: offer.published,
                  offer: {
                    ...offer,
                    tags: offer.tags
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                    price: offer.price === "" ? null : Number(offer.price),
                  },
                })
              ) {
                setOffer(emptyOffer);
                setEditing(undefined);
                setOfferOpen(false);
              }
            }}
          >
            <label className="field-label">
              Offer name
              <input
                required
                minLength={2}
                maxLength={120}
                value={offer.title}
                onChange={(e) => setOffer({ ...offer, title: e.target.value })}
              />
            </label>
            <label className="field-label">
              Short description
              <textarea
                maxLength={600}
                value={offer.description}
                onChange={(e) =>
                  setOffer({ ...offer, description: e.target.value })
                }
              />
            </label>
            <label className="field-label">
              Offer link on your website
              <input
                type="url"
                required
                value={offer.url}
                onChange={(e) => setOffer({ ...offer, url: e.target.value })}
              />
            </label>
            <div className="form-grid">
              <label className="field-label">
                Type
                <select
                  value={offer.category}
                  onChange={(e) =>
                    setOffer({ ...offer, category: e.target.value })
                  }
                >
                  {[
                    ["book", "Book"],
                    ["movie", "Film"],
                    ["artist", "Music"],
                    ["brand", "Brand"],
                    ["design", "Design"],
                    ["place", "Place"],
                    ["destination", "Destination"],
                    ["tv_show", "TV"],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Words that describe this offer
                <input
                  required
                  placeholder="architecture, design, modern spaces"
                  value={offer.tags}
                  onChange={(e) => setOffer({ ...offer, tags: e.target.value })}
                />
              </label>
            </div>
            <div className="form-grid">
              <label className="field-label">
                Price (optional)
                <input
                  type="number"
                  min="0"
                  max="10000000"
                  value={offer.price}
                  onChange={(e) =>
                    setOffer({ ...offer, price: e.target.value })
                  }
                />
              </label>
              <label className="field-label">
                Currency
                <select
                  value={offer.currency}
                  onChange={(e) =>
                    setOffer({ ...offer, currency: e.target.value })
                  }
                >
                  {["USD", "MAD", "EUR"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={offer.published}
                onChange={(e) =>
                  setOffer({ ...offer, published: e.target.checked })
                }
              />
              Publish this offer when the widget is on
            </label>
            <button className="primary" disabled={busy || !writer}>
              Save offer
            </button>
            {editing && (
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setEditing(undefined);
                  setOffer(emptyOffer);
                }}
              >
                Cancel edit
              </button>
            )}
          </form>
        </details>
      )}
      {!role && (
        <p>
          <Link href="/account">Sign in to connect your website</Link>
        </p>
      )}
      {!!data?.offers.length && (
        <section className="panel">
          <h2>Your offers</h2>
          {data.offers.map((o) => (
            <div className="offer-row" key={o.id}>
              <div>
                <strong>{o.title}</strong>
                <p>
                  {o.published ? "Published when widget is on" : "Draft"} ·{" "}
                  {o.price === null ? "No price" : `${o.price} ${o.currency}`}
                </p>
              </div>
              <button
                className="secondary"
                disabled={!writer || busy}
                onClick={() => {
                  setEditing(o.id);
                  setOffer({
                    ...o,
                    tags: o.tags.join(", "),
                    price: o.price === null ? "" : String(o.price),
                  });
                }}
              >
                Edit
              </button>
              <button
                className="text-button danger"
                disabled={!writer || busy}
                onClick={() =>
                  void save("integration/remove-offer", { id: o.id })
                }
              >
                Remove
              </button>
            </div>
          ))}
        </section>
      )}
      {data?.site?.enabled && (
        <section className="panel">
          <h2>Add it to your website</h2>
          <p>Paste this code where you want the offers to appear.</p>
          <pre className="embed-code">{snippet}</pre>
          <button
            className="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(snippet);
                setNotice("Widget code copied.");
              } catch {
                setError("Select and copy the code above.");
              }
            }}
          >
            Copy widget code
          </button>
          <details>
            <summary>Preview your widget</summary>
            <iframe
              title="Your TasteKey widget"
              src={"/api/widget/" + data.site.id}
              className="widget-preview"
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            />
          </details>
          <p className="microcopy">
            Your site must allow the TasteKey script and frame in its security
            settings. Matching uses selected words and categories, not private
            customer profiles. Measure visits and sales on your own website;
            TasteKey does not claim customer or sales growth.
          </p>
        </section>
      )}
    </div>
  );
}
