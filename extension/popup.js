"use strict";
const $ = (id) => document.getElementById(id);
let copied = [],
  selected = [];
async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https?:/.test(tab.url || ""))
    throw new Error(
      "Open a normal website first. Browser settings and protected pages cannot be filtered.",
    );
  return tab;
}
function status(text) {
  $("status").textContent = text;
}
function render() {
  $("likes").replaceChildren();
  $("empty").hidden = copied.length > 0;
  copied.forEach((like, i) => {
    const label = document.createElement("label"),
      input = document.createElement("input"),
      text = document.createElement("span");
    input.type = "checkbox";
    input.checked = selected.includes(i);
    text.textContent = like.label;
    input.addEventListener("change", async () => {
      selected = input.checked
        ? [...selected, i].slice(0, 20)
        : selected.filter((n) => n !== i);
      input.checked = selected.includes(i);
      await chrome.storage.local.set({ selected });
    });
    label.append(input, text);
    $("likes").append(label);
  });
}
chrome.storage.local.setAccessLevel?.({ accessLevel: "TRUSTED_CONTEXTS" });
chrome.storage.local
  .get(["likes", "selected", "words", "budget", "currency"])
  .then((saved) => {
    copied = Array.isArray(saved.likes) ? saved.likes.slice(0, 60) : [];
    selected = Array.isArray(saved.selected)
      ? saved.selected
          .filter((i) => Number.isInteger(i) && i >= 0 && i < copied.length)
          .slice(0, 20)
      : [];
    $("words").value = saved.words || "";
    $("budget").value = saved.budget ?? "";
    $("currency").value = ["USD", "MAD", "EUR"].includes(saved.currency)
      ? saved.currency
      : "USD";
    render();
  })
  .catch(() => status("Extension storage is unavailable."));
$("import").addEventListener("click", async () => {
  try {
    const tab = await currentTab(),
      origin = new URL(tab.url).origin;
    if (
      ![
        "https://tastekey.52.47.205.18.sslip.io",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ].includes(origin)
    )
      throw new Error(
        "Open TasteKey in this tab, then click “Copy my likes from TasteKey.”",
      );
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const p = JSON.parse(
          localStorage.getItem("tastekey.profile.v1") || "null",
        );
        if (!p || p.version !== 1 || !Array.isArray(p.nodes)) return [];
        return p.nodes
          .filter(
            (n) =>
              ["stated", "confirmed"].includes(n.status) &&
              typeof n.label === "string" &&
              typeof n.category === "string",
          )
          .slice(0, 60)
          .map(({ label, category }) => ({
            label: label.slice(0, 200),
            category: category.slice(0, 30),
          }));
      },
    });
    copied = result || [];
    selected = [];
    await chrome.storage.local.set({ likes: copied, selected });
    render();
    status(
      copied.length
        ? "Likes copied. Choose which ones to use. Nothing is selected yet."
        : "No saved likes found. Add a few in TasteKey first.",
    );
  } catch (e) {
    status(e.message);
  }
});
$("apply").addEventListener("click", async () => {
  try {
    const tab = await currentTab();
    const extras = $("words")
      .value.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10)
      .map((label) => ({ label: label.slice(0, 200), category: "" }));
    const likes = [
      ...selected.map((i) => copied[i]).filter(Boolean),
      ...extras,
    ].slice(0, 20);
    const raw = $("budget").value,
      max = Number(raw);
    if (raw !== "" && (!Number.isFinite(max) || max < 0 || max > 10000000))
      throw new Error("Enter a valid maximum price.");
    if (!likes.length && raw === "")
      throw new Error(
        "Choose a like, add a filter word or set a budget first.",
      );
    const budget = raw === "" ? null : { max, currency: $("currency").value };
    await chrome.storage.local.set({
      selected,
      words: $("words").value,
      budget: raw,
      currency: $("currency").value,
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["match.js", "filter.js"],
    });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (l, b) => globalThis.TasteKeyPageFilter.apply(l, b),
      args: [likes, budget],
    });
    status(result.message);
  } catch (e) {
    status(e.message || "This page does not allow filtering.");
  }
});
$("restore").addEventListener("click", async () => {
  try {
    const tab = await currentTab();
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => globalThis.TasteKeyPageFilter?.restore(),
    });
    status(result?.message || "No TasteKey filters are active on this page.");
  } catch (e) {
    status(e.message);
  }
});
$("forget").addEventListener("click", async () => {
  await chrome.storage.local.clear();
  copied = [];
  selected = [];
  $("words").value = "";
  $("budget").value = "";
  render();
  try {
    const tab = await currentTab();
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => globalThis.TasteKeyPageFilter?.restore(),
    });
  } catch {
    /* Stored likes are still removed when a protected tab cannot be restored. */
  }
  status(
    "Copied likes and settings deleted. Filters in other open tabs can be cleared with “Show all results again” or by reloading those pages.",
  );
});
