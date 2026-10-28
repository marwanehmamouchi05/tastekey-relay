import { NextResponse } from "next/server";
import type { publicCatalog } from "./integrations";
export function widgetResponse(
  catalog: NonNullable<ReturnType<typeof publicCatalog>>,
) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const config = JSON.stringify(catalog).replaceAll("<", "\\u003c");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offers for you · TasteKey</title><link rel="stylesheet" href="/integration/widget.css"></head><body>
  <main><header><span class="brand">TasteKey</span><h1 id="title">Offers for you</h1><p>Offers from <strong id="business"></strong>. Choose what you share.</p></header>
  <div class="actions"><button id="connect">Use my likes</button><button id="clear" hidden>Stop using my likes</button></div>
  <p id="status" role="status">Showing all offers. Nothing about you has been shared.</p>
  <details><summary>Set a budget (optional)</summary><label>Maximum price <input id="budget" type="number" min="0" max="10000000"></label><label>Currency <select id="currency"><option>USD</option><option>MAD</option><option>EUR</option></select></label><button id="apply-budget">Apply budget</button><p>Offers without a price in this currency will be hidden. Prices are provided by the business and may change.</p></details>
  <div id="offers" class="offers"></div><p id="empty" hidden>No offers match this budget. Remove the budget to see all offers.</p>
  <details class="privacy"><summary>How your likes are used</summary><p>Your chosen likes stay inside this TasteKey frame. The business does not receive your list. Matching uses the words and categories you choose, not a prediction about you. Likes clear after 15 minutes or when this frame closes. Clicking an offer opens the business website, which has its own privacy policy. Prices and availability are not independently checked.</p></details>
  <a id="personal" href="/personal/discover" target="_blank" rel="noopener noreferrer">Create your TasteKey likes</a>
  </main><script id="tastekey-config" type="application/json" nonce="${nonce}">${config}</script><script nonce="${nonce}" src="/integration/match.js"></script><script nonce="${nonce}" src="/integration/widget.js"></script></body></html>`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": `default-src 'none'; script-src 'self' 'nonce-${nonce}'; style-src 'self'; img-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self' ${catalog.origin}`,
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    },
  });
}
