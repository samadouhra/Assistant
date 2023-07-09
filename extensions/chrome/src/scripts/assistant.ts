import {
  findOrCreateNotebookTab,
  getIdToken,
  setActiveTab,
} from '../helpers/common'
import {
  IAssistantMessageRequest,
  IAssistantMessageResponse,
  IAssistantNode,
  combineContent,
  createConversation,
  findPossibleReferenceFromList,
  getBardPromptResponse,
  getBardQueryPrompt,
  getBardTabId,
  getFlashcards,
  getNotebooks,
  getReferenceNodes,
  getTopic,
  proposeFlashcard,
  waitUntilBardAvailable,
} from '../helpers/assistant'
import { ENDPOINT_BASE } from '../utils/constants'
import {
  Flashcard,
  IAssistantCreateNotebookRequestPayload,
  IViewNodeOpenNodesPayload,
  NodeLinkType,
  ViewNodeWorkerPayload,
  ViewNodeWorkerResponse,
} from '../types'

// to detect request messages from assistant chat to pass 1Cademy.com
export const idTokenListener = (message: any) => {
  if (typeof message !== 'object' || message === null) return
  if (message?.type === 'NOTEBOOK_ID_TOKEN') {
    ;(async () => {
      await chrome.storage.local.set({
        idToken: message.token,
      })

      const tabs = await chrome.tabs.query({
        url: ['https://*.core-econ.org/*', 'https://core-econ.org/*'],
      })
      for (const tab of tabs) {
        await chrome.tabs.sendMessage(tab.id!, {
          type: 'REQUEST_AUTHENTICATED',
          isAuthenticated: Boolean(message.token),
        } as any)
      }
    })()
  }
}

