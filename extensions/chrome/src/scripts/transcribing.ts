import { getStorage, ref, uploadString } from "firebase/storage";
import { doesReloadRequired, startANewChat } from "../helpers/chatgpt";
import { db, app, auth } from "../lib/firebase";
// import { db_1cademy, app_1cademy, auth_1cademy } from "../lib/firebase-1cademy";
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
  Timestamp,
  setDoc,
} from "firebase/firestore";

type TranscribingProcess = {
  status: "notStarted" | "started" | "completed";
  tabId: number;
  gptTabId: number;
};
const START_TRANSCRIBING = "start-transcribing";
const STOP_TRANSCRIBING = "stop-transcribing";
const TANSCRIBING_STATUS = "transcribing-status";
const recallGradingCommands = [
  START_TRANSCRIBING,
  STOP_TRANSCRIBING,
  TANSCRIBING_STATUS,
];

export const stopTransribingBot = async () => {
  await chrome.storage.local.set({
    transcribing: {
      status: "notStarted",
    } as TranscribingProcess,
  });
  await chrome.runtime.sendMessage(
    chrome.runtime.id,
    "recall-status-notStarted"
  );
};

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message === "transcribing-status") {
    const storageValues = await chrome.storage.local.get(["transcribing"]);
    console.log("storageValues", storageValues);
    const message = "transcribing-status-" + storageValues.transcribing.status;
    await chrome.runtime.sendMessage(chrome.runtime.id, message);
  }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.conversation) {
    let conversation: any = message.conversation;
    const url = message.fullUrl.replace("https://meet.google.com/", "");
    // Process the conversation data as needed
    let surveyRef = collection(db, "surveyConversation");
    const userNodeQuery = query(
      surveyRef,
      where("mettingUrl", "==", message.fullUrl),
      limit(1)
    );
    const docs = await getDocs(userNodeQuery);
    if (docs.docs.length > 0) {
      const data: any = docs.docs[0].data();
      console.log("data", data);
      const ref = doc(db, "surveyConversation", docs.docs[0].id);
      const newData = {
        conversation,
      };
      await updateDoc(ref, newData);
    } else {
      await setDoc(doc(surveyRef), {
        conversation,
        mettingUrl: message.fullUrl,
      });
    }
  }
});

const transcribSessions = async (
  gptTabId: number,
  callback: (conversation: any[]) => void,
  fullUrl: string
) => {
  let shouldStop = false;
  let interval;
  const messageListener = (message: any, sender: any) => {
    console.log("message message bot", message);
    if (String(message).startsWith("transcribing-status")) {
      const status = message.replace("transcribing-status-", "");
      if (status !== "started") {
        shouldStop = true;
      }
    }
  };
  chrome.runtime.onMessage.addListener(messageListener);

  const response = await chrome.scripting.executeScript<any, any>({
    target: {
      tabId: gptTabId,
    },
    args: [fullUrl],
    func: (fullUrl) => {
      let conversation: any = [];
      const checkForUpdates = () => {
        const currentsentence: any = {};
        const elementButon: any = document.getElementsByClassName("juFBl");
        let captionButon: any = null;
        if (elementButon) {
          captionButon = elementButon[0].querySelector("button");
        }
        if (captionButon) {
          const label = captionButon.getAttribute("aria-label");
          if (captionButon && !label.includes("off")) {
            captionButon.click();
          }
        }
        const captionElements: any = document.getElementsByClassName("iOzk7");
        if (!captionElements.length) return;
        for (let captionElement of captionElements) {
          if (captionElement) {
            const speakerElement: any =
              document.getElementsByClassName("zs7s8d jxFHg")[0];
            let speakerName = "";
            if (speakerElement) {
              speakerName = speakerElement?.innerText || "";
            }
            if (speakerName === "You") {
              speakerName = "interviewer";
            }

            if (
              currentsentence.hasOwnProperty(speakerName) &&
              speakerName !== ""
            ) {
              currentsentence[speakerName] = "";
            }
            let captionText = "";
            const caption =
              captionElement.getElementsByClassName("iTTPOb VbkSUe")[0];
            if (caption) {
              captionText = caption?.innerText || "";
            }

            if (
              speakerName == null ||
              captionText == null ||
              speakerName === "" ||
              captionText === ""
            ) {
              continue;
            }

            if (
              conversation.length > 0 &&
              conversation[conversation.length - 1].hasOwnProperty("speaker") &&
              captionText === conversation[conversation.length - 1].sentence
            ) {
              continue;
            }

            if (
              captionText.endsWith(".") ||
              captionText.endsWith("!") ||
              captionText.endsWith("?")
            ) {
              console.log(
                "pushing",
                currentsentence[speakerName],
                currentsentence[speakerName] !== captionText,
                captionText
              );
              if (currentsentence[speakerName] !== captionText) {
                conversation.push({
                  speaker: speakerName,
                  sentence: captionText,
                });
              }
            } else {
              if (
                conversation.length > 0 &&
                conversation[conversation.length - 1].hasOwnProperty(
                  "speaker"
                ) &&
                speakerName === conversation[conversation.length - 1].speaker &&
                currentsentence[speakerName] !== captionText
              ) {
                conversation[conversation.length - 1].sentence += captionText;
              } else {
                conversation.push({
                  speaker: speakerName,
                  sentence: captionText,
                });
              }
            }
            if (currentsentence[speakerName] !== captionText) {
              currentsentence[speakerName] = captionText;
            }
            console.log(conversation[conversation.length - 1].speaker);
            console.log("currentsentence", currentsentence);
          }
        }
        chrome.runtime.sendMessage({ conversation, fullUrl });
      };
      let status = "started";
      if (status === "started") {
        interval = setInterval(checkForUpdates, 2000);
      }
      return conversation;
    },
  });
  const initialConversation = response[0].result;
  if (shouldStop) {
    clearInterval(interval);
  }
  callback(initialConversation);
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

  if (command === START_TRANSCRIBING) {
    // start recall grading
    (async () => {
      let gptTabId: number;
      let fullUrl: any = "";
      const gptTabs = await chrome.tabs.query({
        url: "https://meet.google.com/*",
        active: true,
      });
      if (gptTabs.length) {
        await chrome.storage.local.set({
          transcribing: {
            status: "started",
          } as TranscribingProcess,
        });
        gptTabId = gptTabs[0].id!;
        if (gptTabs[0].url) {
          fullUrl = gptTabs[0].url;
        }

        console.log("fullUrl", fullUrl);
        setTimeout(() => {
          chrome.runtime.sendMessage(
            chrome.runtime.id,
            "transcribing-status-started"
          );
          transcribSessions(gptTabId, () => {}, fullUrl);
        });
      }
    })();
  } else if (command === STOP_TRANSCRIBING) {
    (async function () {
      await chrome.storage.local.set({
        transcribing: {
          status: "notStarted",
        } as TranscribingProcess,
      });
      await chrome.runtime.sendMessage(
        chrome.runtime.id,
        "transcribing-status-notStarted"
      );
    })();
  } else if (command === TANSCRIBING_STATUS) {
    (async function () {
      const storageValues = await chrome.storage.local.get(["transcribing"]);
      await chrome.runtime.sendMessage(
        chrome.runtime.id,
        "transcribing-status-" +
          (storageValues.transcribing?.status || "notStarted")
      );
    })();
  }
};
