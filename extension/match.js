(function () {
  "use strict";
  const stop = new Set([
    "the",
    "and",
    "with",
    "that",
    "this",
    "love",
    "like",
    "for",
    "from",
    "your",
    "you",
    "something",
  ]);
  const normalize = (v) =>
    String(v || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const words = (v) => [
    ...new Set(
      (normalize(v).match(/[\p{L}\p{N}]+/gu) || []).filter(
        (w) => w.length >= 3 && !stop.has(w),
      ),
    ),
  ];
  function rank(items, likes, budget) {
    const selected = (Array.isArray(likes) ? likes : [])
      .slice(0, 20)
      .filter((l) => typeof l.label === "string" && l.label.length <= 200);
    return items
      .slice(0, 300)
      .map((item, index) => {
        const text = normalize(
          [item.title, item.description, ...(item.tags || [])].join(" "),
        ).slice(0, 12000);
        const tokens = new Set(words(text));
        let score = 0;
        for (const like of selected) {
          const terms = words(like.label);
          if (terms.length && terms.every((w) => tokens.has(w))) score += 4;
          else score += terms.filter((w) => tokens.has(w)).length;
          if (like.category && like.category === item.category) score += 0.5;
        }
        const withinBudget =
          !budget ||
          (Number.isFinite(item.price) &&
            item.currency === budget.currency &&
            item.price <= budget.max);
        return { item, score, index, withinBudget };
      })
      .filter((r) => r.withinBudget)
      .sort((a, b) => b.score - a.score || a.index - b.index);
  }
  globalThis.TasteKeyMatch = Object.freeze({ rank, words });
})();