export const onAssistantActions = (
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void
) => {
  if (typeof message !== 'object' || message === null) return
  if (message?.type === 'REQUEST_ID_TOKEN') {
    (async () => {
      const idToken = await getIdToken(sender.tab?.id!)
      chrome.tabs.sendMessage(sender.tab?.id!, {
        type: 'REQUEST_AUTHENTICATED',
        isAuthenticated: Boolean(idToken),
      } as any);
      chrome.tabs.sendMessage(sender.tab?.id!, {
        type: 'NOTEBOOK_ID_TOKEN',
        token: idToken,
      } as any);
    })()
  } else if (message?.type === 'SELECT_NOTEBOOK') {
    ;(async () => {
      const tabId = await findOrCreateNotebookTab()
      chrome.scripting.executeScript({
        target: {
          tabId,
        },
        args: [message?.type, message?.notebookId],
        func: (messageType: string, notebookId: string) => {
          const event = new CustomEvent('assistant', {
            detail: {
              type: messageType,
              notebookId,
            },
          })
          window.dispatchEvent(event)
        },
      })
    })()
  } else if (message?.type === 'FOCUS_NOTEBOOK') {
    ;(async () => {
      const tabId = await findOrCreateNotebookTab()
      await chrome.tabs.update(tabId, {
        active: true,
      })
    })()
  } else if (message?.type === 'FETCH_FLASHCARDS') {
    ;(async () => {
      const flashcards = await getFlashcards(message?.selection, sender.url!)
      const tabId = sender.tab?.id!
      await chrome.tabs.sendMessage(tabId, {
        type: 'FLASHCARDS_RESPONSE',
        flashcards,
        selection: message?.selection,
      })
    })()
  } else if (message?.type === 'START_PROPOSING') {
    ;(async () => {
      const bookTabId = sender.tab?.id!
      const tabId = await findOrCreateNotebookTab()
      let notebooks: any = []
      while (!notebooks.length) {
        notebooks = await getNotebooks(tabId)
      }
      await chrome.tabs.sendMessage(bookTabId, {
        type: 'LOADING_COMPLETED',
      })
      await chrome.tabs.update(tabId, {
        active: true,
      })

      console.log({ message, tabId }, 'START_PROPOSING')
      const response = await chrome.tabs.sendMessage(tabId, {
        ...message,
        tabId: bookTabId,
        notebooks,
      })
    })()
  } else if (
    message?.type === 'PROPOSE_IMPROVEMENT' ||
    message?.type === 'PROPOSE_IMPROVEMENT_COMBINE'
  ) {
    ;(async () => {
      const bookTabId: number = message?.bookTabId!
      const notebookTabId: number = sender.tab?.id!
      const bookTab = await chrome.tabs.get(bookTabId)
      const bookUrl = String(bookTab.url)
      const referenceNodes = await getReferenceNodes(bookUrl)
      const referenceNode = findPossibleReferenceFromList(
        bookUrl,
        referenceNodes
      )
      if (message?.type === 'PROPOSE_IMPROVEMENT_COMBINE') {
        message.title = await combineContent([
          message.selectedNode.title,
          message.flashcard.title,
        ])

        message.content = await combineContent([
          message.selectedNode.content,
          message.flashcard.content,
        ])
      }
      await chrome.tabs.sendMessage(notebookTabId, {
        type: 'LOADING_COMPLETED',
      })
      await chrome.scripting.executeScript({
        target: {
          tabId: notebookTabId,
        },
        args: [message, referenceNode, bookUrl],
        func: (
          message: any,
          referenceNode: NodeLinkType | undefined,
          bookUrl: string
        ) => {
          const editorEvent = new CustomEvent('assistant', {
            detail: {
              type: 'IMPROVEMENT',
              selectedNode: message.selectedNode,
              flashcard: message.flashcard,
              title: message.flashcard?.title,
              content: message.flashcard?.content,
              referenceNode,
              bookUrl,
            },
          })
          window.dispatchEvent(editorEvent)
        },
      })
    })()
  } else if (message?.type === 'PROPOSE_CHILD') {
    ;(async () => {
      const bookTabId: number = message?.bookTabId!
      const notebookTabId: number = sender.tab?.id!
      const bookTab = await chrome.tabs.get(bookTabId)
      const bookUrl = String(bookTab.url)
      const referenceNodes = await getReferenceNodes(bookUrl)
      const referenceNode = findPossibleReferenceFromList(
        bookUrl,
        referenceNodes
      )
      await chrome.tabs.sendMessage(notebookTabId, {
        type: 'LOADING_COMPLETED',
      })
      await chrome.scripting.executeScript({
        target: {
          tabId: notebookTabId,
        },
        args: [message, referenceNode, bookUrl],
        func: (
          message: any,
          referenceNode: NodeLinkType | undefined,
          bookUrl: string
        ) => {
          console.log('proposing a child', {
            type: 'CHILD',
            selectedNode: message.selectedNode,
            flashcard: message.flashcard,
            title: message.flashcard?.title,
            content: message.flashcard?.content,
            referenceNode,
            bookUrl: message.flashcard.link ? message.flashcard.link : bookUrl,
          })
          const editorEvent = new CustomEvent('assistant', {
            detail: {
              type: 'CHILD',
              selectedNode: message.selectedNode,
              flashcard: message.flashcard,
              title: message.flashcard?.title,
              content: message.flashcard?.content,
              referenceNode,
              bookUrl,
            },
          })
          window.dispatchEvent(editorEvent)
        },
      })
    })()
  } else if (message?.type === 'PROPOSE_FLASHCARD') {
    ;(async () => {
      const bookTabId: number = message?.bookTabId!
      const bookTab = await chrome.tabs.get(bookTabId)
      const bookUrl = String(bookTab.url)
      const flashcard = message?.flashcard as Flashcard

      await proposeFlashcard({
        passageId: flashcard.passageId,
        url: bookUrl,
        token: message?.token,
        title: flashcard.title,
        version: message?.proposal!,
        node: message?.node,
        flashcard,
      })
    })()
  } else if (message?.type === 'CREATE_NOTEBOOK') {
    ;(async () => {
      const tabId = sender.tab?.id!
      const idToken = await getIdToken(tabId)
      // api/assistant/createNotebook
      const headers: any = {
        'Content-Type': 'application/json',
      }
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`
      }
      const res = await fetch(`${ENDPOINT_BASE}/assistant/createNotebook`, {
        method: 'POST',
        body: JSON.stringify({ title: message?.payload?.message }),
        headers,
      })
      const data = await res.json()
      const notebooks = await getNotebooks(tabId)
      console.log(
        { ...data, notebooks, type: 'CREATE_NOTEBOOK' },
        'notebooks getNotebooks'
      )
      await chrome.tabs.sendMessage(tabId, {
        ...data,
        notebooks,
        type: 'CREATE_NOTEBOOK',
      })
    })()
  } else if (message?.type === 'BackToBook') {
    ;(async () => {
      await chrome.tabs.update(message?.bookTabId, {
        active: true,
      })
    })()
  } else if (message?.type === 'OPEN_NODE') {
    ;(async () => {
      const tabId = await findOrCreateNotebookTab()
      await chrome.tabs.update(tabId, {
        active: true,
      })

      await chrome.scripting.executeScript({
        target: {
          tabId: tabId,
        },
        args: [message],
        func: (message: any) => {
          const editorEvent = new CustomEvent('assistant', {
            detail: {
              type: 'OPEN_NODE',
              nodeId: message?.nodeId,
            },
          })
          window.dispatchEvent(editorEvent)
        },
      })
    })()
  } else if (message?.type === 'CLEAR') {
    ;(async () => {
      const tabId = await findOrCreateNotebookTab()
      await chrome.tabs.update(tabId, {
        active: true,
      })

      await chrome.scripting.executeScript({
        target: {
          tabId: tabId,
        },
        args: [],
        func: () => {
          const editorEvent = new CustomEvent('assistant', {
            detail: {
              type: 'CLEAR',
            },
          })
          window.dispatchEvent(editorEvent)
        },
      })
    })()
  }
  sendResponse({ response: 'Response data' })
}

export const onAskAssistant = (
  message: any,
  sender: chrome.runtime.MessageSender
) => {
  ;(async () => {
    if (message?.messageType !== 'assistant') return
    if (!sender.tab?.id) return console.error('Cant find tab id')

    const headers: any = {
      'Content-Type': 'application/json',
    }
    const token = await getIdToken(sender.tab?.id)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    console.log('token', token)
    const res = await fetch(`${ENDPOINT_BASE}/assistant`, {
      method: 'POST',
      body: JSON.stringify({ url: sender.tab?.url, ...message.payload }),
      headers,
    })
    const data = await res.json()
    await chrome.tabs.sendMessage(sender.tab.id, {
      ...data,
      messageType: 'assistant',
    })
  })()
}

export const onOpenNode = (
  message: any,
  sender: chrome.runtime.MessageSender
) => {
  ;(async () => {
    if (message?.messageType !== 'notebook:open-node') return
    if (!sender.tab?.id) return console.error('Cant find tab id')

    const { apiPayload, nodeId } = message.payload as ViewNodeWorkerPayload
    console.log('call onOpenNode:', message)
    const token = await getIdToken(sender.tab?.id)
    const res = await fetch(`${ENDPOINT_BASE}/viewNode/${nodeId}`, {
      method: 'POST',
      body: JSON.stringify(apiPayload),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    await res.json()
    const response: ViewNodeWorkerResponse = {
      linkToOpenNode: message.linkToOpenNode,
      messageType: 'notebook:open-node',
    }
    await chrome.tabs.sendMessage(sender.tab.id, response)
  })()
}

export const onOpenNodes = (
  message: any,
  sender: chrome.runtime.MessageSender
) => {
  ;(async () => {
    if (message?.messageType !== 'notebook:open-nodes') return
    if (!sender.tab?.id) return console.error('Cant find tab id')

    const payload = message.payload as IViewNodeOpenNodesPayload
    console.log('call onOpenNodess:', message)
    const token = await getIdToken(sender.tab?.id)
    const res = await fetch(`${ENDPOINT_BASE}/viewNode/openNodes`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    await res.json()
    await chrome.tabs.sendMessage(sender.tab.id, {
      messageType: 'notebook:open-nodes',
    })
  })()
}

export const onCreateNotebook = (
  message: any,
  sender: chrome.runtime.MessageSender
) => {
  (async () => {
    if (message?.messageType !== 'notebook:create-notebook') return
    const idToken = await getIdToken(sender.tab?.id!)

    if (!idToken) return console.error('Cant find token')
    if (!sender.tab?.id) return console.error('Cant find tab id')

    const apiPayload = message.payload as IAssistantCreateNotebookRequestPayload
    console.log('call onCreateNotebook:', message)
    const token = await getIdToken(sender.tab?.id)
    const res = await fetch(`${ENDPOINT_BASE}/assistant/createNotebook`, {
      method: 'POST',
      body: JSON.stringify(apiPayload),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json()
    await chrome.tabs.sendMessage(sender.tab.id, {
      ...data,
      messageType: 'notebook:create-notebook',
    })
  })()
}

// listener for bard assistant events
export const bardRequestListener = (
  message: IAssistantMessageRequest,
  sender: chrome.runtime.MessageSender
) => {
  if (!message || !message?.type) return
  if (message.type === 'ASSISTANT_BARD_ACTION_REQUEST') {
    ;(async () => {
      const currentTabId = message.tabId || sender.tab?.id!
      const tabId = await getBardTabId()
      await setActiveTab(tabId)
      await waitUntilBardAvailable(tabId)
      const response = await getBardPromptResponse(
        tabId,
        message.message as string
      )
      setTimeout(async () => {
        await setActiveTab(currentTabId)
      }, 1500)
      const conversationId =
        message.conversationId || (await createConversation())
      console.log({ conversationId })
      chrome.tabs.sendMessage(currentTabId, {
        type: 'ASSISTANT_BARD_ACTION_RESPONSE',
        requestAction: message.requestAction,
        message: response,
        nodes: message.nodes,
        selection: message.selection,
        conversationId,
      } as IAssistantMessageResponse)
    })()
  } else if (message.type === 'ASSISTANT_ONE_ACTION_COMMAND_REQUEST') {
    ;(async () => {
      const token = await getIdToken(message.tabId || sender.tab?.id!)
      const headers: any = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const response = await fetch(`${ENDPOINT_BASE}/bardQuery`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          commands: message.commands,
        }),
      })
      const _response = (await response.json()) as {
        nodes: IAssistantNode[]
      }
      const conversationId =
        message.conversationId || (await createConversation())
      console.log({ conversationId })

      chrome.tabs.sendMessage(message.tabId || sender.tab?.id!, {
        type: 'ASSISTANT_ONE_ACTION_COMMAND_RESPONSE',
        requestAction: message.requestAction,
        message: _response,
        selection: message.selection,
        conversationId,
      } as IAssistantMessageResponse)
    })()
  }
}
