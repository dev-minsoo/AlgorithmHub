import { getAdapterForUrl } from "../../adapters";
import type { PlatformAdapter } from "../../adapters/types";
import { handleGitHubOAuthCallback } from "./githubAuth";

void handleGitHubOAuthCallback();

const bootedAdapters = new Map<string, PlatformAdapter>();
let lastUrl = window.location.href;

function bootAdapterForCurrentUrl() {
  const url = new URL(window.location.href);
  const adapter = getAdapterForUrl(url);

  if (!adapter) {
    return;
  }

  if (!bootedAdapters.has(adapter.platform)) {
    bootedAdapters.set(adapter.platform, adapter);
    void adapter.boot({ platform: adapter.platform });
  }
}

function notifyBootedAdapters(url: URL) {
  bootedAdapters.forEach((adapter) => {
    adapter.onUrlChange?.(url);
  });
}

function notifyUrlChange() {
  const currentUrl = window.location.href;
  if (currentUrl === lastUrl) {
    return;
  }

  lastUrl = currentUrl;
  bootAdapterForCurrentUrl();
  notifyBootedAdapters(new URL(currentUrl));
}

function patchHistoryMethod(method: "pushState" | "replaceState") {
  const originalMethod = window.history[method];
  window.history[method] = function patchedHistoryMethod(...args) {
    const result = originalMethod.apply(this, args);
    window.setTimeout(notifyUrlChange, 0);
    return result;
  };
}

bootAdapterForCurrentUrl();
notifyBootedAdapters(new URL(window.location.href));
patchHistoryMethod("pushState");
patchHistoryMethod("replaceState");
window.addEventListener("popstate", notifyUrlChange);
window.addEventListener("hashchange", notifyUrlChange);

new MutationObserver(notifyUrlChange).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
