// paste detection for assistant
document.addEventListener("paste", () => {
  chrome.runtime.sendMessage("paste-done")
});