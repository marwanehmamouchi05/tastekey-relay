(function () {
  "use strict";
  const script = document.currentScript;
  const id = script && script.dataset.tastekey;
  if (!id || !/^[a-f0-9-]{36}$/i.test(id)) return;
  const host = document.querySelector('[data-tastekey-widget="' + id + '"]');
  if (!host) return;
  const frame = document.createElement("iframe");
  frame.src = new URL("/api/widget/" + encodeURIComponent(id), script.src).href;
  frame.title = "TasteKey offers for you";
  frame.loading = "lazy";
  frame.setAttribute(
    "sandbox",
    "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox",
  );
  frame.referrerPolicy = "no-referrer";
  frame.style.width = "100%";
  frame.style.height = "740px";
  frame.style.border = "0";
  frame.style.borderRadius = "20px";
  host.replaceChildren(frame);
})();
