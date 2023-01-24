import { db } from "./lib/firebase";
import { doc, writeBatch, collection } from "firebase/firestore";
import { doesReloadRequired } from "./helpers/chatgpt";
declare const createToaster: (toasterType: string, message: string) => void;

const MAIN_MENUITEM_ID: string = "1cademy-assitant-ctx-mt";
const ANALYZE_MENUITEM_ID: string = `${MAIN_MENUITEM_ID}-analyze`;
const ALTERNATIVE_MENUITEM_ID: string = `${MAIN_MENUITEM_ID}-alternative`;
const CLARIFY_MENUITEM_ID: string = `${MAIN_MENUITEM_ID}-clarify`;
const FACT_CHECK_MENUITEM_ID: string = `${MAIN_MENUITEM_ID}-fact-check`;
const MCQ_MENUITEM_ID: string = `${MAIN_MENUITEM_ID}-mcq`;
const IMPROVE_MENUITEM_ID: string = `${MAIN_MENUITEM_ID}-improve`;
const L_REVIEW_MENUITEM_ID: string = `${MAIN_MENUITEM_ID}-l-review`;
const PARAPHRASE_MENUITEM_ID: string = `${MAIN_MENUITEM_ID}-paraphrase`;
const SHORTEN_MENUITEM_ID: string = `${MAIN_MENUITEM_ID}-shorten`;
const SIMPLIFY_MENUITEM_ID: string = `${MAIN_MENUITEM_ID}-simplify`;
const SOCIALLY_MENUITEM_ID: string = `${MAIN_MENUITEM_ID}-socially`;
const TEACH_MENUITEM_ID: string = `${MAIN_MENUITEM_ID}-teach`;

type ICommandType = "Analyze-CGPT" | "Alternative-viewpoints-CGPT"
  | "Clarify-CGPT" | "Fact-check-CGPT" | "MCQ-CGPT"
  | "Improve-CGPT" | "Literature-CGPT"
  | "Paraphrase-CGPT" | "Shorten-CGPT" | "Simplify-CGPT"
  | "Socially-Judge-CGPT" | "Teach-CGPT";

const menuItems: {
  [menuItemId: string]: [ICommandType, string]
} = {
  [ANALYZE_MENUITEM_ID]: ["Analyze-CGPT", "Analyze by ChatGPT"],
  [ALTERNATIVE_MENUITEM_ID]: ["Alternative-viewpoints-CGPT", "Alternative viewpoints by ChatGPT"],
  [CLARIFY_MENUITEM_ID]: ["Clarify-CGPT", "Clarify by ChatGPT"],
  [FACT_CHECK_MENUITEM_ID]: ["Fact-check-CGPT", "Fact check by ChatGPT"],
  [MCQ_MENUITEM_ID]: ["MCQ-CGPT", "Generate MCQ by ChatGPT"],
  [IMPROVE_MENUITEM_ID]: ["Improve-CGPT", "Improve by ChatGPT"],
  [L_REVIEW_MENUITEM_ID]: ["Literature-CGPT", "Review literature by ChatGPT"],
  [PARAPHRASE_MENUITEM_ID]: ["Paraphrase-CGPT", "Paraphrase by ChatGPT"],
  [SHORTEN_MENUITEM_ID]: ["Shorten-CGPT", "Shorten by ChatGPT"],
  [SIMPLIFY_MENUITEM_ID]: ["Simplify-CGPT", "Simplify by ChatGPT"],
  [SOCIALLY_MENUITEM_ID]: ["Socially-Judge-CGPT", "Socially Judge by ChatGPT"],
  [TEACH_MENUITEM_ID]: ["Teach-CGPT", "Teach stepwise by ChatGPT"]
};

