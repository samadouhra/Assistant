const PARAPHRASE_MENUITEM_ID = "1cademy-assitant-ctx-mt-paraphrase";

const tryParaphrasingUsingChatGPT = async (paragraph: string) => {
  let tabId: number = 0;
  // try to find chat gpt tab
  const tabs = await chrome.tabs.query({
    url: "https://chat.openai.com/chat*"
  })
  
  // create a new tab for chat gpt if it doesn't exists
  if(tabs.length === 0) {
    const openedTab = await chrome.tabs.create({
      url: "https://chat.openai.com/chat"
    })
    tabId = openedTab.id || 0;
  } else {
    tabId = tabs[0].id || 0;
    // try to focus tab using above tab id
    await chrome.tabs.update(tabId, {
      active: true
    })
  }

  const waitUntilChatGPTLogin = () => {
    return new Promise((resolve) => {
      const checker = () => {
        console.log("checker");
        chrome.scripting.executeScript<any, boolean>({
          target: {
            tabId
          },
          args: [],
          func: () => {
            return !!Array.from(document.querySelectorAll("a")).filter((anc) => anc.innerText.trim().toLowerCase() === "new chat").length;
          }
        }).then((result) => {
          if(result.length) {
            if(result[0].result) {
              resolve(true);
              return;
            }
          }
          setTimeout(checker, 1000)
        })
      }
      checker();
    })
  };

  await waitUntilChatGPTLogin();

  // run logic to trigger paraphrase on ChatGPT UI if login
  await chrome.scripting.executeScript<any, any>({
    target: {
      tabId
    },
    args: [
      paragraph
    ],
    func: (paragraph) => {
      // wait for 
      // input paraphrase text in gpt
      const gptTextInput = document.querySelector("textarea");
      if(!gptTextInput) return;
      gptTextInput.value = "paraphrase " + JSON.stringify(paragraph);
      const gptInputParent = gptTextInput.parentElement;
      if(!gptInputParent) return;
      const gptActionBtn = gptInputParent.querySelector("button");
      if(!gptActionBtn) return;
      gptActionBtn.click();

      const waitUntilProcessed = (killOnGeneration: boolean) => {
        return new Promise((resolve) => {
          const checker = () => {
            const buttons = document.querySelectorAll("form button");
            if(buttons.length) {
              // removing html from button content to extract text
              const el = document.createElement("div");
              el.innerHTML = buttons[0].innerHTML;

              const buttonTitle = el.innerText.trim();
              console.log("--- buttonTitle", buttonTitle);
              const cond = killOnGeneration ? buttonTitle === "Stop generating" : buttonTitle !== "Stop generating";
              if(cond) {
                // killing recurrsion
                resolve(true);
                return;
              }
            }
            
            // if still generating run after a time
            setTimeout(() => {
              checker();
            }, 200)
          }

          checker();
        });
      }

      // wait until api started generation
      return waitUntilProcessed(true).then(() => {
        console.log("stop generating appeared on screen");
        // wait until chat gpt is processing/animating response
        return waitUntilProcessed(false).then(() => {
          console.log("stop generating disappeared from screen");
          const gptParagraphs = document.querySelectorAll("p");
          if(gptParagraphs.length > 1) {
            const lastChatItem = gptParagraphs[gptParagraphs.length - 2];
            if(lastChatItem) {
              const paraphrased = lastChatItem.innerText.trim();
              console.log("paraphrased", paraphrased);
              navigator.clipboard.writeText(paraphrased)

              /* // copying to clipboard
              const copyTextarea = document.createElement("textarea");
              copyTextarea.textContent = paraphrased;
              // appending element to body to simulate copy
              document.body.appendChild(copyTextarea);
              // selecting text in background
              copyTextarea.select();
              // hotfix for some of mobile devices
              copyTextarea.setSelectionRange(0, 9999);
              document.execCommand("copy");
              document.body.removeChild(copyTextarea); */
            }
          }
        })
      })
    }
  })
}

const onParaphraseRequest = (onClickData: chrome.contextMenus.OnClickData) => {
  if(onClickData.menuItemId !== PARAPHRASE_MENUITEM_ID) return;
  tryParaphrasingUsingChatGPT(String(onClickData.selectionText));
}

const mainContextItem = chrome.contextMenus.create({
  id: "1cademy-assitant-ctx-mt",
  title: "1Cademy Assistant",
  contexts: ["selection"]
})

const paraphraseItem = chrome.contextMenus.create({
  id: PARAPHRASE_MENUITEM_ID,
  title: "Paraphrase selected text",
  parentId: mainContextItem,
  contexts: ["selection"]
});

chrome.contextMenus.onClicked.addListener(onParaphraseRequest)