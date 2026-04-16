type RuntimeMessage =
  | { type: "PING" }
  | { type: "CONTENT_SCRIPT_READY"; url: string };

const EXTENSION_NAME = "React Chrome Extension Boilerplate";

function ensureActionOpensPopup() {
  if (!chrome.sidePanel?.setPanelBehavior) {
    return;
  }

  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch((error: unknown) => {
      console.warn("Failed to set side panel behavior", error);
    });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log(`[${EXTENSION_NAME}] installed`);
  ensureActionOpensPopup();
});

chrome.runtime.onStartup.addListener(() => {
  ensureActionOpensPopup();
});

chrome.runtime.onMessage.addListener(
  (
    message: RuntimeMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    if (message?.type === "PING") {
      sendResponse({ type: "PONG", timestamp: Date.now() });
    }
  }
);