const tryExecutionUsingChatGPT = async (paragraph: string, commandType: ICommandType) => {
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

  const reloadRequired = await doesReloadRequired(tabId);
  if(reloadRequired) {
    const chatgpt = await chrome.tabs.get(tabId);
    await chrome.tabs.update(tabId, {url: chatgpt.url}); // reloading tab
  }

  // waiting until chatgpt tab is loaded
  let isLoadingComplete = false;
  while(!isLoadingComplete) {
    const chatgpt = await chrome.tabs.get(tabId);
    if(chatgpt.status === "complete") {
      isLoadingComplete = true;
    }
  }

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
      commandType,
      startedAt
    ],
    func: (paragraph, commandType: ICommandType, startedIndex) => {
      // input paraphrase text in gpt
      const gptTextInput = document.querySelector("textarea");
      if(!gptTextInput) return;
      let commandText: string = "";
      switch(commandType) {
        case "Analyze-CGPT":
          commandText += "Write a report on the following double-quoted text. The report should include document statistics, vocabulary statistics, readability score, tone type (available options are Formal, Informal, Optimistic, Worried, Friendly, Curious, Assertive, Encouraging, Surprised, or Cooperative), intent type (available options are Inform, Describe, Convince, or Tell A Story), audience type (available options are General, Knowledgeable, or Expert), style type (available options are Formal or Informal), emotion type (available options are Mild or Strong), and domain type (available options are General, Academic, Business, Technical, Creative, or Casual). ";
          break;
        case "Alternative-viewpoints-CGPT":
          commandText += "Alternative viewpoints to the following double-quoted text ";
          break;
        case "Clarify-CGPT":
          commandText += "Clarify the following double-quoted text ";
          break;
        case "Fact-check-CGPT":
          commandText += "Fact check the following double-quoted text ";
          break;
        case "MCQ-CGPT":
          commandText += "Generate a multiple-choice question about the following double-quoted text, with one or more correct choices. Then, for each choice, separately write the word \"CORRECT\" or \"WRONG\" and explain why it is correct or wrong. ";
          break;
        case "Improve-CGPT":
          commandText += "Improve the following double-quoted text and explain what grammar, spelling, mistakes you have corrected, including an explanation of the rule in question? ";
          break;
        case "Literature-CGPT":
          commandText += "Comprehensively review the literature with citations on the following double-quoted text. Then generate the list of references you cited. ";
          break;
        case "Paraphrase-CGPT":
          commandText += "Paraphrase the following double-quoted text ";
          break;
        case "Shorten-CGPT":
          commandText += "Shorten the following double-quoted text? Then, list the key points that you included and the peripheral points that you omitted in a bulleted list ";
          break;
        case "Simplify-CGPT":
          commandText += "Explain the following double-quoted text for elementary school student ";
          break;
        case "Socially-Judge-CGPT":
          commandText += "Is it socially appropriate to say the following double-quoted text? ";
          break;
        case "Teach-CGPT":
          commandText += "Teach me step-by-step the following double-quoted text ";
          break;
      }
      commandText += JSON.stringify(paragraph);
      gptTextInput.value = commandText;
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

      // process output of command
      const processOutput = (output: string) => {
        // don't copy to clipboard
        if(["Analyze-CGPT", "Socially-Judge-CGPT", "Teach-CGPT"].includes(commandType)) return;
        if(commandType === "Improve-CGPT" || commandType === "Shorten-CGPT") {
          let quote1 = output.indexOf("\"");
          if(quote1 === -1) return output;
          else quote1 += 1;
          while(output[quote1-1] === "\\") {
            quote1 = output.indexOf("\"", quote1);
            if(quote1 === -1) return output;
            else quote1 += 1;
          }

          let quote2 = output.indexOf("\"", quote1);
          if(quote2 === -1) return output;
          while(output[quote2-1] === "\\") {
            quote2 = output.indexOf("\"", quote2);
            if(quote2 === -1) return output;
          }

          if(quote1 > 100) return output; // if quote is after alot of letters
          return output.substring(quote1, quote2);
        } else if(commandType === "MCQ-CGPT") {
          let questionStart = output.toLowerCase().indexOf("question:")
          if(questionStart === -1) questionStart = 0;
          else questionStart += "question:".length;
          let questionEnd = output.indexOf("?")
          if(questionEnd === -1) return output;
          return output.substring(questionStart, questionEnd + 1).trim()
        }
        return output;
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
                  const output = processOutput(paraphrased);
                  if(output) {
                    navigator.clipboard.writeText(output);
                    createToaster("Success", "Text is copied to clipboard.");
                  }
                  
                  // adding event listener to like and dislike button
                  const likeSvgs = document.querySelectorAll("[d=\"M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3\"]");
                  const disLikeSvgs = document.querySelectorAll("[d=\"M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17\"]");
                  if(likeSvgs.length && disLikeSvgs.length) {
                    const lastLikeButton = likeSvgs[likeSvgs.length - 1].closest("button");
                    const lastDislikeButton = disLikeSvgs[disLikeSvgs.length - 1].closest("button");
                    if(lastLikeButton && lastDislikeButton) {
                      lastLikeButton.addEventListener("click", () => {
                        chrome.runtime.sendMessage("oa-gpt-like-clicked-" + startedIndex)
                      })

                      lastDislikeButton.addEventListener("click", () => {
                        chrome.runtime.sendMessage("oa-gpt-dislike-clicked-" + startedIndex)
                      })
                    }
                  }
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
  
  const clientStorage = await chrome.storage.local.get(["clientInfo", "onecademyUname"]);
  let clientInfo = clientStorage?.clientInfo;
  // fetching client info
  if(!clientInfo) {
    clientInfo = (await (await fetch("https://www.cloudflare.com/cdn-cgi/trace")).text()).split("\n").filter((p) => p).reduce((c: any, d) => {
      const _ps = d.split("=")
      const paramName = _ps.shift() as string;
      const paramValue = _ps.join("=");
      return {...c, [paramName]: paramValue};
    },{});

    await chrome.storage.local.set({
      clientInfo
    })
  }
  // saving actions in assistant actions collection
  const colRef = collection(db, "assistantActions")
  const actionRef = doc(colRef);
  const batch = writeBatch(db);
  batch.set(actionRef, {
    url: fromUrl,
    menuItem: commandType,
    text: paragraph,
    response: cGPTResponse,
    clientInfo: {
      country: clientInfo?.loc || "",
      ip: clientInfo?.ip || "",
      uag: clientInfo?.uag || ""
    },
    uname: clientStorage?.onecademyUname || "",
    pasted: false,
    createdAt: new Date()
  })
  try {
    await batch.commit();
    // saving this to rewrite log for paste option
    await chrome.storage.local.set({
      lastActionId: actionRef.id,
      lastActionTime: new Date().getTime(),
      startedIndex: String(startedAt)
    })
  } catch(e) {}

}

const onParaphraseRequest = (onClickData: chrome.contextMenus.OnClickData) => {
  const mItemId = String(onClickData.menuItemId);
  const menuItemIds = Object.keys(menuItems);
  if(!menuItemIds.includes(mItemId)) return;
  
  tryExecutionUsingChatGPT(
    String(onClickData.selectionText),
    menuItems[mItemId][0]
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
          pastedAt: new Date()
        })
        try {
          await batch.commit();
          // reseting local storage
          // await chrome.storage.local.remove(["lastActionId", "lastActionTime"])
        } catch(e) {}
      }
    }
  })()
}

