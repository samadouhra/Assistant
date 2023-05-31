import { findOrCreateNotebookTab, getIdToken, setActiveTab } from "../helpers/common";
import { IAssistantMessageRequest, IAssistantMessageResponse, createChatId, createConversation, getBardPromptResponse, getBardQueryPrompt, getBardTabId, getTopicFromSelection, waitUntilBardAvailable } from "../helpers/assistant";
import { ENDPOINT_BASE, TAB_URLS } from "../utils/constants";
import { IAssistantChat, IAssistantCreateNotebookRequestPayload, IAssistantNode, IViewNodeOpenNodesPayload, ViewNodeWorkerPayload, ViewNodeWorkerResponse } from "../types";
import { db } from "../lib/firebase";
import { collection, doc, onSnapshot } from "firebase/firestore";

// to detect request messages from assistant chat to pass 1Cademy.com
export const idTokenListener = (message: any) => {
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
          type: "REQUEST_AUTHENTICATED",
          isAuthenticated: Boolean(message.token)
        } as any);
      }
    })()
  }
};

export const onAssistantActions = (message: any, sender: chrome.runtime.MessageSender) => {
  if (typeof message !== "object" || message === null) return;
  if (message?.type === "REQUEST_ID_TOKEN") {
    (async () => {
      const idToken = await getIdToken(sender.tab?.id!);
      chrome.tabs.sendMessage(sender.tab?.id!, {
        type: "REQUEST_AUTHENTICATED",
        isAuthenticated: Boolean(idToken)
      } as any);
    })()
  } else if (message?.type === "SELECT_NOTEBOOK") {
    (async () => {
      const tabId = await findOrCreateNotebookTab();
      chrome.scripting.executeScript({
        target: {
          tabId
        },
        args: [message?.type, message?.notebookId],
        func: (messageType: string, notebookId: string) => {
          const event = new CustomEvent('assistant', {
            detail: {
              type: messageType,
              notebookId
            }
          });
          window.dispatchEvent(event);
        }
      });
    })()
  } else if (message?.type === "FOCUS_NOTEBOOK") {
    (async () => {
      const tabId = await findOrCreateNotebookTab();
      await chrome.tabs.update(tabId, {
        active: true
      });
    })()
  } else if (message?.type === "GENERATE_TOPIC") {
    (async () => {
      const tabId = sender.tab?.id!;
      const topic = await getTopicFromSelection(message.selectedText);
      await chrome.tabs.sendMessage(tabId, {
        messageType: "TOPIC_GENERATED",
        topic,
        selectedText: message.selectedText
      })
    })()
  } else if(message?.type === "START_CHAT") {
    (async () => {
      const chatId = await createChatId();

      const chatRef = doc(
        collection(db, "chats"),
        chatId
      );
      const unsubscribeSnapshot = onSnapshot(chatRef, (snapshot) => {
        const chat = snapshot.data() as IAssistantChat;
        (async () => {
          const tabs = await chrome.tabs.query({
            url: TAB_URLS
          });
          for(const tab of tabs) {
            chrome.tabs.sendMessage(tab.id!, {
              type: "CHAT_SNAPSHOT",
              chatId,
              chat
            });
          }
        })();
      })

      const stopChatListener = (message: any, sender: chrome.runtime.MessageSender) => {
        if (typeof message !== "object" || message === null) return;
        if (message?.type !== "STOP_CHAT") return;
        unsubscribeSnapshot();
        chrome.runtime.onMessage.removeListener(stopChatListener);
      };
      chrome.runtime.onMessage.addListener(stopChatListener);
    })();
  }
};

export const onAskAssistant = (message: any, sender: chrome.runtime.MessageSender) => {
  (async () => {
    if (message?.messageType !== 'assistant') return
    if (!sender.tab?.id) return console.error('Cant find tab id')

    if(message.forFrontend) {
      await chrome.tabs.sendMessage(sender.tab.id, message);
      return;
    }

    const headers: any = {
      "Content-Type": "application/json"
    };
    const token = await getIdToken(sender.tab?.id);
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    console.log('token', token)
    const res = await fetch(`${ENDPOINT_BASE}/assistant`, {
      method: "POST",
      body: JSON.stringify(message.payload),
      headers
    })
    const data = await res.json()
    await chrome.tabs.sendMessage(sender.tab.id, { ...data, messageType: "assistant" })

  })()
}

