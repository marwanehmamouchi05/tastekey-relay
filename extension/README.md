# TasteKey search filters — developer build

Unzip the download. Open Chrome/Edge's Extensions page, enable Developer mode, choose **Load unpacked**, and select this folder. This is not a Chrome Web Store listing.

Open TasteKey, then click the extension and **Copy my likes from TasteKey**. Choose the likes to use (none are selected by default). Open a supported search-results page, click the extension and **Show matches on this page**. Extra comma-separated words and an optional same-currency budget can narrow results. **Show all** restores the page. Reloading also clears page filters.

Permissions are `activeTab`, `scripting` and local `storage`; there are no broad host permissions, remote scripts or analytics. The background worker only sets private local-storage access when installed; it has no tab listeners, networking or scans. Page access follows an explicit extension click. Import reads only stated/confirmed label/category pairs from the trusted TasteKey origin, not budgets, history or the entire profile. Chosen labels/settings remain in this browser's extension storage, without cloud sync. Delete copied likes to clear them. Other open tabs' active filters clear when restored/reloaded.

Supported adapters recognize Amazon, Etsy, eBay, Booking, Google Search, explicit `data-tastekey-result` cards and main article/list-item cards. Website DOM changes can break an adapter. Matching checks visible words; it does not alter the search engine's ranking, infer private traits, validate prices or guarantee relevance. The parser supports common USD/EUR/MAD displays, not foreign-exchange conversion or every local price format. Unknown/incompatible prices are excluded only when a budget is set. No-word-match filtering leaves all results visible. Sign-in/payment forms are excluded. The extension does not submit searches, buy products or send data to TasteKey/business servers.

The application also offers a separate website widget. Its consent popup keeps selected likes inside a TasteKey-owned frame and clears them after fifteen minutes or frame close. Businesses publish their own offers; this is not an advertising network or automatic customer acquisition.
