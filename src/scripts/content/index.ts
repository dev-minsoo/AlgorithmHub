type RuntimeMessage = { type: "GET_PAGE_TITLE" };

chrome.runtime.onMessage.addListener(
  (
    message: RuntimeMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    if (message?.type === "GET_PAGE_TITLE") {
      sendResponse({ title: document.title });
    }
  }
);

chrome.runtime.sendMessage({
  type: "CONTENT_SCRIPT_READY",
  url: window.location.href,
});
