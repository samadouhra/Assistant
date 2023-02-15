import { doesReloadRequired } from "../helpers/chatgpt";

type RecallGradeProcess = {
  status: "notStarted" | "started" | "completed",
  tabId: number,
  gptTabId: number
}

const EXP_GRADING_URL = "http://localhost:3000/Activities/FreeRecallGrading";

const START_RECALL_GRADING = "start-recall-grading";
const STOP_RECALL_GRADING = "stop-recall-grading"
const RECALL_GRADING_STATUS = "recall-grading-status"
const recallGradingCommands = [
  START_RECALL_GRADING,
  STOP_RECALL_GRADING,
  RECALL_GRADING_STATUS
];

export const stopRecallBot = async () => {
  await chrome.storage.local.set({
    "recallgrading": {
      status: "notStarted"
    } as RecallGradeProcess
  });
}

const recallSubmitChecker = async (n: number = 0, recallTabId: number) => {
  const responses = await chrome.scripting.executeScript({
    target: {
      tabId: recallTabId
    },
    func: () => {
      if(document.querySelector("#recall-response")) {
        return true;
      }
      return false;
    }
  })
  const isAvailable = !!responses[0]?.result;
  if(isAvailable) {
    return true;
  }
  return new Promise((resolve) => {
    if(n >= 300) {
      resolve(false);
    }
    setTimeout(async () => {
      resolve(await recallSubmitChecker(n+1, recallTabId));
    }, 1000);
  })
}

const reloadGptIfRequired = async (gptTabId: number) => {
  const reloadRequired = await doesReloadRequired(gptTabId);
  if(reloadRequired) {
    const chatgpt = await chrome.tabs.get(gptTabId);
    await chrome.tabs.update(gptTabId, {url: chatgpt.url}); // reloading tab
  }
}

const waitUntilChatGPTLogin = (gptTabId: number) => {
  return new Promise((resolve, reject) => {
    const checker = (n: number = 0) => {
      chrome.scripting.executeScript<any, boolean>({
        target: {
          tabId: gptTabId
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

          if(n >= 180) {
            reject("Stopped due to memory leak");
            return; // don't run recursion
          }
        }
        setTimeout(() => checker(n+1), 1000)
      })
    }
    checker();
  })
};

const sendPromptAndReceiveResponse = async (gptTabId: number, prompt: string) => {
  const responses = await chrome.scripting.executeScript<any, any>({
    target: {
      tabId: gptTabId
    },
    args: [
      prompt
    ],
    func: (prompt: string) => {
      // input paraphrase text in gpt
      const gptTextInput = document.querySelector("textarea");
      if(!gptTextInput) return false;
      gptTextInput.value = prompt;

      const gptInputParent = gptTextInput.parentElement;
      if(!gptInputParent) return false;
      const gptActionBtn = gptInputParent.querySelector("button");
      if(!gptActionBtn) return false;
      gptActionBtn.click();

      const waitUntilProcessed = (killOnGeneration: boolean) => {
        const pInstances = document.querySelectorAll("p");
        const lastInstance: any = pInstances.length > 1 ? pInstances[pInstances.length - 2] : pInstances?.[1];
        
        return new Promise((resolve, reject) => {
          const checker = (n: number = 0) => {
            const buttons = document.querySelectorAll("form button");
            if(buttons.length && (buttons[0] as HTMLElement).innerText.trim() !== "") {
              // removing html from button content to extract text
              const el = document.createElement("div");
              el.innerHTML = buttons[0].innerHTML;

              const buttonTitle = el.innerText.trim();
              const cond = killOnGeneration ? (buttonTitle === "Stop generating" || buttonTitle === "Regenerate response") : buttonTitle !== "Stop generating";
              if(cond) {
                // killing recurrsion
                setTimeout(() => resolve(true), 1000);
                return;
              }

              // checking memory leak
              if(n >= 300) {
                reject("Stopped due to memory leak");
                return false; // don't run recursion
              }
              console.log("Saw generation", killOnGeneration);
              // this condition will help for faster plan if stop generation doesn't show up
            } else if(n >= 25) {
              const pInstances = document.querySelectorAll("p");
              const _lastInstance: any = pInstances.length > 1 ? pInstances[pInstances.length - 2] : pInstances?.[1];
              console.log("Not saw generation", killOnGeneration, {
                lastInstance,
                _lastInstance
              });
              if(lastInstance !== _lastInstance) {
                resolve(true);
              }
            }
            
            // if still generating run after a time
            setTimeout(() => {
              checker(n+1);
            }, 200)
          }

          checker(0);
        });
      }

      // wait until api started generation
      return waitUntilProcessed(true).then(() => {
        // wait until chat gpt is processing/animating response
        return waitUntilProcessed(false).then(() => {
          const gptParagraphs = document.querySelectorAll("p");
          console.log(gptParagraphs, "gptParagraphs")
          if(gptParagraphs.length > 1) {
            const lastChatItem = gptParagraphs[gptParagraphs.length - 2];
            if(lastChatItem) {
              // i did this because, it was sometimes giving more than one paragraphs in answer
              const el = lastChatItem.parentElement || lastChatItem;
              if(el) {
                console.log("el - response", el)
                return el.innerText.trim();
              }
            }
          }
          console.log("sending empty response")
          // return empty string if there was not result
          return "";
        })
      })
    }
  });

  return responses?.[0].result || "";
}

