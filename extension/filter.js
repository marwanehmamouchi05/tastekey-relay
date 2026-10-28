(function () {
  "use strict";
  if (globalThis.TasteKeyPageFilter) return;
  let changed = [],
    note;
  function restore() {
    for (const { element, hidden, display, priority } of changed) {
      element.hidden = hidden;
      if (display) element.style.setProperty("display", display, priority);
      else element.style.removeProperty("display");
    }
    changed = [];
    note?.remove();
    note = undefined;
    return { message: "All results are visible again." };
  }
  function price(text) {
    const m = text.match(
      /(?:USD|US\$|\$)\s*([\d,]+(?:\.\d{1,2})?)|(?:EUR|€)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(USD|EUR|MAD|DH)\b|MAD\s*([\d,]+(?:\.\d{1,2})?)/i,
    );
    if (!m) return { price: null, currency: null };
    const value = Number((m[1] || m[2] || m[3] || m[5]).replaceAll(",", ""));
    return {
      price: Number.isFinite(value) ? value : null,
      currency: m[1]
        ? "USD"
        : m[2]
          ? "EUR"
          : m[5]
            ? "MAD"
            : m[4].toUpperCase() === "DH"
              ? "MAD"
              : m[4].toUpperCase(),
    };
  }
  function apply(likes, budget) {
    restore();
    if (
      document.querySelector(
        'input[type="password"],input[autocomplete^="cc-"],input[name*="cardnumber" i]',
      )
    )
      return {
        message:
          "This looks like a sign-in or payment page. Filters are off here.",
      };
    const selectors = [
      "[data-tastekey-result]",
      '[data-component-type="s-search-result"]',
      '[data-testid="property-card"]',
      ".s-item",
      "[data-listing-id]",
      "#search .MjjYud:has(h3)",
      "main article",
      'main [role="listitem"]',
    ];
    let cards = [];
    for (const selector of selectors) {
      const found = [...document.querySelectorAll(selector)].filter(
        (e) => e.querySelector("a[href]") && e.innerText.trim().length > 3,
      );
      if (found.length) {
        cards = found
          .filter(
            (e) => !found.some((other) => other !== e && other.contains(e)),
          )
          .slice(0, 300);
        break;
      }
    }
    if (!cards.length)
      return {
        message:
          "No supported search cards found. Try a search-results page on Amazon, Etsy, eBay, Booking or Google.",
      };
    const items = cards.map((element, id) => ({
      id,
      title: element.innerText.slice(0, 10000),
      ...price(element.innerText),
      tags: [],
    }));
    const ranked = globalThis.TasteKeyMatch.rank(items, likes, budget);
    const matches = ranked.filter((r) => !likes.length || r.score > 0),
      keep = new Set(matches.map((r) => r.item.id));
    if (!keep.size && !budget)
      return {
        message:
          "No matching words found. All results are still visible. Try different likes or filter words.",
      };
    for (let i = 0; i < cards.length; i++)
      if (!keep.has(i)) {
        const element = cards[i];
        changed.push({
          element,
          hidden: element.hidden,
          display: element.style.getPropertyValue("display"),
          priority: element.style.getPropertyPriority("display"),
        });
        element.hidden = true;
        element.style.setProperty("display", "none", "important");
      }
    note = document.createElement("div");
    note.id = "tastekey-filter-note";
    note.setAttribute("role", "status");
    Object.assign(note.style, {
      position: "fixed",
      bottom: "16px",
      right: "16px",
      zIndex: "2147483647",
      background: "#fff",
      color: "#30253f",
      border: "2px solid #8f6ac9",
      borderRadius: "14px",
      padding: "14px",
      font: "14px/1.5 system-ui,sans-serif",
      maxWidth: "340px",
      boxShadow: "0 5px 24px #30253f22",
    });
    const text = document.createElement("span"),
      button = document.createElement("button");
    text.textContent = `TasteKey: ${keep.size} of ${cards.length} cards match your chosen words${budget ? " and budget" : ""}. `;
    button.textContent = "Show all";
    button.addEventListener("click", restore);
    note.append(text, button);
    document.body.append(note);
    return {
      message: `${keep.size} of ${cards.length} result cards match. Only visible page text was checked; prices and relevance are not verified.`,
      matches: keep.size,
      total: cards.length,
    };
  }
  globalThis.TasteKeyPageFilter = Object.freeze({ apply, restore });
})();
