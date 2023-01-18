import { db } from "./lib/firebase";
import { doc, writeBatch, collection } from "firebase/firestore";

const MAIN_MENUITEM_ID: string = "1cademy-assitant-ctx-mt";
const PARAPHRASE_MENUITEM_ID: string = `${MAIN_MENUITEM_ID}-paraphrase`;
const IMPROVE_MENUITEM_ID: string = `${MAIN_MENUITEM_ID}-improve`;
const L_REVIEW_MENUITEM_ID: string = `${MAIN_MENUITEM_ID}-l-review`;

const tryParaphrasingUsingChatGPT = async (paragraph: string, type: "Improve" | "Paraphrase" | "Literature") => {

  const menuItemType = type === "Improve" ? "Improve-CGPT" : (type === "Literature" ? "Literature-CGPT" : "Paraphrase-CGPT");
  const [currentTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  const fromUrl = currentTab?.url || "";

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

  // focusing window that opened chatgpt
  const cgTab = await chrome.tabs.get(tabId);
  await chrome.windows.update(cgTab.windowId, {
    focused: true
  });

  // adding this to stop memory leak
  const startedAt = new Date().getTime();

  const waitUntilChatGPTLogin = () => {
    return new Promise((resolve, reject) => {
      const checker = () => {
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

            // checking memory leak
            const currentTime = new Date().getTime();
            const timeDiff = (startedAt - currentTime) / 1000;
            if(timeDiff >= 180) {
              reject("Stopped due to memory leak");
              return; // don't run recursion
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
  const chatGPTResponse = await chrome.scripting.executeScript<any, any>({
    target: {
      tabId
    },
    args: [
      paragraph,
      type
    ],
    func: (paragraph, type) => {
      // add toast alert on chat gpt
      const TOASTER_WRAP_ID = "one-toaster-wrap";

      function createToaster(toastType: "Error" | "Success", message: string) {
        // creating toaster wrap if it doesn't exists
        if(!document.querySelector(`#${TOASTER_WRAP_ID}`)) {
          const wrapDiv = document.createElement("div");
          wrapDiv.setAttribute("id", TOASTER_WRAP_ID);
          document.body.appendChild(wrapDiv);

          // appending styling to website
          const styleEl = document.createElement("style");
          styleEl.innerHTML = `
          @keyframes fadeInOut {
            0% {opacity: 0;}
            10% {opacity: 1;}
            90% {opacity: 1;}
            100% {opacity: 0;}
          }

          #${TOASTER_WRAP_ID} {
            position: fixed;
            top: 10px;
            right: 10px;
          }

          #${TOASTER_WRAP_ID} .toasterItem {
            color: #fff;
            padding: 5px 10px;
            border-radius: 2px;
            opacity: 0;
            animation: fadeInOut 3s;
          }

          #${TOASTER_WRAP_ID} .toasterItem.toast-success {
            background-color: #16a34a;
          }

          #${TOASTER_WRAP_ID} .toasterItem.toast-error {
            background-color: #be123c;
          }
          `;
          document.body.appendChild(styleEl);
        }

        const toasterEl = document.getElementById(TOASTER_WRAP_ID);

        // create toast message
        const toasterDiv = document.createElement("div")
        toasterDiv.setAttribute("class", `toasterItem ${toastType === "Error" ? "toast-error" : "toast-success"}`);
        toasterDiv.innerHTML = `<p>${message}</p>`;
        toasterEl!.append(toasterDiv);

        setTimeout(() => {
          toasterEl!.removeChild(toasterDiv);
        }, 3100)
      }
      
      // input paraphrase text in gpt
      const gptTextInput = document.querySelector("textarea");
      if(!gptTextInput) return;
      gptTextInput.value = (
        type === "Improve" ? "improve " : (type === "Paraphrase" ? "paraphrase " : "Literature review ")
      ) + JSON.stringify(paragraph);
      const gptInputParent = gptTextInput.parentElement;
      if(!gptInputParent) return;
      const gptActionBtn = gptInputParent.querySelector("button");
      if(!gptActionBtn) return;
      gptActionBtn.click();

      // adding this to stop memory leak
      const startedAt = new Date().getTime();

      const waitUntilProcessed = (killOnGeneration: boolean) => {
        return new Promise((resolve, reject) => {
          const checker = () => {
            const buttons = document.querySelectorAll("form button");
            if(buttons.length) {
              // removing html from button content to extract text
              const el = document.createElement("div");
              el.innerHTML = buttons[0].innerHTML;

              const buttonTitle = el.innerText.trim();
              const cond = killOnGeneration ? buttonTitle === "Stop generating" : buttonTitle !== "Stop generating";
              if(cond) {
                // killing recurrsion
                resolve(true);
                return;
              }

              // checking memory leak
              const currentTime = new Date().getTime();
              const timeDiff = (startedAt - currentTime) / 1000;
              if(timeDiff >= 300) {
                reject("Stopped due to memory leak");
                return; // don't run recursion
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
        // wait until chat gpt is processing/animating response
        return waitUntilProcessed(false).then(() => {
          const gptParagraphs = document.querySelectorAll("p");
          if(gptParagraphs.length > 1) {
            const lastChatItem = gptParagraphs[gptParagraphs.length - 2];
            if(lastChatItem) {
              // i did this because, it was sometimes giving more than one paragraphs in answer
              const el = lastChatItem.parentElement || lastChatItem;
              if(el) {
                const paraphrased = el.innerText.trim();
                try {
                  navigator.clipboard.writeText(paraphrased);
                  createToaster("Success", "Text is copied to clipboard.")
                } catch(e) {
                  createToaster("Error", "Please allow clipboard to ChatGPT.")
                }
                // return result from chat gpt
                return paraphrased;
              }
            }
          }
          // return empty string if there was not result
          return "";
        })
      })
    }
  })

  let cGPTResponse = "";
  if(chatGPTResponse.length) {
    cGPTResponse = chatGPTResponse[0].result
  }
  
  // saving actions in assistant actions collection
  const colRef = collection(db, "assistantActions")
  const actionRef = doc(colRef);
  const batch = writeBatch(db);
  batch.set(actionRef, {
    url: fromUrl,
    menuItem: menuItemType,
    text: paragraph,
    response: cGPTResponse,
    pasted: false,
    createdAt: new Date()
  })
  try {
    await batch.commit();
    // saving this to rewrite log for paste option
    await chrome.storage.local.set({
      lastActionId: actionRef.id,
      lastActionTime: new Date().getTime()
    })
  } catch(e) {}

}

const onParaphraseRequest = (onClickData: chrome.contextMenus.OnClickData) => {
  const mItemId = String(onClickData.menuItemId);
  if(![PARAPHRASE_MENUITEM_ID, IMPROVE_MENUITEM_ID, L_REVIEW_MENUITEM_ID].includes(mItemId)) return;
  
  tryParaphrasingUsingChatGPT(
    String(onClickData.selectionText),
    mItemId === IMPROVE_MENUITEM_ID ? "Improve" : (L_REVIEW_MENUITEM_ID === mItemId ? "Literature" : "Paraphrase")
  );
}

const onPasteDetection = (message: any) => {
  return (async() => {
    if(message === "paste-done") {
      const storagedActions = await chrome.storage.local.get(["lastActionId", "lastActionTime"])
      if(storagedActions?.lastActionId) {
        const lastAction = parseInt(storagedActions?.lastActionTime);
        const currentTime = new Date().getTime();
        const timeDiff = (lastAction - currentTime) / 1000;
        // should be less than or equal to 20 mints
        if(timeDiff > 1200) return;
        
        // saving paste status to last action document
        const colRef = collection(db, "assistantActions")
        const actionRef = doc(colRef, storagedActions?.lastActionId);
        const batch = writeBatch(db);
        batch.update(actionRef, {
          pasted: true,
          updatedAt: new Date()
        })
        try {
          await batch.commit();
          // reseting local storage
          await chrome.storage.local.remove(["lastActionId", "lastActionTime"])
        } catch(e) {}
      }
    }
  })()
}

chrome.contextMenus.create({
  id: MAIN_MENUITEM_ID,
  title: "1Cademy Assistant",
  contexts: ["selection"]
})

chrome.contextMenus.create({
  id: PARAPHRASE_MENUITEM_ID,
  title: "Paraphrase by ChatGPT",
  parentId: MAIN_MENUITEM_ID,
  contexts: ["selection"]
});

chrome.contextMenus.create({
  id: IMPROVE_MENUITEM_ID,
  title: "Improve by ChatGPT",
  parentId: MAIN_MENUITEM_ID,
  contexts: ["selection"]
});

chrome.contextMenus.create({
  id: L_REVIEW_MENUITEM_ID,
  title: "Literature review by ChatGPT",
  parentId: MAIN_MENUITEM_ID,
  contexts: ["selection"]
});

chrome.contextMenus.onClicked.addListener(onParaphraseRequest)

chrome.runtime.onMessage.addListener(onPasteDetection)