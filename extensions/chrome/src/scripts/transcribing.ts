import { db } from "../lib/firebase";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  limit,
  setDoc,
} from "firebase/firestore";

type TranscribingProcess = {
  status: "notStarted" | "started" | "completed";
  tabId: number;
  meetTabId: number;
};
const START_TRANSCRIBING = "start-transcribing";
const STOP_TRANSCRIBING = "stop-transcribing";
const TANSCRIBING_STATUS = "transcribing-status";
const recallGradingCommands = [
  START_TRANSCRIBING,
  STOP_TRANSCRIBING,
  TANSCRIBING_STATUS,
];

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.conversation) {
    const storageValues = await chrome.storage.local.get(["transcribing"]);
    if (storageValues.transcribing?.status === "started") {
      let conversation: any = message.conversation;
      const meetingId = message.meetingId.replace(/"/g, "");
      const transcriptQuery = query(
        collection(db, "transcript"),
        where("mettingUrl", "==", meetingId),
        limit(1)
      );
      const transcriptDocs = await getDocs(transcriptQuery);
      if (transcriptDocs.docs.length > 0) {
        const transcriptData: any = transcriptDocs.docs[0].data();
        const ref = doc(db, "transcript", transcriptDocs.docs[0].id);
        const newData = {
          conversation,
        };
        await updateDoc(ref, newData);
      } else {
        await setDoc(doc(collection(db, "transcript")), {
          conversation,
          mettingUrl: meetingId,
        });
      }
    }
  }
});

const transcribSessions = async (
  meetTabId: number,
  callback: (conversation: any[]) => void,
  meetingId: string
) => {
  let oldConversation: any = [];
  chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    if (tabId === meetTabId) {
      await chrome.storage.local.set({
        transcribing: {
          status: "notStarted",
        } as TranscribingProcess,
      });
    }
  });
  const _meetingId = meetingId.replace(/"/g, "");
  const transcriptQuery = query(
    collection(db, "transcript"),
    where("mettingUrl", "==", _meetingId),
    limit(1)
  );
  const transcriptDocs = await getDocs(transcriptQuery);
  if (transcriptDocs.docs.length > 0) {
    const transcriptData: any = transcriptDocs.docs[0].data();
    oldConversation = transcriptData.conversation;
  }
  const executeScript = async (started: boolean) => {
    await chrome.scripting.executeScript<any, any>({
      target: {
        tabId: meetTabId,
      },
      args: [started],
      func: (started) => {
        const elementButon: any = document.getElementsByClassName("juFBl");
        let captionButon: any = null;
        if (elementButon) {
          captionButon = elementButon[0].querySelector("button");
        }
        if (captionButon) {
          const label = captionButon.getAttribute("aria-label");
          if (captionButon && !label.includes("off") && started) {
            captionButon.click();
          }
          if (captionButon && label.includes("off") && !started) {
            captionButon.click();
          }
        }
      },
    });
  };
  const checkStartedChange = async () => {
    const storageValues = await chrome.storage.local.get(["transcribing"]);
    const started = storageValues.transcribing?.status === "started";
    executeScript(started);
  };
  setInterval(checkStartedChange, 500);
  const response = await chrome.scripting.executeScript<any, any>({
    target: {
      tabId: meetTabId,
    },
    args: [meetingId, oldConversation],
    func: (meetingId, oldConversation) => {
      let conversation: any = oldConversation;
      const checkForUpdates = () => {
        console.log("meetingId", meetingId);
        const currentsentence: any = {};
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
            let captionText = "";
            const caption =
              captionElement.getElementsByClassName("iTTPOb VbkSUe")[0];
            if (caption) {
              captionText = caption?.innerText || "";
            }

            if (!captionText || !speakerName) {
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
              conversation.length > 0 &&
              conversation[conversation.length - 1].hasOwnProperty("speaker") &&
              speakerName === conversation[conversation.length - 1].speaker
            ) {
              conversation[conversation.length - 1].sentence += captionText;
            } else {
              conversation.push({
                speaker: speakerName,
                sentence: captionText,
                Timestamp: new Date().toLocaleString(),
              });
            }
          }
        }
        chrome.runtime.sendMessage({ conversation, meetingId });
      };
      setInterval(checkForUpdates, 2000);
      return conversation;
    },
  });
  const initialConversation = response[0].result;
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
      let meetTabId: number;
      let meetingId: string = "";
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
        meetTabId = gptTabs[0].id!;
        if (gptTabs[0].url) {
          const regex = /[a-z]{3}-[a-z]{4}-[a-z]{3}/;
          const matchResult = gptTabs[0]?.url?.match(regex);
          if (matchResult) {
            meetingId = JSON.stringify(matchResult[0]);
          }
        }
        setTimeout(() => {
          chrome.runtime.sendMessage(
            chrome.runtime.id,
            "transcribing-status-started"
          );
          transcribSessions(meetTabId, () => {}, meetingId);
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
