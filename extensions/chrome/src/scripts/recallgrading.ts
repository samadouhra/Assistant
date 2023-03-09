import { doesReloadRequired } from "../helpers/chatgpt";
import { delay } from "../helpers/common";

type RecallGradeProcess = {
  status: "notStarted" | "started" | "completed",
  tabId: number,
  gptTabId: number
}

const EXP_GRADING_URL = "http://1cademy.us/Activities/FreeRecallGrading";

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
  await chrome.runtime.sendMessage(chrome.runtime.id, "recall-status-notStarted");
}

const checkIfGPTHasError = async (gptTabId: number) => {
  const responses = await chrome.scripting.executeScript({
    target: {
      tabId: gptTabId
    },
    func: () => {
      const btns = document.querySelectorAll("main button");
      return String((btns?.[btns.length - 1]?.parentElement as HTMLElement)?.innerText).includes("error")
    }
  })
  return !!responses[0].result;
}

const deleteGPTConversation = async (gptTabId: number) => {
  await chrome.scripting.executeScript({
    target: {
      tabId: gptTabId
    },
    func: () => {
      let chats = document.querySelectorAll("nav > div > div > a.group");
      if(!chats.length) return;
      const deleteIcon = chats[0].querySelector("path[d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"]");
      if(!deleteIcon) return;
      const deleteBtn = deleteIcon.closest("button");
      if(!deleteBtn) return;
      deleteBtn.click();
      
      setTimeout(() => {
        chats = document.querySelectorAll("nav > div > div > a.group");
        const confirmIcon = chats[0].querySelector("polyline[points=\"20 6 9 17 4 12\"]");
        if(!confirmIcon) return;
        const confirmBtn = confirmIcon.closest("button");
        if(!confirmBtn) return;
        confirmBtn.click();
      }, 1000)
    }
  });
  await delay(5000);
}

const startANewChat = async (gptTabId: number) => {
  await chrome.scripting.executeScript({
    target: {
      tabId: gptTabId
    },
    func: () => {
      const newChatBtn = document.querySelector("nav > a") as HTMLElement;
      if(!newChatBtn) return;
      newChatBtn.click();
    }
  })
}

