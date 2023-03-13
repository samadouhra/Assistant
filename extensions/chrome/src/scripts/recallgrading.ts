import { doesReloadRequired } from "../helpers/chatgpt";
import { delay } from "../helpers/common";
import {
  collection,
  getDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { db, app, auth } from "../lib/firebase";

type RecallGradeProcess = {
  status: "notStarted" | "started" | "completed";
  tabId: number;
  gptTabId: number;
};
const START_RECALL_GRADING = "start-recall-grading";
const STOP_RECALL_GRADING = "stop-recall-grading";
const RECALL_GRADING_STATUS = "recall-grading-status";
const recallGradingCommands = [
  START_RECALL_GRADING,
  STOP_RECALL_GRADING,
  RECALL_GRADING_STATUS,
];
const gptResearcher = "Iman YeckehZaare";
export const stopRecallBot = async () => {
  await chrome.storage.local.set({
    recallgrading: {
      status: "notStarted",
    } as RecallGradeProcess,
  });
  await chrome.runtime.sendMessage(
    chrome.runtime.id,
    "recall-status-notStarted"
  );
};

const checkIfGPTHasError = async (gptTabId: number) => {
  const responses = await chrome.scripting.executeScript({
    target: {
      tabId: gptTabId,
    },
    func: () => {
      const btns = document.querySelectorAll("main button");
      return String(
        (btns?.[btns.length - 1]?.parentElement as HTMLElement)?.innerText
      ).includes("error");
    },
  });
  return !!responses[0].result;
};

const deleteGPTConversation = async (gptTabId: number) => {
  await chrome.scripting.executeScript({
    target: {
      tabId: gptTabId,
    },
    func: () => {
      let chats = document.querySelectorAll("nav > div > div > a.group");
      if (!chats.length) return;
      const deleteIcon = chats[0].querySelector(
        'path[d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"]'
      );
      if (!deleteIcon) return;
      const deleteBtn = deleteIcon.closest("button");
      if (!deleteBtn) return;
      deleteBtn.click();

      setTimeout(() => {
        chats = document.querySelectorAll("nav > div > div > a.group");
        const confirmIcon = chats[0].querySelector(
          'polyline[points="20 6 9 17 4 12"]'
        );
        if (!confirmIcon) return;
        const confirmBtn = confirmIcon.closest("button");
        if (!confirmBtn) return;
        confirmBtn.click();
      }, 1000);
    },
  });
  await delay(5000);
};

const startANewChat = async (gptTabId: number) => {
  await chrome.scripting.executeScript({
    target: {
      tabId: gptTabId,
    },
    func: () => {
      const newChatBtn = document.querySelector("nav > a") as HTMLElement;
      if (!newChatBtn) return;
      newChatBtn.click();
    },
  });
};

const reloadGptIfRequired = async (gptTabId: number) => {
  const reloadRequired = await doesReloadRequired(gptTabId);
  if (reloadRequired) {
    const chatgpt = await chrome.tabs.get(gptTabId);
    await chrome.tabs.update(gptTabId, { url: chatgpt.url }); // reloading tab
  }
};

const waitUntilChatGPTLogin = (gptTabId: number) => {
  return new Promise((resolve, reject) => {
    const checker = (n: number = 0) => {
      chrome.scripting
        .executeScript<any, boolean>({
          target: {
            tabId: gptTabId,
          },
          args: [],
          func: () => {
            return !!Array.from(document.querySelectorAll("a")).filter(
              (anc) => anc.innerText.trim().toLowerCase() === "new chat"
            ).length;
          },
        })
        .then((result) => {
          if (result.length) {
            if (result[0].result) {
              resolve(true);
              return;
            }

            if (n >= 180) {
              reject("Stopped due to memory leak");
              return; // don't run recursion
            }
          }
          setTimeout(() => checker(n + 1), 1000);
        });
    };
    checker();
  });
};

const sendPromptAndReceiveResponse = async (
  gptTabId: number,
  prompt: string
) => {
  const responses = await chrome.scripting.executeScript<any, any>({
    target: {
      tabId: gptTabId,
    },
    args: [prompt],
    func: (prompt: string) => {
      // input paraphrase text in gpt
      const gptTextInput = document.querySelector("textarea");
      if (!gptTextInput) return false;
      gptTextInput.value = prompt;

      const gptInputParent = gptTextInput.parentElement;
      if (!gptInputParent) return false;
      const gptActionBtn = gptInputParent.querySelector("button");
      if (!gptActionBtn) return false;
      gptActionBtn.click();

      const pInstances = document.querySelectorAll("p");
      const oldLastInstance: any =
        pInstances.length > 1
          ? pInstances[pInstances.length - 2]
          : pInstances?.[1];

      const waitUntilProcessed = (killOnGeneration: boolean) => {
        const pInstances = document.querySelectorAll("p");
        const lastInstance: any =
          pInstances.length > 1
            ? pInstances[pInstances.length - 2]
            : pInstances?.[1];

        return new Promise((resolve, reject) => {
          const checker = (n: number = 0) => {
            const buttons = document.querySelectorAll("form button");
            if (
              buttons.length &&
              (buttons[0] as HTMLElement).innerText.trim() !== ""
            ) {
              // removing html from button content to extract text
              const el = document.createElement("div");
              el.innerHTML = buttons[0].innerHTML;

              const buttonTitle = el.innerText.trim();
              const cond = killOnGeneration
                ? buttonTitle === "Stop generating" ||
                  buttonTitle === "Regenerate response"
                : buttonTitle !== "Stop generating" && buttonTitle !== "···";
              if (cond) {
                // killing recurrsion
                if (killOnGeneration) {
                  resolve(true);
                } else {
                  setTimeout(() => resolve(true), 1000);
                }
                return;
              }

              // checking memory leak
              if (n >= 300) {
                reject("Stopped due to memory leak");
                return false; // don't run recursion
              }
              // console.log("Saw generation", killOnGeneration);
              // this condition will help for faster plan if stop generation doesn't show up
            } else if (n >= 25) {
              const pInstances = document.querySelectorAll("p");
              const _lastInstance: any =
                pInstances.length > 1
                  ? pInstances[pInstances.length - 2]
                  : pInstances?.[1];
              /* console.log("Not saw generation", killOnGeneration, {
                lastInstance,
                _lastInstance
              }); */
              if (
                lastInstance !== _lastInstance ||
                oldLastInstance !== lastInstance
              ) {
                resolve(true);
                return;
              } else {
                reject("Stopped due to memory leak");
                return false;
              }
            }

            // if still generating run after a time
            setTimeout(() => {
              checker(n + 1);
            }, 200);
          };

          checker(0);
        });
      };

      // wait until api started generation
      return waitUntilProcessed(true).then(() => {
        // wait until chat gpt is processing/animating response
        return waitUntilProcessed(false).then(() => {
          const gptParagraphs = document.querySelectorAll("p");
          console.log(gptParagraphs, "gptParagraphs");
          if (gptParagraphs.length > 1) {
            const lastChatItem = gptParagraphs[gptParagraphs.length - 2];
            if (lastChatItem) {
              // i did this because, it was sometimes giving more than one paragraphs in answer
              const el = lastChatItem.parentElement || lastChatItem;
              if (el) {
                console.log("el - response", el);
                return el.innerText.trim();
              }
            }
          }
          console.log("sending empty response");
          // return empty string if there was not result
          return "";
        });
      });
    },
  });

  return responses?.[0].result || "";
};
const getRecallGrades = async () => {
  const recallGradesRef = collection(db, "recallGradesV2");
  const recallGradesDocs = await getDocs(recallGradesRef);
  let _recallGrades: any = [];

  for (const recallGradeDoc of recallGradesDocs.docs) {
    const recallGrade = recallGradeDoc.data();
    for (let session in recallGrade.sessions) {
      for (let conditionItem of recallGrade.sessions[session]) {
        if (!conditionItem.hasOwnProperty("doneDavinci")) {
          _recallGrades.push({
            docId: recallGradeDoc.id,
            session: session,
            numSessions: Object.keys(recallGrade.sessions).length,
            conditionIndex:
              recallGrade.sessions[session].indexOf(conditionItem),
            user: recallGrade.user,
            project: recallGrade.project,
            ...conditionItem,
          });
        }
      }
    }
  }

  return [
    ..._recallGrades.filter((g: any) => g.numSessions === 2),
    ..._recallGrades
      .filter((g: any) => g.numSessions !== 2)
      .sort((g1: any, g2: any) =>
        g1.researchers.length > g2.researchers.length ? -1 : 1
      ),
  ];
};
const updateRecallGrades = async (recallGrade: any) => {
  const recallGradeRef = doc(db, "recallGradesV2", recallGrade.docId);
  const recallGradeDoc = await getDoc(recallGradeRef);
  let recallGradeUpdate: any = recallGradeDoc.data();
  recallGradeUpdate.sessions[recallGrade.session][
    recallGrade.conditionIndex
  ].phrases = recallGrade.phrases;
  recallGradeUpdate.sessions[recallGrade.session][
    recallGrade.conditionIndex
  ].doneDavinci = true;
  await updateDoc(recallGradeRef, recallGradeUpdate);
};

export const recallGradingBot = async (gptTabId: number) => {
  // response from participant
  await signInWithEmailAndPassword(
    auth,
    process.env.email || "",
    process.env.password || ""
  );

  let gptTab: chrome.tabs.Tab;

  try {
    gptTab = await chrome.tabs.get(gptTabId);
  } catch (e) {
    gptTab = await chrome.tabs.create({
      url: "https://chat.openai.com/chat",
    });
    gptTabId = gptTab.id!;
  }
  await chrome.tabs.update(gptTabId, {
    active: true,
  });

  let recallGrades: any = await getRecallGrades();

  console.log("::: ::: recallGrades after ordering ::: :::: ", recallGrades);

  // focusing gpt tab

  console.log("checking if gpt need reload");
  // reloading gpt is required
  await reloadGptIfRequired(gptTabId);
  console.log("checking done for gpt reload");

  // waiting until chatgpt tab is loaded
  let isLoadingComplete = false;
  while (!isLoadingComplete) {
    const chatgpt = await chrome.tabs.get(gptTabId);
    if (chatgpt.status === "complete") {
      isLoadingComplete = true;
    }
  }

  // wait until chatgpt is available to chat
  const isChatAvailable = await waitUntilChatGPTLogin(gptTabId);
  if (!isChatAvailable) {
    throw new Error("ChatGPT is not available.");
  }

  for (let recallGrade of recallGrades) {
    for (let recallPhrase of recallGrade.phrases) {
      if (recallPhrase.hasOwnProperty("DavinciGrade")) continue;
      const storageValues = await chrome.storage.local.get(["recallgrading"]);
      // if someone closed one of these tabs between bot running
      if (storageValues?.recallgrading?.status === "notStarted") {
        await stopRecallBot();
        return;
      }
      await delay(4000);
      let isError = true;
      while (isError) {
        const prompt: string =
          `We asked a student to learn some passage and write whatever they recall.\n` +
          // `'''\n${recallPassage}\n'''\n` +
          `The student's response is below in triple-quotes:\n` +
          `'''\n${recallGrade.response}\n'''\n` +
          `Respond whether the student has mentioned the key phrase "${recallPhrase.phrase}" If they have mentioned it, respond YES, otherwise NO.\n` +
          `Your response should include three lines, separated by a new line character.\n` +
          `In the first line, only print YES or NO. Do not add any more explanations.\n` +
          `In the second line of your response, only print a percentage by which you are confident about your answer, YES or NO, in the first line.\n` +
          `In the third line of your response, explain why you answered YES or NO in the first line and the percentage in the second line.`;

        const response = await sendPromptAndReceiveResponse(gptTabId, prompt);
        isError = await checkIfGPTHasError(gptTabId);

        if (isError) {
          const chatgpt = await chrome.tabs.get(gptTabId);
          await chrome.tabs.update(gptTabId, { url: chatgpt.url }); // reloading tab
          console.log("Waiting for 10 min for chatGPT to return.");
          await delay(1000 * 60 * 10);
          const isChatAvailable = await waitUntilChatGPTLogin(gptTabId);
          if (!isChatAvailable) {
            throw new Error("ChatGPT is not available.");
          }
          continue;
        }
        await deleteGPTConversation(gptTabId);
        await startANewChat(gptTabId);
        console.log("response :: :: ", String(response));
        if (String(response).trim().slice(0, 3).toLowerCase() === "yes") {
          recallPhrase.DavinciGrade = true;
          recallPhrase.DavinciConfidence = String(response)
            .trim()
            .slice(3, String(response).trim().indexOf("%") + 1)
            .trim();
        } else {
          recallPhrase.DavinciGrade = false;
          recallPhrase.DavinciConfidence = String(response)
            .trim()
            .slice(2, String(response).trim().indexOf("%") + 1)
            .trim();
        }
        recallPhrase.DavinciReason = String(response)
          .trim()
          .slice(String(response).trim().indexOf("%") + 1)
          .trim();
        console.log("recallPhrase :: :: ", recallPhrase);
        console.log("recallGrade :: :: ", recallGrade);
      }
    }
    await updateRecallGrades(recallGrade);
  }
};

export const recallGradeListener = (
  command: string,
  context: chrome.runtime.MessageSender
) => {
  if (
    context.id !== chrome.runtime.id ||
    !recallGradingCommands.includes(command)
  ) {
    return;
  }

  if (command === START_RECALL_GRADING) {
    // start recall grading
    (async () => {
      // dispatching bot
      console.log("dispatching recall grading bot");
      let gptTabId: number;
      const gptTabs = await chrome.tabs.query({
        url: "https://chat.openai.com/chat/*",
      });
      if (gptTabs.length) {
        gptTabId = gptTabs[0].id!;
      } else {
        const newTab = await chrome.tabs.create({
          url: "https://chat.openai.com/chat",
          active: true,
        });
        gptTabId = newTab.id!;
      }
      await chrome.storage.local.set({
        recallgrading: {
          status: "started",
        } as RecallGradeProcess,
      });
      setTimeout(() => {
        chrome.runtime.sendMessage(chrome.runtime.id, "recall-status-started");
        recallGradingBot(gptTabId);
      });
    })();
  } else if (command === STOP_RECALL_GRADING) {
    // stop recall grading
    (async () => {
      const storageValues = await chrome.storage.local.get(["recallgrading"]);
      if (storageValues.recallgrading.tabId) {
        // removing tab
        try {
          const tab = await chrome.tabs.get(storageValues.recallgrading.tabId);
          if (tab.id) {
            // await chrome.tabs.remove(tab.id);
          }
        } catch (e) {}
      }
      await stopRecallBot();
    })();
  } else if (command === RECALL_GRADING_STATUS) {
    (async function () {
      const storageValues = await chrome.storage.local.get(["recallgrading"]);
      await chrome.runtime.sendMessage(
        chrome.runtime.id,
        "recall-status-" + (storageValues.recallgrading?.status || "notStarted")
      );
    })();
  }
};
