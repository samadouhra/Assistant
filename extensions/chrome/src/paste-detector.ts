const extensionId = chrome.runtime.id;

// paste detection for assistant
document.addEventListener("paste", () => {
  chrome.runtime.sendMessage(extensionId, "paste-done")
});