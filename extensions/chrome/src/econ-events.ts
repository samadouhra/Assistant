(() => {
  // const extensionId = chrome.runtime.id;
  
  // detect selection of paragraph on book
  document.addEventListener("mouseup", () => {
    const selection = window.getSelection();
    if(!selection) return;

    const selectionText = selection.toString();
    console.log(selectionText, "selectionText")
  });
})()