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

const retreiveMeetingId = (fullUrl: string) => {
  if (!fullUrl) return "";
  const regex = /[a-z]{3}-[a-z]{4}-[a-z]{3}/;
  const matchResult = fullUrl.match(regex);
  if (matchResult) {
    return matchResult[0];
  }
};
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.conversation) {
    const storageValues = await chrome.storage.local.get(["transcribing"]);
    if (storageValues.transcribing?.status === "started") {
      let conversation: any = message.conversation;
      const transcriptQuery = query(
        collection(db, "transcript"),
        where("mettingUrl", "==", retreiveMeetingId(message.fullUrl)),
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
          mettingUrl: retreiveMeetingId(message.fullUrl),
        });
      }
    }
  }
});

//record the audio
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  try {
    if (message.audioDataUrl) {
      console.log("message.audioBlob", message);
      const base64String = message.audioDataUrl;
      console.log("base64String", base64String);
      console.log(
        "JSON.stringify({ audioBlob: base64String })",
        JSON.stringify({ audioBlob: base64String })
      );
      fetch(`${process.env.backendURL}/recordAudio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audioBlob: base64String,
          meetingUrl: message.fullUrl,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          console.log("Data stored in the database:", data);
        })
        .catch((error) => {
          console.error("Error storing data in the database:", error);
        });
      sendResponse({ status: "success" });
    }
  } catch (error) {
    console.log(error);
    sendResponse({ status: "error" });
  }
});

const transcribSessions = async (
  meetTabId: number,
  callback: (conversation: any[]) => void,
  fullUrl: string
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
  const transcriptQuery = query(
    collection(db, "transcript"),
    where("mettingUrl", "==", retreiveMeetingId(fullUrl)),
    limit(1)
  );
  const transcriptDocs = await getDocs(transcriptQuery);
  if (transcriptDocs.docs.length > 0) {
    const transcriptData: any = transcriptDocs.docs[0].data();
    oldConversation = transcriptData?.conversation || [];
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

  const startRecording = async () => {
    return new Promise((resolve, reject) => {
      chrome.scripting.executeScript<any, any>({
        target: {
          tabId: meetTabId,
        },
        args: [fullUrl],
        func: (fullUrl) => {
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then(function (stream) {
              const mediaRecorder = new MediaRecorder(stream);
              const chunks: any = [];
              mediaRecorder.ondataavailable = function (event) {
                chunks.push(event.data);
              };
              mediaRecorder.onstop = function () {
                const audioBlob = new Blob(chunks, { type: "audio/webm" });
                const reader = new FileReader();
                reader.onloadend = function () {
                  const audioDataUrl = reader.result;
                  chrome.runtime.sendMessage({ audioDataUrl, fullUrl });
                };
                reader.readAsDataURL(audioBlob);
              };
              setInterval(() => {
                mediaRecorder.stop();
                mediaRecorder.start();
              }, 10000);
              mediaRecorder.start();
            })
            .catch(function (error) {
              console.error("Error accessing audio stream:", error);
              reject(error);
            });
        },
      });
    });
  };
  startRecording();
  const response = await chrome.scripting.executeScript<any, any>({
    target: {
      tabId: meetTabId,
    },
    args: [fullUrl, oldConversation],
    func: (fullUrl, oldConversation) => {
      let conversation: any = oldConversation;
      // Request access to audio stream
      const checkForUpdates = () => {
        console.log("meetingId", fullUrl);
        const currentsentence: any = {};
        const captionElements: any = document.getElementsByClassName("iOzk7");
        if (!captionElements.length) return;
        const promises = [];
        for (let captionElement of captionElements) {
          promises.push(
            new Promise((resolve: any, reject) => {
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
                  resolve();
                } else if (
                  conversation.length > 0 &&
                  conversation[conversation.length - 1].hasOwnProperty(
                    "speaker"
                  ) &&
                  conversation[conversation.length - 1].sentence &&
                  conversation[conversation.length - 1].sentence.includes(
                    captionText
                  )
                ) {
                  resolve();
                } else if (
                  conversation.length > 0 &&
                  conversation[conversation.length - 1].hasOwnProperty(
                    "speaker"
                  ) &&
                  speakerName === conversation[conversation.length - 1].speaker
                ) {
                  let cleanVersion = "";
                  let removepart = "";
                  let originalText =
                    conversation[conversation.length - 1].sentence;

                  for (let i = 1; i < captionText.length; i++) {
                    const substring = captionText.substring(0, i);
                    if (!originalText.includes(substring)) {
                      cleanVersion = captionText.replace(removepart, "");
                    } else {
                      removepart = captionText.substring(0, i);
                    }
                  }
                  conversation[conversation.length - 1].sentence +=
                    cleanVersion;
                  resolve();
                } else {
                  conversation.push({
                    speaker: speakerName,
                    sentence: captionText,
                    Timestamp: new Date().toLocaleString(),
                  });
                  resolve();
                }
              } else {
                resolve();
              }
            })
          );
        }
        Promise.all(promises)
          .then(() => {
            console.log("All caption elements processed successfully.");
          })
          .catch((error) => {
            console.error("Error processing caption elements:", error);
          });
        chrome.runtime.sendMessage({ conversation, fullUrl });
      };
      setInterval(checkForUpdates, 4000);
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
        meetTabId = gptTabs[0].id!;
        if (gptTabs[0].url) {
          fullUrl = gptTabs[0].url;
        }
        setTimeout(() => {
          chrome.runtime.sendMessage(
            chrome.runtime.id,
            "transcribing-status-started"
          );
          transcribSessions(meetTabId, () => {}, fullUrl);
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