const fillRecallsAndSubmit = async (recallTabId: number, recallPhraseGrades: boolean[]) => {
  await chrome.scripting.executeScript<any, any>({
    target: {
      tabId: recallTabId
    },
    args: [
      recallPhraseGrades
    ],
    func: (recallPhraseGrades: boolean[]) => {
      const checkboxes = Array.from(document.querySelectorAll(".recall-phrase")).map((phraseEl) => phraseEl.querySelector("input"));
      for(let i = 0; i < recallPhraseGrades.length; i++) {
        if(!recallPhraseGrades[i]) continue;

        if(checkboxes[i]) {
          checkboxes[i]!.click();
        }
      }
      // clicking submit
      (document.querySelector("#recall-submit")! as HTMLElement).click();

      return new Promise((resolve) => {
        setTimeout(() => resolve(true), 3000)
      })
    }
  })
}

const clickNextUntilSubmit = async (recallTabId: number) => {
  return chrome.scripting.executeScript<any, any>({
    target: {
      tabId: recallTabId
    },
    args: [],
    func: () => {
      return new Promise((resolve) => {
        const cb = () => {
          const btnTxt = (document.querySelector("#schema-recall-submit") as HTMLElement)!.innerText.trim();
          (document.querySelector("#schema-recall-submit") as HTMLElement)!.click();
          if(btnTxt.toLowerCase() !== "submit") {
            setTimeout(() => {
              cb();
            }, 300)
          } else {
            setTimeout(() => {
              resolve(true)
            }, 5000)
          }
        }
        cb();
      });
    }
  })
}

const getRecallResponse = async(recallTabId: number): Promise<string> => {
  const responses = await chrome.scripting.executeScript({
    target: {
      tabId: recallTabId
    },
    func: () => {
      return (document.querySelector("#recall-response") as HTMLElement)?.innerText
    }
  })
  return responses[0].result || "";
}

const getRecallPhrases = async(recallTabId: number): Promise<string[]> => {
  const responses = await chrome.scripting.executeScript({
    target: {
      tabId: recallTabId
    },
    func: () => {
      return Array.from(document.querySelectorAll(".recall-phrase")).map((phraseEl) => phraseEl ? (phraseEl.querySelector("div:nth-child(2)") as HTMLElement)?.innerText : "")
    }
  })
  return responses[0].result || [];
}

const isItSchemaPage = async(recallTabId: number): Promise<boolean> => {
  const responses = await chrome.scripting.executeScript({
    target: {
      tabId: recallTabId
    },
    func: () => {
      return !!document.querySelector("#schema-recall-submit")
    }
  })
  return !!responses[0]?.result;
}

