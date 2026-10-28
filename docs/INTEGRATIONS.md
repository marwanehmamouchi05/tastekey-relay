# Browser extension and business website widget

These are two optional ways to use TasteKey beyond its own pages. They do not require another AI key, another AWS service or a paid advertising account.

## For people: search-result filtering

Open [the integration page](https://tastekey.52.47.205.18.sslip.io/integrations), download the extension ZIP and unzip it. In Chrome/Edge's Extensions page, turn on Developer mode, choose **Load unpacked** and select the extracted folder. This is a source-available developer build, not a Chrome Web Store listing. Store publication and installation in the owner's normal browser have not been performed automatically.

Open TasteKey, click the extension and choose **Copy my likes from TasteKey**. Only stated/confirmed label/category pairs are copied; no likes are selected by default. Choose the likes to use, or add comma-separated filter words. On a search-results page, open the extension and choose **Show matches on this page**. **Show all** restores the page. An optional budget keeps only cards with a clear price in the selected currency. No currency conversion is performed.

Adapters recognize Amazon search cards, Etsy listing cards, eBay items, Booking property cards, Google Search result groups, `data-tastekey-result` cards and main article/list-item cards. These selectors can break when sites change their layout. The current implementation checks visible words and categories; it does not change a search engine's ranking, call Qloo for every page, validate prices or infer hidden preferences. When no words match and no budget is set, it leaves all cards visible. Sign-in/payment forms are excluded. It does not submit searches, make purchases, read history or collect data in the background.

Permissions are `activeTab`, `scripting` and local `storage`, with no broad host permissions. Access follows the person's extension action. The background worker only limits extension storage to trusted extension contexts at installation. There are no remote scripts or network calls. Copied labels/settings stay in browser extension storage without cloud sync. **Delete copied likes** clears them. Filters in other open tabs clear when restored or those pages reload.

Source is in `extension/`. `python scripts/package-extension.py` copies the shared matching engine and builds a deterministic ZIP from an eight-file allowlist. The matching implementation is shared with the website widget.

## For businesses: relevant offers on your own site

1. Sign in with a verified email and open your business in Studio.
2. Under **More tools → Website widget**, save your website origin with the widget off. Only an owner/admin can connect the website and enable/disable it.
3. Add offers you actually provide: title, description, link on that website, type, descriptive words and optional price/currency. Owners/admins/editors can create/edit/remove offers; viewers can read them.
4. Mark the offers to publish, turn on the widget and copy the generated code into your website. If your website has a Content Security Policy, it must allow TasteKey's script and frame origin.

Only explicit published offers and the business name/website become public. Private business briefs, budgets, reviews, plans, outcomes and accounts are excluded. The widget is restricted to the registered website origin and TasteKey's own preview. Offer links must use HTTPS and belong to that website. Disabling prevents new widget/data loads and new sharing connections. Already open frames and previously copied public offers cannot be recalled.

The widget initially shows generic offers. A visitor can choose **Use my likes** to open a TasteKey window, select up to twenty saved likes and explicitly consent. Matching runs inside a TasteKey-owned frame. The merchant receives neither the list nor the full profile. The connection checks the popup source, origin, random state and widget ID. Choices clear after fifteen minutes, when **Stop using my likes** is chosen, or when the frame closes. No visitor identifiers, advertising cookies, impressions or analytics events are stored by this integration.

Visitors can apply an optional same-currency price limit. Offer prices/availability are provided by the business and are not independently checked. Offer clicks open the business website with no taste labels or IDs in the URL; its own privacy policy then applies. Relevant offers can help visitors find something useful, but this is not proof of customer acquisition, demand, conversion lift or revenue growth. Measure actual results through your own authorized website tools.

The public sample widget on `/integrations` contains clearly labeled made-up offers, prices and example.org links. It is a demonstration, not a real shop, feed or customer dataset.

## Security and test boundaries

Private pages retain nonce CSP and frame denial. Only the public widget HTML permits the registered origin and self through `frame-ancestors`; global legacy `X-Frame-Options: DENY` remains. The [HTML standard](https://html.spec.whatwg.org/multipage/speculative-loading.html#the-x-frame-options-header) specifies that enforcing CSP `frame-ancestors` takes precedence. Browsers lacking that support fail closed. Widget scripts/styles are local, arbitrary HTML is never rendered, and `connect-src 'none'` blocks widget data transmission. The consent popup reads local likes in a first-party window so the widget does not depend on third-party cookie access.

Unit tests cover publishing/roles, ownership, private-field exclusion, URL restrictions, disabling, JSON-script escaping, matching and budgets. Browser fixtures cover offer publishing, a real popup consent exchange, offer order, clearing and local page filtering/restoration. An isolated unpacked-extension test covers loading, permissions, local selection and deletion. It confirms page access is denied without an extension activation. The DOM filter positive cases use explicitly synthetic result cards; these are not live adapter compatibility evidence for every external website. The owner's manual installation/action-click flow and an actual merchant deployment remain setup checks, not claims implied by those fixtures.
