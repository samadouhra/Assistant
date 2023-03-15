import { doesReloadRequired } from "../helpers/chatgpt";
import { delay } from "../helpers/common";
import {
  collection,
  getDoc,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  QueryDocumentSnapshot,
  DocumentData,
  startAfter,
  runTransaction,
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
      const modelDropDown = document.querySelector("button[id^=\"headlessui-listbox-button-\"]") as HTMLElement;
      if(!modelDropDown) return;
      modelDropDown.click();
      const dropdownOptions = document.querySelectorAll("li[id^=\"headlessui-listbox-option-\"]");
      if(!dropdownOptions.length) return;
      const dropdownOption = dropdownOptions[dropdownOptions.length - 1] as HTMLElement;
      dropdownOption.click();
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

      let lastInstanceId: string = "last-instance-" + new Date().getTime();

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

      if(oldLastInstance) {
        oldLastInstance.setAttribute("id", lastInstanceId)
      }

      return lastInstanceId;
    }
  });

  let oldLastInstanceId: string = responses?.[0].result || "";
  let lastInstanceId: string = oldLastInstanceId;

  const checker = async(n: number = 0, killOnGeneration: boolean) => {
    const responses = await chrome.scripting.executeScript<any, any>({
      target: {
        tabId: gptTabId,
      },
      args: [killOnGeneration, lastInstanceId, oldLastInstanceId],
      func: (killOnGeneration: string, lastInstanceId: string, oldLastInstanceId: string) => {
        const pInstances = document.querySelectorAll("p");
        const lastInstance: any =
          pInstances.length > 1
            ? pInstances[pInstances.length - 2]
            : pInstances?.[1];
        
        if(lastInstance && !lastInstance.getAttribute("id")) {
          lastInstanceId = "last-instance-" + new Date().getTime();
          lastInstance.setAttribute("id", lastInstanceId);
        }

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
            return true;
          }

          // checking memory leak
          if (n >= 300) {
            return false; // don't run recursion
          }
          // this condition will help for faster plan if stop generation doesn't show up
        } else if (n >= 25) {
          const pInstances = document.querySelectorAll("p");
          const _lastInstance: any =
            pInstances.length > 1
              ? pInstances[pInstances.length - 2]
              : pInstances?.[1];
          const _lastInstanceId = _lastInstance ? _lastInstance.getAttribute("id") : "";
          console.log("Not saw generation", killOnGeneration, {
            lastInstanceId,
            _lastInstanceId
          });
          if (
            lastInstanceId !== _lastInstanceId ||
            oldLastInstanceId !== _lastInstanceId
          ) {
            return true;
          } else {
            return false;
          }
        } else {
          return lastInstanceId;
        }
      }
    });
    if(responses?.[0]?.result === true) {
      return true;
    } else if(responses?.[0]?.result === false) {
      return false;
    } else if(typeof responses?.[0]?.result === "string") {
      lastInstanceId = responses?.[0]?.result;
    }
    await delay(300);
    await checker(n + 1, killOnGeneration);
  }

  // console.log("reached at prompt response -1");

  await checker(0, true);
  // console.log("reached at prompt response 0");
  await checker(0, false);

  // console.log("reached at prompt response");
  const gptResponses = await chrome.scripting.executeScript<any, any>({
    target: {
      tabId: gptTabId,
    },
    args: [],
    func: () => {
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
    }
  });

  // console.log("reached at prompt response 2", gptResponses);

  return gptResponses?.[0]?.result || "";
};