const onUnameDetection = (message: any, sender: chrome.runtime.MessageSender) => {
  if(typeof message !== "string") return;

  const url = sender.url || "";
  if(!url.match(/(1cademy|knowledge\-dev|localhost)/)) return;

  if(!message.startsWith("onecademy-user-")) return;

  const uname = message.replace(/^onecademy-user-/, "");

  return (async () => {
    await chrome.storage.local.set({
      onecademyUname: uname
    })
  })();
}

const onVoteDetection = (message: any, sender: chrome.runtime.MessageSender) => {
  if(typeof message !== "string") return;

  const url = sender.url || "";
  if(!url.match(/chat\.openai\.com/)) return;

  if(!message.startsWith("oa-gpt-")) return;

  let startedIndex = "";
  let vote = 0;

  // on like clicked
  if(message.match(/^oa-gpt-like-clicked-/)) {
    startedIndex = message.replace(/^oa-gpt-like-clicked-/, "");
    vote = 1;
  } else if(message.match(/^oa-gpt-dislike-clicked-/)) {
    // on dislike clicked
    startedIndex = message.replace(/^oa-gpt-dislike-clicked-/, "");
  }

  (async () => {
    const storagedActions = await chrome.storage.local.get(["lastActionId", "startedIndex"])
    if(startedIndex === storagedActions?.startedIndex && storagedActions?.lastActionId) {
      const colRef = collection(db, "assistantActions")
      const actionRef = doc(colRef, storagedActions.lastActionId);
      const batch = writeBatch(db);
      batch.update(actionRef, {
        vote,
        votedAt: new Date()
      })
      try {
        await batch.commit();
        // reseting local storage
        await chrome.storage.local.remove(["startedIndex"])
      } catch(e) {}
    }
  })()
}

chrome.contextMenus.create({
  id: MAIN_MENUITEM_ID,
  title: "1Cademy Assistant",
  contexts: ["selection"]
})

for(const menuItemId in menuItems) {
  const menuItem = menuItems[menuItemId];
  chrome.contextMenus.create({
    id: menuItemId,
    title: menuItem[1],
    parentId: MAIN_MENUITEM_ID,
    contexts: ["selection"]
  });
}

chrome.contextMenus.onClicked.addListener(onParaphraseRequest)

chrome.runtime.onMessage.addListener(onPasteDetection)

// to detect uname from 1cademy.com
chrome.runtime.onMessage.addListener(onUnameDetection)

// to detect like or dislike on response
chrome.runtime.onMessage.addListener(onVoteDetection)

const shortcutCommands: {
  [commandName: string]: ICommandType
} = {
  "oa-paraphrase-cgpt": "Paraphrase-CGPT",
  "oa-improve-cgpt": "Improve-CGPT",
  // "oa-literature-cgpt": "Literature-CGPT",
  "oa-shorten-cgpt": "Shorten-CGPT",
  "oa-mcq-cgpt": "MCQ-CGPT",
  // "oa-socially-judge-cgpt": "Socially-Judge-CGPT",
  // "oa-analyze-cgpt": "Analyze-CGPT",
  // "oa-teach-cgpt": "Teach-CGPT"
};

// shortcut handles
chrome.commands.onCommand.addListener((command, tab) => {
  if(!shortcutCommands.hasOwnProperty(command)) return;

  (async () => {
    const responses = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id || 0,
        allFrames: true
      },
      func: () => {
        const selection = window.getSelection() || { rangeCount: 0 };
        return (selection.rangeCount > 0) ? selection.toString() : '';
      }
    });
    const _responses = responses.filter((response) => response.result);
    if(!_responses.length) {
      return;
    }
    const selectedText = _responses[0].result;

    await tryExecutionUsingChatGPT(selectedText, shortcutCommands[command]);
  })()
})