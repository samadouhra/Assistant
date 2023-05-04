import { db } from "./lib/firebase";
import { doc, writeBatch, collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { doesReloadRequired, fetchClientInfo, sendPromptAndReceiveResponse } from "./helpers/chatgpt";
import { ENDPOINT_BASE } from "./utils/constants";
import { findOrCreateNotebookTab } from "./helpers/common";
import { IAssistantCreateNotebookRequestPayload, ViewNodeWorkerPayload, ViewNodeWorkerResponse } from "./types";
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
  if (tabs.length === 0) {
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
  if (reloadRequired) {
    const chatgpt = await chrome.tabs.get(tabId);
    await chrome.tabs.update(tabId, { url: chatgpt.url }); // reloading tab
  }

  // waiting until chatgpt tab is loaded
  let isLoadingComplete = false;
  while (!isLoadingComplete) {
    const chatgpt = await chrome.tabs.get(tabId);
    if (chatgpt.status === "complete") {
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
          if (result.length) {
            if (result[0].result) {
              resolve(true);
              return;
            }

            // checking memory leak
            const currentTime = new Date().getTime();
            const timeDiff = (startedAt - currentTime) / 1000;
            if (timeDiff >= 180) {
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

  let commandText: string = "";
  switch (commandType) {
    case "Analyze-CGPT":
      commandText += "Write a report on the following triple-quoted text. The report should include document statistics, vocabulary statistics, readability score, tone type (available options are Formal, Informal, Optimistic, Worried, Friendly, Curious, Assertive, Encouraging, Surprised, or Cooperative), intent type (available options are Inform, Describe, Convince, or Tell A Story), audience type (available options are General, Knowledgeable, or Expert), style type (available options are Formal or Informal), emotion type (available options are Mild or Strong), and domain type (available options are General, Academic, Business, Technical, Creative, or Casual). ";
      break;
    case "Alternative-viewpoints-CGPT":
      commandText += "Generate alternative view points to the following triple-quoted text, and support each view-point with appreciate citations. At the end of your response print a bibliography section for all the references cited. ";
      break;
    case "Clarify-CGPT":
      commandText += "Clarify the following triple-quoted text ";
      break;
    case "Fact-check-CGPT":
      commandText += "Fact check the following triple-quoted text ";
      break;
    case "MCQ-CGPT":
      commandText += "Generate a multiple-choice question about the following triple-quoted text, with one or more correct choices. Then, for each choice, separately write the word \"CORRECT\" or \"WRONG\" and explain why it is correct or wrong. ";
      break;
    case "Improve-CGPT":
      commandText += "Improve the following triple-quoted text and explain what grammar, spelling, mistakes you have corrected, including an explanation of the rule in question? ";
      break;
    case "Literature-CGPT":
      commandText += "Comprehensively review the literature with citations on the following triple-quoted text. Then generate the list of references you cited. ";
      break;
    case "Paraphrase-CGPT":
      commandText += "Paraphrase the following triple-quoted text ";
      break;
    case "Shorten-CGPT":
      commandText += "Shorten the following triple-quoted text? Then, list the key points that you included and the peripheral points that you omitted in a bulleted list ";
      break;
    case "Simplify-CGPT":
      commandText += "Explain the following triple-quoted text for elementary school student ";
      break;
    case "Socially-Judge-CGPT":
      commandText += "Is it socially appropriate to say the following triple-quoted text? ";
      break;
    case "Teach-CGPT":
      commandText += "Teach me step-by-step the following triple-quoted text ";
      break;
  }
  commandText += `'''\n${paragraph}\n'''`;
  const cGPTResponse = sendPromptAndReceiveResponse(tabId, commandText);

  const clientStorage = await chrome.storage.local.get(["clientInfo", "onecademyUname"]);
  let clientInfo = clientStorage?.clientInfo;
  // fetching client info
  if (!clientInfo) {
    clientInfo = (await (await fetch("https://www.cloudflare.com/cdn-cgi/trace")).text()).split("\n").filter((p) => p).reduce((c: any, d) => {
      const _ps = d.split("=")
      const paramName = _ps.shift() as string;
      const paramValue = _ps.join("=");
      return { ...c, [paramName]: paramValue };
    }, {});

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
  } catch (e) { }

}

const onParaphraseRequest = (onClickData: chrome.contextMenus.OnClickData) => {
  const mItemId = String(onClickData.menuItemId);
  const menuItemIds = Object.keys(menuItems);
  if (!menuItemIds.includes(mItemId)) return;

  tryExecutionUsingChatGPT(
    String(onClickData.selectionText),
    menuItems[mItemId][0]
  );
}

const onPasteDetection = (message: any) => {
  return (async () => {
    if (message === "paste-done") {
      const storagedActions = await chrome.storage.local.get(["lastActionId", "lastActionTime"])
      if (storagedActions?.lastActionId) {
        const lastAction = parseInt(storagedActions?.lastActionTime);
        const currentTime = new Date().getTime();
        const timeDiff = (lastAction - currentTime) / 1000;
        // should be less than or equal to 20 mints
        if (timeDiff > 1200) return;

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
        } catch (e) { }
      }
    }
  })()
}

const onUnameDetection = (message: any, sender: chrome.runtime.MessageSender) => {
  if (typeof message !== "string") return;

  const url = sender.url || "";
  if (!url.match(/(1cademy|knowledge\-dev|localhost)/)) return;

  if (!message.startsWith("onecademy-user-")) return;

  const uname = message.replace(/^onecademy-user-/, "");

  return (async () => {
    await chrome.storage.local.set({
      onecademyUname: uname
    })
  })();
}

const onVoteDetection = (message: any, sender: chrome.runtime.MessageSender) => {
  if (typeof message !== "string") return;

  const url = sender.url || "";
  if (!url.match(/chat\.openai\.com/)) return;

  if (!message.startsWith("oa-gpt-")) return;

  let startedIndex = "";
  let vote = 0;

  // on like clicked
  if (message.match(/^oa-gpt-like-clicked-/)) {
    startedIndex = message.replace(/^oa-gpt-like-clicked-/, "");
    vote = 1;
  } else if (message.match(/^oa-gpt-dislike-clicked-/)) {
    // on dislike clicked
    startedIndex = message.replace(/^oa-gpt-dislike-clicked-/, "");
  }

  (async () => {
    const storagedActions = await chrome.storage.local.get(["lastActionId", "startedIndex"])
    if (startedIndex === storagedActions?.startedIndex && storagedActions?.lastActionId) {
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
      } catch (e) { }
    }
  })()
}

const onAskAssistant = (message: any, sender: chrome.runtime.MessageSender) => {

  (async () => {
    // console.log({ message })
    if (message?.messageType !== 'assistant') return
    if (!sender.tab?.id) return console.error('Cant find tab id')

    console.log('call onAskAssistant:', message)
    const res = await fetch(`${ENDPOINT_BASE}/assistant`, {
      method: "POST",
      body: JSON.stringify(message.payload),
      headers: {
        "Content-Type": "application/json"
      }
    })
    const data = await res.json()
    console.log({ data })
    await chrome.tabs.sendMessage(sender.tab.id, { ...data, messageType: "assistant" })

  })()
}

const onOpenNode = (message: any, sender: chrome.runtime.MessageSender) => {
  (async () => {
    // console.log({ message })
    if (message?.messageType !== 'notebook:open-node') return
    if (!sender.tab?.id) return console.error('Cant find tab id')

    const { apiPayload, nodeId } = message.payload as ViewNodeWorkerPayload
    console.log('call onOpenNode:', message)
    const res = await fetch(`${ENDPOINT_BASE}/viewNode/${nodeId}`, {
      method: "POST",
      body: JSON.stringify(apiPayload),
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${message.token}`,
      }
    })
    await res.json()
    // console.log({ data })
    const response: ViewNodeWorkerResponse = { linkToOpenNode: message.linkToOpenNode, messageType: "notebook:open-node" }
    await chrome.tabs.sendMessage(sender.tab.id, response)

  })()
}

const onOpenNotebook = (message: any, sender: chrome.runtime.MessageSender) => {
  (async () => {
    // console.log({ message })
    if (message?.messageType !== 'notebook:create-notebook') return
    if (!sender.tab?.id) return console.error('Cant find tab id')

    const apiPayload = message.payload as IAssistantCreateNotebookRequestPayload
    console.log('call onOpenNotebook:', message)
    const res = await fetch(`${ENDPOINT_BASE}/assistant/createNotebook`, {
      method: "POST",
      body: JSON.stringify(apiPayload),
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${message.token}`,
      }
    })
    const data = await res.json()
    await chrome.tabs.sendMessage(sender.tab.id, { ...data, messageType: "notebook:create-notebook" })

  })()
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MAIN_MENUITEM_ID,
    title: "1Cademy Assistant",
    contexts: ["selection"]
  })

  for (const menuItemId in menuItems) {
    const menuItem = menuItems[menuItemId];
    chrome.contextMenus.create({
      id: menuItemId,
      title: menuItem[1],
      parentId: MAIN_MENUITEM_ID,
      contexts: ["selection"]
    });
  }
})