const getRecallGrades = async(recallGradeDoc: QueryDocumentSnapshot<DocumentData>) => {
  let _recallGrades: any = [];

  const recallGrade = recallGradeDoc.data();
  let selectedByOther = false;
  const botId = await getBotId();

  for (let session in recallGrade.sessions) {
    for (let conditionItem of recallGrade.sessions[session]) {
      if(conditionItem.botId && conditionItem.botId !== botId) {
        selectedByOther = true;
      }
    }
  }

  if(selectedByOther) return [];

  for (let session in recallGrade.sessions) {
    for (let conditionItem of recallGrade.sessions[session]) {
      if (!conditionItem.hasOwnProperty("doneGpt4")) {
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

  // only do process recalls that are done
  _recallGrades = _recallGrades.filter((recall: any) => !recall.botId);

  let __recallGrades = _recallGrades.filter((g: any) => g.numSessions !== 2);
  __recallGrades.sort((g1: any, g2: any) =>
    g1.researchers.length > g2.researchers.length ? -1 : 1
  );

  return [
    ..._recallGrades.filter((g: any) => g.numSessions === 2),
    ...__recallGrades
  ];
}

const getBotId = async () => {
  const storagedActions = await chrome.storage.local.get(["botId"]);
  if(storagedActions?.botId) {
    return storagedActions?.botId;
  }
  const botId = String(new Date().getTime());
  await chrome.storage.local.set({
    botId
  });

  return botId;
}

const getNextRecallGrades = async (prevRecallGrade?: QueryDocumentSnapshot<DocumentData>): Promise<QueryDocumentSnapshot<DocumentData> | null> => {
  // priority 3 = researchers major vote excluding iman greater than or equal 3
  // priority 2 = Satisfied = false
  // priority 1 = Records for users whose 3rd session is not passed yet
  // priority 0 = default

  let recallGrades = await getDocs(
    prevRecallGrade ?
    query(
      collection(db, "recallGradesV2"),
      orderBy("priority", "desc"),
      limit(1),
      startAfter(prevRecallGrade)
    ) :
    query(
      collection(db, "recallGradesV2"),
      orderBy("priority", "desc"),
      limit(1)
    )
  );
  
  if(recallGrades.docs.length) {
    let isValid = true;
    await delay(1000 * (Math.random() * 7) + 4);
    const recallGrade = await getDoc(doc(db, "recallGradesV2", recallGrades.docs[0].id));

    const _recallGrades = await getRecallGrades(recallGrade as QueryDocumentSnapshot<DocumentData>);
    if(!_recallGrades.length) {
      isValid = false;
    } else {
      // flag condition item by bot id
      const { session, conditionIndex } = _recallGrades[0];
      const recallGradeData = recallGrade.data()!;
      recallGradeData.sessions[session][conditionIndex].botId = await getBotId();
      await updateDoc(
        doc(db, "recallGradesV2", recallGrade.id),
        {
          sessions: recallGradeData.sessions
        }
      );
    }

    if(!isValid) {
      return getNextRecallGrades(recallGrades.docs[0]);
    }

    return recallGrades.docs[0];
  }

  return null;
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
  ].doneGpt4 = true;
  await updateDoc(recallGradeRef, recallGradeUpdate);
};

export const recallGradingBot = async (gptTabId: number, prevRecallGrade?: QueryDocumentSnapshot<DocumentData>) => {
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
      url: "https://chat.openai.com/chat?model=gpt-4",
    });
    gptTabId = gptTab.id!;
  }
  await chrome.tabs.update(gptTabId, {
    active: true,
  });

  prevRecallGrade = (await getNextRecallGrades(prevRecallGrade))!;
  console.log(prevRecallGrade, "prevRecallGrade")
  if(!prevRecallGrade) return; // bot is done processing

  let recallGrades = await getRecallGrades(prevRecallGrade);

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

    const storageValues = await chrome.storage.local.get(["recallgrading"]);
    // if someone closed one of these tabs between bot running
    if (storageValues?.recallgrading?.status === "notStarted") {
      await stopRecallBot();
      return;
    }

    const phraseLines = recallGrade.phrases.map((phrase: any) => "- " + phrase.phrase);

    await delay(4000);
    let isError = true;
    while (isError) {
      const prompt: string =
      `We asked a student to learn some passage and write whatever they recall.\n` +
      `The student's response is below in triple-quotes:\n` +
      `'''\n` +
      `${recallGrade.response}\n` +
      `'''\n` +
      `Assess whether the student has mentioned each of the following key phrases:\n` +
      phraseLines.join("\n") + "\n" +
      `Your response should include a section for each of the above listed key phrases, separated by ---- enclosed by two new line characters.\n` +
      `Each section of your response, which corresponds to one of the above listed key phrases, should include the following three lines:\n` +
      `- DO NOT write the key phrase in your response. We understand your answers based on the order of key phrases.\n` +
      `- In the first line, only print YES or NO. Do not add any more explanations. DO NOT write any line before this line.\n` +
      `- In the second line of your response, only print your calculated probability of the YES response in percentage.\n` +
      `- In the third line of your response, explain why you answered YES or NO in the first line and the percentage in the second line.`;

      const response = await sendPromptAndReceiveResponse(gptTabId, prompt);
      isError = await checkIfGPTHasError(gptTabId);

      let phraseResponses: string[] = [];

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

      phraseResponses.push(...response.split("\n\n"));

      phraseResponses = phraseResponses.filter((phraseResponse) => phraseResponse.split("\n").length >= 3);

      while(phraseResponses.length < phraseLines.length && phraseResponses.length !== 1) {
        let resumeResponse = String(phraseResponses[phraseResponses.length - 1]);
        const lastPhraseResponse = String(phraseResponses[phraseResponses.length - 1]).split("\n");
        if(lastPhraseResponse.length < 3) {
          resumeResponse = phraseResponses[phraseResponses.length - 2] + "\n\n" // + resumeResponse;
          phraseResponses.pop();
        }
        const secondPrompt = 
        `Your response was incomplete. The last segment of your response was the following triple-quoted text.\n` +
        `'''\n` +
        resumeResponse +
        `'''\n` +
        `Print the rest of your response.\n`;

        const response = await sendPromptAndReceiveResponse(gptTabId, secondPrompt);
        isError = await checkIfGPTHasError(gptTabId);
        phraseResponses.push(...response.split("\n\n"));

        if(isError) {
          break;
        }
      }

      if (isError) {
        continue;
      }
      
      console.log(phraseResponses, "phraseResponses")
      for(let i = 0; i < recallGrade.phrases.length; i++) {
        const recallPhrase = recallGrade.phrases[i];
        // if (recallPhrase.hasOwnProperty("gpt4Grade")) continue;

        const response = phraseResponses.length === 1 ? phraseResponses[0] : phraseResponses[i];
        console.log("response :: :: ", String(response));
        if (String(response).trim().slice(0, 3).toLowerCase() === "yes") {
          recallPhrase.gpt4Grade = true;
          recallPhrase.gpt4Confidence = String(response)
            .trim()
            .slice(3, String(response).trim().indexOf("%") + 1)
            .trim();
        } else {
          recallPhrase.gpt4Grade = false;
          recallPhrase.gpt4Confidence = String(response)
            .trim()
            .slice(2, String(response).trim().indexOf("%") + 1)
            .trim();
        }
        recallPhrase.gpt4Reason = String(response)
          .trim()
          .slice(String(response).trim().indexOf("%") + 1)
          .trim();
        console.log("recallPhrase :: :: ", recallPhrase);
        console.log("recallGrade :: :: ", recallGrade);
      }
    }

    await updateRecallGrades(recallGrade);
    await deleteGPTConversation(gptTabId);
    await startANewChat(gptTabId);
  }

  recallGradingBot(gptTabId, prevRecallGrade);
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
          url: "https://chat.openai.com/chat?model=gpt-4",
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