export const onOpenNode = (message: any, sender: chrome.runtime.MessageSender) => {

  (async () => {
    if (message?.messageType !== 'notebook:open-node') return
    if (!sender.tab?.id) return console.error('Cant find tab id')

    const { apiPayload, nodeId } = message.payload as ViewNodeWorkerPayload
    console.log('call onOpenNode:', message)
    const token = await getIdToken(sender.tab?.id);
    const res = await fetch(`${ENDPOINT_BASE}/viewNode/${nodeId}`, {
      method: "POST",
      body: JSON.stringify(apiPayload),
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      }
    })
    await res.json()
    const response: ViewNodeWorkerResponse = { linkToOpenNode: message.linkToOpenNode, messageType: "notebook:open-node" }
    await chrome.tabs.sendMessage(sender.tab.id, response)

  })()
}

export const onOpenNodes = (message: any, sender: chrome.runtime.MessageSender) => {
  (async () => {
    if (message?.messageType !== 'notebook:open-nodes') return
    if (!sender.tab?.id) return console.error('Cant find tab id')

    const payload = message.payload as IViewNodeOpenNodesPayload
    console.log('call onOpenNodess:', message)
    const token = await getIdToken(sender.tab?.id);
    const res = await fetch(`${ENDPOINT_BASE}/viewNode/openNodes`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      }
    })
    await res.json()
    await chrome.tabs.sendMessage(sender.tab.id, { messageType: "notebook:open-nodes" })

  })()
}

export const onCreateNotebook = (message: any, sender: chrome.runtime.MessageSender) => {
  (async () => {
    if (message?.messageType !== 'notebook:create-notebook') return
    const idToken = await getIdToken(sender.tab?.id!);

    if (!idToken) return console.error('Cant find token')
    if (!sender.tab?.id) return console.error('Cant find tab id')

    const apiPayload = message.payload as IAssistantCreateNotebookRequestPayload
    console.log('call onCreateNotebook:', message)
    const token = await getIdToken(sender.tab?.id);
    const res = await fetch(`${ENDPOINT_BASE}/assistant/createNotebook`, {
      method: "POST",
      body: JSON.stringify(apiPayload),
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      }
    })
    const data = await res.json()
    await chrome.tabs.sendMessage(sender.tab.id, { ...data, messageType: "notebook:create-notebook" })

  })()
}

// listener for bard assistant events
export const bardRequestListener = (message: IAssistantMessageRequest, sender: chrome.runtime.MessageSender) => {
  if(!message || !message?.type) return;
  if(message.type === "ASSISTANT_BARD_ACTION_REQUEST") {
    (async () => {
      const currentTabId = message.tabId || sender.tab?.id!
      const tabId = await getBardTabId();
      await setActiveTab(tabId);
      await waitUntilBardAvailable(tabId);
      const response = await getBardPromptResponse(tabId, message.message as string);
      setTimeout(async () => {
        await setActiveTab(currentTabId);
      }, 1500);
      const conversationId = message.conversationId || await createConversation();
      console.log({conversationId})
      chrome.tabs.sendMessage(currentTabId, {
        type: "ASSISTANT_BARD_ACTION_RESPONSE",
        requestAction: message.requestAction,
        message: response,
        nodes: message.nodes,
        selection: message.selection,
        conversationId
      } as IAssistantMessageResponse);
    })();
  } else if(message.type === "ASSISTANT_ONE_ACTION_COMMAND_REQUEST") {
    (async () => {
      const token = await getIdToken(message.tabId || sender.tab?.id!);
      const headers: any = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`${ENDPOINT_BASE}/bardQuery`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          commands: message.commands
        })
      });
      const _response = await response.json() as {
        nodes: IAssistantNode[]
      };
      const conversationId = message.conversationId || await createConversation();
      console.log({conversationId})

      chrome.tabs.sendMessage(message.tabId || sender.tab?.id!, {
        type: "ASSISTANT_ONE_ACTION_COMMAND_RESPONSE",
        requestAction: message.requestAction,
        message: _response,
        selection: message.selection,
        conversationId
      } as IAssistantMessageResponse);
    })();
  }
};