const addTimerToGPT = async (gptTabId: number, time: number) => {
  await chrome.scripting.executeScript({
    target: {
      tabId: gptTabId
    },
    args: [time],
    func: (time: number) => {
      const TIMER_GPT = "timer-gpt";
      let timerEl = document.getElementById(TIMER_GPT);
      if(!timerEl) {
        timerEl = document.createElement("div")
        timerEl.setAttribute("id", TIMER_GPT)
        document.body.appendChild(timerEl);
        const timerStyleEl = document.createElement("style");
        timerStyleEl.innerHTML = `
        #${TIMER_GPT} {
          position: fixed;
          bottom: 10px;
          right: 10px;
          font-size: 16px;
        }
        `;
        document.body.appendChild(timerStyleEl);
      }
      const timer = (seconds: number) => {
        console.log("timer seconds", seconds);
        if(seconds) {
          timerEl!.innerHTML = String(seconds);
          setTimeout(() => {
            timer(seconds - 1);
          }, 1000)
        } else {
          timerEl!.innerHTML = "";
        }
      }

      timer(Math.floor(time / 1000));
    }
  })
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

      const pInstances = document.querySelectorAll("p");
      const oldLastInstance: any = pInstances.length > 1 ? pInstances[pInstances.length - 2] : pInstances?.[1];
      
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
              const cond = killOnGeneration ? (buttonTitle === "Stop generating" || buttonTitle === "Regenerate response") : buttonTitle !== "Stop generating" && buttonTitle !== "···";
              if(cond) {
                // killing recurrsion
                if(killOnGeneration) {
                  resolve(true);
                } else {
                  setTimeout(() => resolve(true), 1000);
                }
                return;
              }

              // checking memory leak
              if(n >= 300) {
                reject("Stopped due to memory leak");
                return false; // don't run recursion
              }
              // console.log("Saw generation", killOnGeneration);
              // this condition will help for faster plan if stop generation doesn't show up
            } else if(n >= 25) {
              const pInstances = document.querySelectorAll("p");
              const _lastInstance: any = pInstances.length > 1 ? pInstances[pInstances.length - 2] : pInstances?.[1];
              /* console.log("Not saw generation", killOnGeneration, {
                lastInstance,
                _lastInstance
              }); */
              if(lastInstance !== _lastInstance || oldLastInstance !== lastInstance) {
                resolve(true);
                return;
              } else {
                reject("Stopped due to memory leak");
                return false;
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

const waitUntilRecallSubmitCompleted = async (recallTabId: number) => {
  return new Promise((resolve) => {
    const checker = async () => {
      const responses = await chrome.scripting.executeScript<any, any>({
        target: {
          tabId: recallTabId
        },
        args: [],
        func: () => {
          const recallSubmit = document.querySelector("#recall-submit") as HTMLButtonElement;
          if(!recallSubmit) return true;
    
          return !recallSubmit.disabled;
        }
      });
    
      const isDone = !!responses?.[0].result!;
      if(isDone) {
        resolve(true);
        return;
      }
      setTimeout(() => {
        checker();
      }, 3000)
    }

    checker();
  })
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

const getRecallPassage = async(recallTabId: number) => {
  const responses = await chrome.scripting.executeScript({
    target: {
      tabId: recallTabId
    },
    func: () => {
      return (document.querySelector("#recall-passage") as HTMLElement)?.innerText
    }
  })
  return responses[0].result || "";
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

export const createOrReturnRecallTabId = async(recallTabId: number) => {
  let recallTab: chrome.tabs.Tab;

  try {
    recallTab = await chrome.tabs.get(recallTabId);
  } catch(e) {
    recallTab = await chrome.tabs.create({
      url: EXP_GRADING_URL
    })
    recallTabId = recallTab.id!;
  }
  return recallTabId;
}

export const recallGradingBot = async (gptTabId: number, recallTabId: number) => {
  // response from participant
  console.log("recallGradingBot started")

  const storageValues = await chrome.storage.local.get(["recallgrading"]);

  let gptTab: chrome.tabs.Tab;;
  let recallTab: chrome.tabs.Tab;

  try {
    gptTab = await chrome.tabs.get(gptTabId);
  } catch(e) {
    gptTab = await chrome.tabs.create({
      url: "https://chat.openai.com/chat"
    })
    gptTabId = gptTab.id!;
  }

  recallTabId = await createOrReturnRecallTabId(recallTabId);
  recallTab = await chrome.tabs.get(recallTabId);

  // if someone closed one of these tabs between bot running
  if(storageValues?.recallgrading?.status === "notStarted") {
    await stopRecallBot();
    return;
  }

  // document.querySelector("#recall-response").innerText
  // Array.from(document.querySelectorAll(".recall-phrase")).map((phraseEl) => phraseEl.querySelector("div:nth-child(2)").innerText)
  // Array.from(document.querySelectorAll(".recall-phrase")).map((phraseEl) => phraseEl.querySelector("div:nth-child(1)").innerText)
  // const cbs = Array.from(document.querySelectorAll(".recall-phrase")).map((phraseEl) => phraseEl.querySelector("input"))
  // document.querySelector("#recall-submit")
  // document.querySelectorAll("nav > div > div > a.group") <--- to fetch list of chats
  // chats[0].querySelector("path[d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"]").closest("button") <-- to process delete
  // chats[0].querySelector("polyline[points=\"20 6 9 17 4 12\"]").closest("button") <--- confirm button
  // document.querySelector("nav > a") <--- new chat

  // focusing recall grading tab
  await chrome.tabs.update(recallTab.id!, {
    active: true
  })

  // waiting for until recall-submit button show up
  const isRecallResponseAvailable = await recallSubmitChecker(0, recallTabId);
  if(!isRecallResponseAvailable) {
    throw new Error("Recall response not found.");
  }

  const recallResponse = await getRecallResponse(recallTabId);
  const recallPhrases = await getRecallPhrases(recallTabId);
  const recallPassage = await getRecallPassage(recallTabId);

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
    let isError = true;
    while(isError) {
      const prompt: string = `We asked a student to learn some passage and write whatever they recall.\n` +
        // `'''\n${recallPassage}\n'''\n` +
        `The student's response is below in triple-quotes:\n` +
        `'''\n${recallResponse}\n'''\n` +
        `Respond whether the student has mentioned the key phrase "${recallPhrase}" If they have mentioned it, respond YES, otherwise NO.\n` +
        `Your response should include two lines, separated by a new line character.\n` +
        `In the first line, only print YES or NO. Do not add any more explanations.\n` +
        `In the next line of your response, explain why you answered YES or NO in the previous line.`;
      
      const response = await sendPromptAndReceiveResponse(gptTabId, prompt);
      isError = await checkIfGPTHasError(gptTabId);
      
      if(isError) {
        const chatgpt = await chrome.tabs.get(gptTabId);
        await chrome.tabs.update(gptTabId, {url: chatgpt.url}); // reloading tab
        console.log("Waiting for 10 min for chatGPT to return.");
        await delay(1000 * 60 * 10); // 1 hour wait
        const isChatAvailable = await waitUntilChatGPTLogin(gptTabId);
        if(!isChatAvailable) {
          throw new Error("ChatGPT is not available.");
        }
        continue;
      }

      // const delayMiliseconds = (Math.floor(Math.random() * 13) + 4) * 1000;
      // await addTimerToGPT(gptTabId, delayMiliseconds);
      await deleteGPTConversation(gptTabId);
      await startANewChat(gptTabId);
      console.log("Starting a new conversation.");
      await delay(4000);
      if(String(response).trim().slice(0, 3).toLowerCase() === "yes") {
        recallPhraseGrades.push(true);
      } else {
        recallPhraseGrades.push(false);
      }
    }
  }

  console.log("CHATGPT Response", recallPhraseGrades);

  // focusing recall grading tab
  await chrome.tabs.update(recallTabId, {
    active: true
  })

  console.log("Filling responses in recalls");
  await fillRecallsAndSubmit(recallTabId, recallPhraseGrades);
  console.log("waiting until in recalls submitted");
  await waitUntilRecallSubmitCompleted(recallTabId);

  // checking if its schema page
  const itsOnSchema = await isItSchemaPage(recallTabId);
  console.log("is it on schema page", itsOnSchema);
  if(itsOnSchema) {
    await clickNextUntilSubmit(recallTabId);
  }

  console.log("going to refresh recall grade page");
  setTimeout(async () => {
    recallGradingBot(gptTabId, recallTabId);
  }, 2000)
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
        chrome.runtime.sendMessage(chrome.runtime.id, "recall-status-started");
        recallGradingBot(gptTabId, recallTabId);
      })
    })()
  } else if(command === STOP_RECALL_GRADING) {
    // stop recall grading
    (async () => {
      const storageValues = await chrome.storage.local.get(["recallgrading"]);
      if(storageValues.recallgrading.tabId) {
        // removing tab
        try {
          const tab = await chrome.tabs.get(storageValues.recallgrading.tabId);
          if(tab.id) {
            // await chrome.tabs.remove(tab.id);
          }
        } catch(e) {}
      }
      await stopRecallBot();
    })()
  } else if(command === RECALL_GRADING_STATUS) {
    (async function() {
      const storageValues = await chrome.storage.local.get(["recallgrading"]);
      await chrome.runtime.sendMessage(chrome.runtime.id, "recall-status-" + (storageValues.recallgrading?.status || "notStarted"));
    })()
  }
}