export const recallGradingBot = async (gptTabId: number, recallTabId: number) => {
  // response from participant

  const storageValues = await chrome.storage.local.get(["recallgrading"]);

  const gptTab = await chrome.tabs.get(gptTabId);
  const recallTab = await chrome.tabs.get(recallTabId);

  // if someone closed one of these tabs between bot running
  if(!gptTab.id || !recallTab.id || storageValues?.recallgrading?.status === "notStarted") {
    await stopRecallBot();
    return;
  }

  // document.querySelector("#recall-response").innerText
  // Array.from(document.querySelectorAll(".recall-phrase")).map((phraseEl) => phraseEl.querySelector("div:nth-child(2)").innerText)
  // Array.from(document.querySelectorAll(".recall-phrase")).map((phraseEl) => phraseEl.querySelector("div:nth-child(1)").innerText)
  // const cbs = Array.from(document.querySelectorAll(".recall-phrase")).map((phraseEl) => phraseEl.querySelector("input"))
  // document.querySelector("#recall-submit")

  // focusing recall grading tab
  await chrome.tabs.update(recallTab.id, {
    active: true
  })

  // waiting for until recall-submit button show up
  const isRecallResponseAvailable = await recallSubmitChecker(0, recallTabId);
  if(!isRecallResponseAvailable) {
    throw new Error("Recall response not found.");
  }

  const recallResponse = await getRecallResponse(recallTabId);
  const recallPhrases = await getRecallPhrases(recallTabId);

  console.log(recallResponse, recallPhrases, "recallResponse, recallPhrases");

  console.log("gpt tab active");

  // focusing gpt tab
  await chrome.tabs.update(gptTabId, {
    active: true
  })

  console.log("checking if gpt need reload");
  // reloading gpt is required
  await reloadGptIfRequired(gptTabId);
  console.log("checking done for gpt reload");

  // waiting until chatgpt tab is loaded
  let isLoadingComplete = false;
  while(!isLoadingComplete) {
    const chatgpt = await chrome.tabs.get(gptTabId);
    if(chatgpt.status === "complete") {
      isLoadingComplete = true;
    }
  }

  // wait until chatgpt is available to chat
  const isChatAvailable = await waitUntilChatGPTLogin(gptTabId);
  if(!isChatAvailable) {
    throw new Error("ChatGPT is not available.");
  }

  const recallPhraseGrades: boolean[] = [];
  for(const recallPhrase of recallPhrases) {
    let prompt: string = `Is this phrase "${recallResponse}" mentioned in the following triple-quoted text? only respond YES or NO with no explanations`;
    prompt += `'''\n${recallPhrase}\n'''`;

    const response = await sendPromptAndReceiveResponse(gptTabId, prompt);
    if(String(response).includes("YES")) {
      recallPhraseGrades.push(true);
    } else {
      recallPhraseGrades.push(false);
    }
  }

  console.log("CHATGPT Response", recallPhraseGrades);

  // focusing recall grading tab
  await chrome.tabs.update(recallTabId, {
    active: true
  })

  console.log("Filling responses in recalls");
  await fillRecallsAndSubmit(recallTabId, recallPhraseGrades);

  // checking if its schema page
  const itsOnSchema = await isItSchemaPage(recallTabId);
  console.log("is it on schema page", itsOnSchema);
  if(itsOnSchema) {
    await clickNextUntilSubmit(recallTabId);
  }

  console.log("going to refresh recall grade page");
  setTimeout(async () => {
    recallGradingBot(gptTabId, recallTabId);
  }, 3000)
}

export const recallGradeListener = (command: string, context: chrome.runtime.MessageSender) => {
  if(context.id !== chrome.runtime.id || !recallGradingCommands.includes(command)) {
    return;
  }

  if(command === START_RECALL_GRADING) {
    // start recall grading
    (async () => {
      const tabs = await chrome.tabs.query({
        url: EXP_GRADING_URL
      });

      let recallTabId: number;

      if(!tabs.length) {
        recallTabId = (await chrome.tabs.create({
          url: EXP_GRADING_URL,
          active: true
        })).id!
      } else {
        recallTabId = tabs[0].id!;
        await chrome.tabs.update({
          active: true
        })
      }

      // focusing window that had or now has recall grading page
      const recallTab = await chrome.tabs.get(recallTabId);
      const currentWindow = await chrome.windows.get(recallTab.windowId);
      await chrome.windows.update(currentWindow.id!, {
        focused: true
      });

      let gptTabId: number;
      const gptTabs = await chrome.tabs.query({
        url: "https://chat.openai.com/chat/*",
        windowId: currentWindow.id
      });
      if(gptTabs.length) {
        gptTabId = gptTabs[0].id!;
      } else {
        const newTab = await chrome.tabs.create({
          url: "https://chat.openai.com/chat",
          active: true
        });
        gptTabId = newTab.id!;
      }

      await chrome.storage.local.set({
        "recallgrading": {
          status: "started",
          tabId: recallTabId
        } as RecallGradeProcess
      });

      // dispatching bot
      setTimeout(() => {
        recallGradingBot(gptTabId, recallTabId);
      })
    })()
  } else if(command === STOP_RECALL_GRADING) {
    // stop recall grading
    (async () => {
      const storageValues = await chrome.storage.local.get(["recallgrading"]);
      if(storageValues.recallgrading.tabId) {
        // removing tab
        const tab = await chrome.tabs.get(storageValues.recallgrading.tabId);
        if(tab.id) {
          // await chrome.tabs.remove(tab.id);
        }
      }
      await stopRecallBot();
    })()
  } else if(command === RECALL_GRADING_STATUS) {
    (async function() {
      const storageValues = await chrome.storage.local.get(["recallgrading"]);
      await chrome.runtime.sendMessage(chrome.runtime.id, "recall-" + (storageValues.recallgrading?.status || "notStarted"));
    })()
  }
}
