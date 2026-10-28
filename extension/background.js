"use strict";
// Installation-only privacy setup. No tab listeners, networking or background scans.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
});