chrome.contextMenus.onClicked.addListener(onParaphraseRequest)

chrome.runtime.onMessage.addListener(onPasteDetection)

// to detect uname from 1cademy.com
chrome.runtime.onMessage.addListener(onUnameDetection)

// to detect like or dislike on response
chrome.runtime.onMessage.addListener(onVoteDetection)

// to detect request messages from assistant chat to pass 1Cademy.com
chrome.runtime.onMessageExternal.addListener((message) => {
  if (typeof message !== "object" || message === null) return;
  if (message?.type === "NOTEBOOK_ID_TOKEN") {
    (async () => {
      await chrome.storage.local.set({
        "idToken": message.token
      });

      const tabs = await chrome.tabs.query({
        url: ["https://*.core-econ.org/*", "https://core-econ.org/*"]
      });
      for (const tab of tabs) {
        await chrome.tabs.sendMessage(tab.id!, {
          type: "RECEIVE_ID_TOKEN",
          token: message.token
        } as any);
      }
    })()
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (typeof message !== "object" || message === null) return;
  if (message?.type === "REQUEST_ID_TOKEN") {
    (async () => {
      const storageValues: {
        idToken?: string
      } = await chrome.storage.local.get("idToken") as any;

      chrome.tabs.sendMessage(sender.tab?.id!, {
        type: "RECEIVE_ID_TOKEN",
        token: storageValues.idToken
      } as any);
    })()
  }
});

// ------------------------------------1cademy asistant listener
// detect to call assistant endpoint
chrome.runtime.onMessage.addListener(onAskAssistant)

chrome.runtime.onMessage.addListener(onOpenNode)

chrome.runtime.onMessage.addListener(onOpenNotebook)

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
  if (!shortcutCommands.hasOwnProperty(command)) return;

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
    if (!_responses.length) {
      return;
    }
    const selectedText = _responses[0].result;

    await tryExecutionUsingChatGPT(selectedText, shortcutCommands[command]);
  })()
})

