(function () {
  "use strict";
  const config = JSON.parse(
    document.getElementById("tastekey-config").textContent,
  );
  const $ = (id) => document.getElementById(id);
  $("business").textContent = config.businessName;
  if (config.demo) {
    const note = document.createElement("p");
    note.textContent =
      "Demo only: these products, prices and links are made-up test examples.";
    document.querySelector("header").append(note);
  }
  $("personal").href = location.origin + "/personal/discover";
  let likes = [],
    budget,
    connectWindow,
    state,
    expires,
    pendingUntil = 0;
  function render() {
    const ranked = globalThis.TasteKeyMatch.rank(config.offers, likes, budget);
    $("offers").replaceChildren();
    $("empty").hidden = ranked.length > 0;
    for (const { item, score } of ranked) {
      const card = document.createElement("article"),
        title = document.createElement("h2"),
        text = document.createElement("p"),
        price = document.createElement("p"),
        link = document.createElement("a");
      title.textContent = item.title;
      text.textContent = item.description;
      price.textContent =
        item.price === null
          ? "Check price on the business website"
          : `${item.price} ${item.currency} · business-provided price`;
      link.textContent = "View offer";
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.referrerPolicy = "no-referrer";
      card.append(title, text, price);
      if (likes.length && score > 0) {
        const note = document.createElement("small");
        note.textContent = "Matches your chosen interests";
        card.append(note);
      }
      card.append(link);
      $("offers").append(card);
    }
    $("clear").hidden = !likes.length;
  }
  function clear() {
    likes = [];
    clearTimeout(expires);
    state = undefined;
    pendingUntil = 0;
    $("status").textContent =
      "Your likes have been cleared. Showing offers without personal matching.";
    render();
  }
  $("connect").addEventListener("click", () => {
    state = crypto.randomUUID();
    pendingUntil = Date.now() + 10 * 60000;
    connectWindow = window.open(
      location.origin +
        "/connect?widget=" +
        encodeURIComponent(config.id) +
        "&state=" +
        state,
      "tastekey-connect",
      "width=600,height=740",
    );
    $("status").textContent = connectWindow
      ? "Choose the likes to use in the TasteKey window."
      : "Your browser blocked the window. Allow pop-ups for this button and try again.";
  });
  window.addEventListener("message", (event) => {
    if (
      event.origin !== location.origin ||
      !connectWindow ||
      event.source !== connectWindow ||
      !state
    )
      return;
    const data = event.data;
    if (
      !data ||
      data.type !== "tastekey:likes" ||
      data.state !== state ||
      data.widget !== config.id ||
      !Array.isArray(data.likes) ||
      data.likes.length > 20
    )
      return;
    if (Date.now() > pendingUntil) {
      connectWindow.postMessage(
        {
          type: "tastekey:likes-ack",
          state,
          widget: config.id,
          status: "expired",
        },
        location.origin,
      );
      state = undefined;
      pendingUntil = 0;
      $("status").textContent =
        "This connection expired. Click “Use my likes” to try again.";
      return;
    }
    if (
      !data.likes.every(
        (x) =>
          x &&
          typeof x.label === "string" &&
          x.label.length <= 200 &&
          typeof x.category === "string" &&
          x.category.length < 30,
      )
    )
      return;
    likes = data.likes.map(({ label, category }) => ({ label, category }));
    const acceptedState = state;
    state = undefined;
    pendingUntil = 0;
    $("status").textContent = likes.length
      ? "Offers are sorted using only the likes you chose. These likes clear in 15 minutes."
      : "No likes selected. Showing offers without personal matching.";
    clearTimeout(expires);
    expires = setTimeout(clear, 15 * 60000);
    render();
    connectWindow.postMessage(
      {
        type: "tastekey:likes-ack",
        state: acceptedState,
        widget: config.id,
        status: "accepted",
      },
      location.origin,
    );
  });
  $("clear").addEventListener("click", clear);
  $("apply-budget").addEventListener("click", () => {
    const value = $("budget").value;
    budget =
      value !== "" &&
      Number.isFinite(Number(value)) &&
      Number(value) >= 0 &&
      Number(value) <= 10000000
        ? { max: Number(value), currency: $("currency").value }
        : undefined;
    render();
  });
  render();
})();