// sending current vote to Extension UI
chrome.runtime.onMessage.addListener((command, context) => {
  const tabId = context?.tab?.id || 0;
  if (!["current-vote"].includes(command)) {
    return;
  }

  return (async () => {
    let currentVote: boolean | null;
    const storageValues = await chrome.storage.local.get(["current-vote"]);
    if ([undefined, null].includes(storageValues["current-vote"])) {
      currentVote = null;
    } else {
      currentVote = !!storageValues["current-vote"];
    }
    await chrome.tabs.sendMessage(tabId, "current-vote-" + JSON.stringify(currentVote))
  })();
})

// set vote to firebase
chrome.runtime.onMessage.addListener((command: string) => {
  if (!String(command).startsWith("set-vote-")) {
    return;
  }

  (async () => {
    let voterIdentifier = "";
    const storageValues = await chrome.storage.local.get([
      "voterIdentifier"
    ]);
    if (storageValues.voterIdentifier) {
      voterIdentifier = storageValues.voterIdentifier;
    } else {
      voterIdentifier = doc(
        collection(db, "assistantVoteLogs")
      ).id
      await chrome.storage.local.set({
        voterIdentifier
      });
    }

    let vote: null | boolean = null;
    try {
      vote = JSON.parse(String(command).replace(/^set\-vote\-/, ""));
    } catch (e) { }

    return (async () => {
      await chrome.storage.local.set({
        "current-vote": vote
      });

      const batch = writeBatch(db);
      const assistantVotes = await getDocs(
        query(
          collection(db, "assistantVotes"),
          where("voter", "==", voterIdentifier)
        )
      );
      if (assistantVotes.docs.length) {
        const assistantVoteRef = doc(collection(db, "assistantVotes"), assistantVotes.docs[0].id);
        batch.update(assistantVoteRef, {
          vote,
          updatedAt: Timestamp.fromDate(new Date())
        })
      } else {
        const clientInfo = await fetchClientInfo();
        const assistantVoteRef = doc(collection(db, "assistantVotes"));
        batch.set(assistantVoteRef, {
          voter: voterIdentifier,
          vote,
          clientInfo: {
            country: clientInfo?.loc || "",
            ip: clientInfo?.ip || "",
            uag: clientInfo?.uag || ""
          },
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date())
        })
      }

      batch.set(
        doc(collection(db, "assistantVoteLogs")),
        {
          voter: voterIdentifier,
          vote,
          createdAt: Timestamp.fromDate(new Date())
        }
      );

      await batch.commit();
    })();
  })();
})