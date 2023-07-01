import React, { forwardRef, useImperativeHandle } from 'react'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { CustomAvatar } from './CustomAvatar'
import { DESIGN_SYSTEM_COLORS } from '../../utils/colors'
import {
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  SxProps,
  Typography,
} from '@mui/material'
import {
  ActionVariant,
  CreateNotebookWorkerResponse,
  Flashcard,
  IAssistantCreateNotebookRequestPayload,
  IAssistantRequestPayload,
  IAssistantResponse,
  IViewNodeOpenNodesPayload,
  Message,
  MessageAction,
  MessageData,
  NodeAssistantResponse,
  NodeLinkType,
  Notebook,
  TAssistantNotebookMessage,
  TAssistantResponseMessage,
  TNode,
  ViewNodeWorkerResponse,
} from '../../types'
import { NodeLink } from './NodeLink'
import {
  ASSISTANT_NAME,
  CHAT_BACKGROUND_IMAGE_URL,
  LOGO_URL,
  NOTEBOOK_LINK,
  USER_NAME,
} from '../../utils/constants'
import { useTheme } from '../../hooks/useTheme'
import { getCurrentDateYYMMDD, getCurrentHourHHMM } from '../../utils/date'
import { Theme } from '@mui/system'
import { generateRandomId } from '../../utils/others'
import {
  generateBackToReadingMessage,
  generateConfirmContinueWithPotentialNodeMessage,
  generateConfirmNodeSelection,
  generateContinueDisplayingNodeMessage,
  generateExitPotentialNodesMessage,
  generateExplainSelectedText,
  generateImprovementTypeSelectorMessage,
  generateInputNotebookNameMessage,
  generateNodeDiscoverMessage,
  generateNodeKeepSelectionMessage,
  generateNodeMessage,
  generateNodeProposeMessage,
  generateNodeSelectorMessage,
  generateNotebookIntro,
  generateNotebookListMessage,
  generateParentDiscoverMessage,
  generateProposeChildConfirmation,
  generateProposeImprovementConfirmation,
  generateSearchNodeMessage,
  generateStartProposeChildConfirmation,
  generateTopicMessage,
  generateTopicNotFound,
  generateUserActionAnswer,
  generateWhereContinueExplanation,
} from '../../utils/messages'
import SearchMessage from './SearchMessage'
import moment from 'moment'
import MarkdownRender from './MarkdownRender'
import { HeaderMessage } from '../ChatHeader'
import { ChatFooter } from '../ChatFooter'
import { ChatStickyMessage } from '../ChatStickyMessage'
import { PieChart } from '../Charts/PieComponent'
import { INotebook } from '../../types/INotebook'

const tempMap = (variant: string): ActionVariant => {
  if (variant === 'outline') return 'outlined'
  return 'contained'
}

type ChatProps = {
  conversationId: string
  setConversationId: (conversationId: string) => void
  setDisplayAssistant: (display: boolean) => void
  flashcards: Flashcard[]
  setFlashcards: any
  currentFlashcard: Flashcard | undefined
  setCurrentFlashcard: any
  notebooks: INotebook[]
  setNotebooks: any
  // setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  selectedText: string
  isLoading: boolean
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  isAuthenticated: boolean
  sx?: SxProps<Theme>
  isAuthenticatedRef: {
    current: boolean
  }
  selecteSidebar: boolean
}

export const Chat = forwardRef(
  (
    {
      conversationId,
      setConversationId,
      setDisplayAssistant,
      flashcards,
      setFlashcards,
      currentFlashcard,
      setCurrentFlashcard,
      notebooks,
      setNotebooks,
      selectedText,
      isLoading,
      setIsLoading,
      isAuthenticated,
      isAuthenticatedRef,
      sx,
      selecteSidebar,
    }: ChatProps,
    ref
  ) => {
    const [notebook, setNotebook] = useState<Notebook | null>(null)
    const [messagesObj, setMessagesObj] = useState<Message[]>([])
    const [speakingMessageId, setSpeakingMessageId] = useState<string>('')
    const chatElementRef = useRef<HTMLDivElement | null>(null)
    const [nodesToBeDisplayed, setNodesToBeDisplayed] = useState<
      NodeLinkType[]
    >([])
    const [tmpNodesToBeDisplayed, setTmpNodesToBeDisplayed] = useState<
      NodeLinkType[]
    >([])
    const { mode } = useTheme()
    const [userMessage, setUserMessage] = useState('')
    // to store number during proposing nodes
    const [nodeIdx, setNodeIdx] = useState<number>(0)
    const [nodeSelection, setNodeSelection] = useState<
      'Parent' | 'Child' | 'Improvement' | null
    >(null)
    const [selectedNode, setSelectedNode] = useState<TNode | null>(null)
    const [creatingNotebook, setCreatingNotebook] = useState<boolean>(false)
    const [bookTabId, setBookTabId] = useState<number>(0)

    const pushMessage = useCallback(
      (message: MessageData, currentDateYYMMDD: string) => {
        // dont add empty message
        if (!message.content) return

        setMessagesObj((prev) => {
          if (prev.length === 0)
            return [{ date: currentDateYYMMDD, messages: [message] }]
          const res = prev.reduce(
            (acu: { found: boolean; result: Message[] }, cur) => {
              if (cur.date === currentDateYYMMDD)
                return {
                  found: true,
                  result: [
                    ...acu.result,
                    { ...cur, messages: [...cur.messages, message] },
                  ],
                }
              return { ...acu, result: [...acu.result, cur] }
            },
            { found: false, result: [] }
          )
          // console.log("pushMessage", { res })
          const newMessageObj: Message[] = res.found
            ? res.result
            : [...res.result, { date: currentDateYYMMDD, messages: [message] }]
          return newMessageObj
        })

        if (message.type === 'WRITER') {
          setTimeout(() => {
            scrollToTheEnd()
          }, 500)
        }
      },
      []
    )

    const resetChat = useCallback(() => {
      setNotebook(null)
      setMessagesObj([])
      setSpeakingMessageId('')
      setNodesToBeDisplayed([])
      setTmpNodesToBeDisplayed([])
      setUserMessage('')
      setNodeIdx(0)
    }, [
      setNotebook,
      setMessagesObj,
      setSpeakingMessageId,
      setNodesToBeDisplayed,
      setTmpNodesToBeDisplayed,
      setUserMessage,
      setNodeIdx,
    ])

    useImperativeHandle(
      ref,
      () => {
        return {
          pushMessage,
          resetChat,
          setCreatingNotebook,
          setNotebook,
          setBookTabId,
        }
      },
      [pushMessage, setNotebook, setCreatingNotebook, setBookTabId]
    )

    const removeActionOfAMessage = (messageId: string, date: string) => {
      const removeActionOFMessage = (message: MessageData): MessageData =>
        message.id === messageId ? { ...message, actions: [] } : message
      setMessagesObj((prev) =>
        prev.map((cur) =>
          cur.date === date
            ? { ...cur, messages: cur.messages.map(removeActionOFMessage) }
            : cur
        )
      )
      // idMessage
    }

    const onPushAssistantMessage = (newMessage: IAssistantResponse) => {
      const currentDateYYMMDD = getCurrentDateYYMMDD()
      const message: MessageData = mapAssistantResponseToMessage(newMessage)
      pushMessage(message, currentDateYYMMDD)
    }

    const onPushUserMessage = (userMessage: string) => {
      const currentDateYYMMDD = getCurrentDateYYMMDD()
      const message = mapUserMessageToMessage(userMessage)
      pushMessage(message, currentDateYYMMDD)
    }

    const onSubmitMessage = useCallback(async () => {
      if (isLoading) return
      const userMessageProcessed = userMessage.trim()
      if (!userMessageProcessed) return

      setIsLoading(true)
      if (creatingNotebook) {
        chrome.runtime.sendMessage(
          chrome.runtime.id || process.env.EXTENSION_ID,
          {
            payload: {
              message: userMessageProcessed,
            },
            type: 'CREATE_NOTEBOOK',
          }
        )
        onPushUserMessage(userMessageProcessed)
        setUserMessage('')
        return
      }
      onPushUserMessage(userMessageProcessed)
      const payload: IAssistantRequestPayload = {
        actionType: 'DirectQuestion',
        message: userMessageProcessed,
        conversationId,
      }
      chrome.runtime.sendMessage(
        chrome.runtime.id || process.env.EXTENSION_ID,
        {
          payload,
          messageType: 'assistant',
        }
      )

      setUserMessage('')
    }, [isLoading, userMessage, conversationId, creatingNotebook])

    const scrollToTheEnd = () => {
      if (!chatElementRef.current) return
      chatElementRef.current.scrollTop = chatElementRef.current.scrollHeight
    }

    const onLoadNextNodeToBeDisplayed = useCallback(() => {
      if (!chatElementRef.current) return

      const scrollTop = chatElementRef.current.scrollTop
      const scrollHeight = chatElementRef.current.scrollHeight
      const clientHeight = chatElementRef.current.clientHeight

      const scrollDistanceFromTop = scrollTop + clientHeight
      const distanceToBottom = scrollHeight - scrollDistanceFromTop

      const threshold = 0.1 // 10% of the element's height
      const thresholdValue = threshold * scrollHeight

      if (distanceToBottom < thresholdValue) {
        // User is close to the bottom of the element
        // console.log('Scroll is near to the end!.', nodesToBeDisplayed.length);
        if (nodesToBeDisplayed.length < 0) return
        onDisplayNextNodeToBeDisplayed(nodesToBeDisplayed)
      }
    }, [nodesToBeDisplayed])

    const narrateMessage = useCallback((id: string, message: string) => {
      console.log('narrateMessage', { message })
      if (!window.speechSynthesis.speaking) {
        const msg = new SpeechSynthesisUtterance(message)
        window.speechSynthesis.speak(msg)
        setSpeakingMessageId(id)
        msg.onend = () => {
          setSpeakingMessageId('')
        }
      } else {
        window.speechSynthesis.cancel()
        setSpeakingMessageId('')
      }
    }, [])

    const nextFlashcard = useCallback((delay = 500) => {
      setFlashcards((flashcards: any[]) => {
        // end potential nodes flow
        if (!flashcards.length) {
          pushMessage(generateBackToReadingMessage(), getCurrentDateYYMMDD())
          setTimeout(scrollToTheEnd, 1000)
          return
        }

        let newFlashcards = [...flashcards]
        const flashcard = newFlashcards.shift()
        const flashcardEvent = new CustomEvent('flashcard-start', {
          detail: {
            flashcard,
          },
        })
        // adding node message with delay to look good
        setTimeout(() => {
          window.dispatchEvent(flashcardEvent)
          setTimeout(scrollToTheEnd, 500)
        }, delay)
        return newFlashcards
      })
      setNodeIdx((nodeIdx) => nodeIdx + 1)
    }, [])

    const onDisplayNextNodeToBeDisplayed = (
      nodesToBeDisplayed: NodeLinkType[]
    ) => {
      // console.log({ nodesToBeDisplayed })
      const copyNodesToBeDisplayed = [...nodesToBeDisplayed]
      const firstElement = copyNodesToBeDisplayed.shift()
      if (!firstElement) return
      pushMessage(generateNodeMessage(firstElement), getCurrentDateYYMMDD())
      const thereIsNextNode = Boolean(copyNodesToBeDisplayed.length)
      if (firstElement.unit) {
        pushMessage(
          generateContinueDisplayingNodeMessage(
            firstElement.title,
            firstElement.unit,
            thereIsNextNode,
            firstElement.practice
            // TODO: after map practice into a node, send practice property and add PieChart
            // { answered: firstElement, totalQuestions: 10 },
            // <PieChart answers={2} questions={10} />
          ),
          getCurrentDateYYMMDD()
        )
      }
      setNodesToBeDisplayed(copyNodesToBeDisplayed)
    }

    const getAction = (
      messageId: string,
      date: string,
      action: MessageAction,
      request?: string
    ) => {
      if (
        !notebook &&
        [
          'LOCAL_OPEN_NOTEBOOK',
          'LOCAL_CONTINUE_EXPLANATION_HERE',
          'IllContribute',
          'GeneralExplanation',
        ].includes(action.type)
      )
        return null

      let onClick = undefined
      if (action.type === 'LOCAL_OPEN_NOTEBOOK') {
        onClick = () => {
          console.log('-> Open Notebook', notebook)
          const messageWithSelectedAction = generateUserActionAnswer(
            action.title
          )
          pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD())
          removeActionOfAMessage(messageId, date)
          // window.open(`${NOTEBOOKS_LINK}/${notebookId}`, '_blank')?.focus();

          // open all nodes
          const payload: IViewNodeOpenNodesPayload = {
            nodeIds: tmpNodesToBeDisplayed.map((c) => c.id),
            notebookId: notebook ? notebook.id : '',
            visible: true,
          }
          chrome.runtime.sendMessage(
            chrome.runtime.id || process.env.EXTENSION_ID,
            {
              payload,
              messageType: 'notebook:open-nodes',
            }
          )

          setTmpNodesToBeDisplayed([])
          chrome.runtime.sendMessage(chrome.runtime.id, {
            type: 'SELECT_NOTEBOOK',
            notebookId: notebook ? notebook.id : '',
          })
          chrome.runtime.sendMessage(chrome.runtime.id, {
            type: 'FOCUS_NOTEBOOK',
          })
        }
      }

      if (action.type === 'LOCAL_CONTINUE_EXPLANATION_HERE') {
        onClick = () => {
          console.log('-> Continue explanation here', tmpNodesToBeDisplayed)
          const messageWithSelectedAction = generateUserActionAnswer(
            action.title
          )

          // open all nodes
          const payload: IViewNodeOpenNodesPayload = {
            nodeIds: tmpNodesToBeDisplayed.map((c) => c.id),
            notebookId: notebook ? notebook.id : '',
            visible: true,
          }
          chrome.runtime.sendMessage(
            chrome.runtime.id || process.env.EXTENSION_ID,
            {
              payload,
              messageType: 'notebook:open-nodes',
            }
          )

          pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD())
          onDisplayNextNodeToBeDisplayed(tmpNodesToBeDisplayed)
          setTmpNodesToBeDisplayed([])
          removeActionOfAMessage(messageId, date)
        }
      }

      if (action.type === 'IllContribute') {
        onClick = () => {
          console.log('-> IllContribute')
          const messageWithSelectedAction = generateUserActionAnswer(
            action.title
          )
          pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD())
          setTmpNodesToBeDisplayed([])
          removeActionOfAMessage(messageId, date)
          if (notebook) {
            chrome.runtime.sendMessage(chrome.runtime.id, {
              type: 'SELECT_NOTEBOOK',
              notebookId: notebook.id,
            })
            chrome.runtime.sendMessage(chrome.runtime.id, {
              type: 'FOCUS_NOTEBOOK',
            })
          } else {
            chrome.runtime.sendMessage(chrome.runtime.id, {
              type: 'FOCUS_NOTEBOOK',
            })
          }
        }
      }

      if (action.type === 'GeneralExplanation') {
        onClick = () => {
          console.log('-> GeneralExplanation')
          const messageWithSelectedAction = generateUserActionAnswer(
            action.title
          )
          pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD())
          setTmpNodesToBeDisplayed([])
          removeActionOfAMessage(messageId, date)
          // TODO: sendMessage to service worker
          const payload: IAssistantRequestPayload = {
            actionType: 'GeneralExplanation',
            message: request ?? '',
            conversationId,
          }
          chrome.runtime.sendMessage(
            chrome.runtime.id || process.env.EXTENSION_ID,
            {
              payload,
              messageType: 'assistant',
            }
          )
          setIsLoading(true)
        }
      }

      if (action.type === 'ProposeIt') {
        onClick = () => {
          setIsLoading(true)
          setFlashcards((flashcards: any) => {
            chrome.runtime.sendMessage({
              type: 'START_PROPOSING',
              flashcards,
              request,
              selection: request,
              notebooks: [],
              tabId: 0,
              selecteSidebar: false,
            } as TAssistantNotebookMessage)
            return flashcards
          })
          // starting to propose
          console.log('-> ProposeIt')
        }
      }

      if (action.type === 'TeachContent') {
        onClick = () => {
          console.log('-> TeachContent')
          const payload: IAssistantRequestPayload = {
            actionType: 'TeachContent',
            message: request! || selectedText,
          }
          chrome.runtime.sendMessage(
            chrome.runtime.id || process.env.EXTENSION_ID,
            {
              payload,
              messageType: 'assistant',
            }
          )
          pushMessage(
            generateExplainSelectedText(request! || selectedText),
            getCurrentDateYYMMDD()
          )
          setIsLoading(true)
        }
      }

      if (action.type === 'ChooseNotebook') {
        onClick = () => {
          console.log('-> ChooseNotebook')
          pushMessage(
            generateNotebookListMessage(request! || selectedText, notebooks),
            getCurrentDateYYMMDD()
          )
          setTimeout(scrollToTheEnd, 1000)
        }
      }

      if (action.type === 'NotebookSelected') {
        onClick = () => {
          console.log('-> NotebookSelected')
          const notebook = action?.data?.notebook as INotebook
          setNotebook({
            id: notebook.documentId!,
            name: notebook.title,
          })

          const messageWithSelectedAction = generateUserActionAnswer(
            notebook.title
          )
          pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD())
          removeActionOfAMessage(messageId, date)

          pushMessage(
            generateNotebookIntro(flashcards, selecteSidebar),
            getCurrentDateYYMMDD()
          )
          setTimeout(scrollToTheEnd, 1000)

          setNodeIdx(0)
          nextFlashcard(2000)
        }
      }

      if (action.type === 'ChatNotebookCreate') {
        onClick = () => {
          console.log('-> ChatNotebookCreate')
          setCreatingNotebook(true)
          pushMessage(
            generateInputNotebookNameMessage(),
            getCurrentDateYYMMDD()
          )
          setTimeout(scrollToTheEnd, 1000)
        }
      }

      if (action.type === 'ContinueNodeSelection') {
        onClick = () => {
          console.log('-> ContinueNodeSelection')

          const messageWithSelectedAction = generateUserActionAnswer(
            action.title
          )
          pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD())
          removeActionOfAMessage(messageId, date)

          pushMessage(
            generateNodeKeepSelectionMessage(),
            getCurrentDateYYMMDD()
          )
          setTimeout(scrollToTheEnd, 1000)
        }
      }

      if (
        action.type === 'ProposeImprovementConfirm' ||
        action.type === 'ProposeChidParentConfirm'
      ) {
        onClick = () => {
          console.log('-> ' + action.type)

          const messageWithSelectedAction = generateUserActionAnswer(
            action.title
          )
          pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD())
          removeActionOfAMessage(messageId, date)

          setNodeSelection(
            action.type === 'ProposeImprovementConfirm'
              ? 'Improvement'
              : 'Parent'
          )
          pushMessage(generateNodeSelectorMessage(), getCurrentDateYYMMDD())
          setTimeout(scrollToTheEnd, 1000)
        }
      }

      if (action.type === 'StartSkipOrCancel') {
        onClick = () => {
          console.log('-> StartSkipOrCancel')

          const messageWithSelectedAction = generateUserActionAnswer(
            action.title
          )
          pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD())
          removeActionOfAMessage(messageId, date)

          pushMessage(
            generateConfirmContinueWithPotentialNodeMessage(),
            getCurrentDateYYMMDD()
          )
          setTimeout(scrollToTheEnd, 1000)
        }
      }

      if (action.type === 'BackToBook') {
        onClick = () => {
          console.log('-> BackToBook')
          resetChat()
          setDisplayAssistant(false)
          chrome.runtime.sendMessage({
            type: 'BackToBook',
            bookTabId,
          })
        }
      }

      if (action.type === 'CompleteChat') {
        onClick = () => {
          console.log('-> CompleteChat')
          resetChat()
          setDisplayAssistant(false)
        }
      }

      if (action.type === 'ConfirmNodeSelection') {
        onClick = () => {
          console.log('-> ConfirmNodeSelection', nodeSelection)
          setSelectedNode(action.data.node)

          const messageWithSelectedAction = generateUserActionAnswer(
            action.title
          )
          pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD())
          removeActionOfAMessage(messageId, date)

          if (nodeSelection === 'Improvement') {
            pushMessage(
              generateProposeImprovementConfirmation(action.data.node),
              getCurrentDateYYMMDD()
            )
          } else if (nodeSelection === 'Parent') {
            pushMessage(
              generateProposeChildConfirmation(action.data.node),
              getCurrentDateYYMMDD()
            )
          }
          setNodeSelection(null)
          setTimeout(scrollToTheEnd, 1000)
        }
      }

      if (action.type === 'StartProposeImprovement') {
        onClick = () => {
          console.log('-> StartProposeImprovement')

          const messageWithSelectedAction = generateUserActionAnswer(
            action.title
          )
          pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD())
          removeActionOfAMessage(messageId, date)

          pushMessage(
            generateImprovementTypeSelectorMessage(),
            getCurrentDateYYMMDD()
          )
          setTimeout(scrollToTheEnd, 1000)
        }
      }

      if (
        action.type === 'ReplaceWithImprovement' ||
        action.type === 'CombineWithImprovement'
      ) {
        onClick = () => {
          console.log('-> ' + action.type)

          const messageWithSelectedAction = generateUserActionAnswer(
            action.title
          )
          pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD())
          removeActionOfAMessage(messageId, date)

          setIsLoading(true)
          chrome.runtime.sendMessage({
            type:
              action.type === 'ReplaceWithImprovement'
                ? 'PROPOSE_IMPROVEMENT'
                : 'PROPOSE_IMPROVEMENT_COMBINE',
            selectedNode: {
              id: selectedNode?.id,
              title: selectedNode?.title,
              content: selectedNode?.content,
            },
            flashcard: currentFlashcard,
            bookTabId,
          })
        }
      }

      if (action.type === 'StartChildProposal') {
        onClick = () => {
          console.log('-> StartChildProposal')

          const messageWithSelectedAction = generateUserActionAnswer(
            action.title
          )
          pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD())
          removeActionOfAMessage(messageId, date)

          pushMessage(
            generateStartProposeChildConfirmation(),
            getCurrentDateYYMMDD()
          )
          setTimeout(scrollToTheEnd, 1000)
        }
      }

      if (action.type === 'StartProposeChild') {
        onClick = () => {
          console.log('-> StartProposeChild')

          const messageWithSelectedAction = generateUserActionAnswer(
            action.title
          )
          pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD())
          removeActionOfAMessage(messageId, date)

          setIsLoading(true)
          chrome.runtime.sendMessage({
            type: 'PROPOSE_CHILD',
            selectedNode: {
              id: selectedNode?.id,
              title: selectedNode?.title,
              content: selectedNode?.content,
            },
            flashcard: currentFlashcard,
            bookTabId,
            selecteSidebar,
          })
        }
      }

      if (action.type === 'ProceedPotentialNodes') {
        onClick = () => {
          console.log('-> ProceedPotentialNodes')

          const messageWithSelectedAction = generateUserActionAnswer(
            action.title
          )
          pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD())
          removeActionOfAMessage(messageId, date)

          nextFlashcard(500)
          setTimeout(scrollToTheEnd, 1000)
        }
      }

      if (action.type === 'DontProceedPotentialNodes') {
        onClick = () => {
          console.log('-> DontProceedPotentialNodes')

          const messageWithSelectedAction = generateUserActionAnswer(
            action.title
          )
          pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD())
          removeActionOfAMessage(messageId, date)

          pushMessage(
            generateExitPotentialNodesMessage(),
            getCurrentDateYYMMDD()
          )
          setTimeout(scrollToTheEnd, 1000)
        }
      }

      return (
        <Button onClick={onClick} variant={action.variant} fullWidth>
          {action.title}
        </Button>
      )
    }

    useEffect(() => {
      // following listener only for non-notebook tabs
      if (window.location.href.startsWith(NOTEBOOK_LINK)) return

      const listenWorker = (
        message: (
          | IAssistantResponse
          | ViewNodeWorkerResponse
          | CreateNotebookWorkerResponse
        ) & { messageType: string }
      ) => {
        if (message.messageType === 'assistant') {
          console.log('>:message form assistant', { message })
          const { is404, request, nodes, conversationId } =
            message as IAssistantResponse
          if (is404) {
            pushMessage(
              generateTopicNotFound(request ?? '', isAuthenticatedRef.current),
              getCurrentDateYYMMDD()
            )
          } else {
            onPushAssistantMessage({
              ...(message as IAssistantResponse),
              nodes: [],
            })
            const nodesOnMessage = nodes ? nodes.map(mapNodesToNodeLink) : []
            if (!nodesOnMessage.length) return setIsLoading(false)

            setTmpNodesToBeDisplayed(nodesOnMessage)

            if (notebook) {
              // TODO: manage response when notebookId exist
              pushMessage(
                generateWhereContinueExplanation(
                  notebook.name,
                  isAuthenticatedRef.current,
                  false
                ),
                getCurrentDateYYMMDD()
              )
              setIsLoading(false)
              return
            }
            if (!isAuthenticatedRef.current) return setIsLoading(false)
            const payload: IAssistantCreateNotebookRequestPayload = {
              conversationId,
              message: request,
            }
            chrome.runtime.sendMessage(
              chrome.runtime.id || process.env.EXTENSION_ID,
              {
                payload,
                messageType: 'notebook:create-notebook',
              }
            )
          }
          setConversationId(conversationId)
          setIsLoading(false)
        }

        if (message.messageType === 'notebook:open-node') {
          console.log('>notebook:open-node', { message })
          setIsLoading(false)
        }

        if (message.messageType === 'notebook:create-notebook') {
          const { notebookId, notebookTitle } =
            message as CreateNotebookWorkerResponse
          console.log('>notebook:create-notebook', { message })
          pushMessage(
            generateWhereContinueExplanation(
              notebookTitle,
              isAuthenticatedRef.current,
              true
            ),
            getCurrentDateYYMMDD()
          )
          setNotebook({ id: notebookId, name: notebookTitle })
          setIsLoading(false)
        }
      }

      chrome.runtime.onMessage.addListener(listenWorker)
      return () => chrome.runtime.onMessage.removeListener(listenWorker)
    }, [notebook])

    useEffect(() => {
      // following listener only for non-notebook tabs
      if (window.location.href.startsWith(NOTEBOOK_LINK)) return

      const listenWorker = (
        message: TAssistantResponseMessage | TAssistantNotebookMessage
      ) => {
        if (message.type === 'FLASHCARDS_RESPONSE') {
          setFlashcards(message.flashcards)
          pushMessage(
            generateTopicMessage(selectedText, message.flashcards),
            getCurrentDateYYMMDD()
          )
          return setIsLoading(false)
        } else if (message.type === 'LOADING_COMPLETED') {
          setIsLoading(false)
          return setTimeout(scrollToTheEnd, 500)
        }
      }

      chrome.runtime.onMessage.addListener(listenWorker)
      return () => chrome.runtime.onMessage.removeListener(listenWorker)
    }, [notebook, flashcards])

    useEffect(() => {
      // following listener only for notebook tabs
      if (!window.location.href.startsWith(NOTEBOOK_LINK)) return

      const listenWorker = (
        message: TAssistantResponseMessage | TAssistantNotebookMessage
      ) => {
        if (message.type === 'CREATE_NOTEBOOK') {
          setCreatingNotebook(false)
          setNotebooks(message.notebooks)
          setNotebook({
            id: message.notebookId,
            name: message.notebookTitle,
          } as Notebook)
          setIsLoading(false)

          pushMessage(
            generateNotebookIntro(flashcards, selecteSidebar),
            getCurrentDateYYMMDD()
          )

          setNodeIdx(0)
          nextFlashcard(2000)
        } else if (message.type === 'LOADING_COMPLETED') {
          setIsLoading(false)
          return setTimeout(scrollToTheEnd, 500)
        }
      }

      chrome.runtime.onMessage.addListener(listenWorker)
      return () => chrome.runtime.onMessage.removeListener(listenWorker)
    }, [flashcards])

    useEffect(() => {
      const listener = (e: any) => {
        const flashcard: Flashcard = e?.detail?.flashcard || ({} as any)
        console.log('flashcard', { flashcard })
        setCurrentFlashcard(flashcard)
      }
      window.addEventListener('flashcard-start', listener)
      return () => window.removeEventListener('flashcard-start', listener)
    }, [])

    useEffect(() => {
      const listener = (e: any) => {
        const detail: {
          node: string
          proposal: string
          flashcard: Flashcard
          token: string
        } = e?.detail || ({} as any)
        
        chrome.runtime.sendMessage({
          type: 'PROPOSE_FLASHCARD',
          node: detail.node,
          proposal: detail.proposal,
          flashcard: detail.flashcard,
          token: detail.token,
          bookTabId,
        })
      }
      window.addEventListener('propose-flashcard', listener)
      return () => window.removeEventListener('propose-flashcard', listener)
    }, [bookTabId])

    useEffect(() => {
      const listener = (e: any) => {
        nextFlashcard(500)
      }
      window.addEventListener('next-flashcard', listener)
      return () => window.removeEventListener('next-flashcard', listener)
    }, [nextFlashcard])

    useEffect(() => {
      if (!nodeSelection) return
      const listener = (e: any) => {
        pushMessage(
          generateConfirmNodeSelection(e.detail),
          getCurrentDateYYMMDD()
        )
        setTimeout(scrollToTheEnd, 1000)
      }
      window.addEventListener('node-selected', listener)
      return () => window.removeEventListener('node-selected', listener)
    }, [nodeSelection, pushMessage])

    useEffect(() => {
      if (!currentFlashcard) return
      setNodeIdx((nodeIdx) => {
        pushMessage(
          generateNodeProposeMessage(
            currentFlashcard,
            nodeIdx,
            flashcards.length
          ),
          getCurrentDateYYMMDD()
        )
        setTimeout(scrollToTheEnd, 1000)
        return nodeIdx
      })

      const searchEvent = new CustomEvent('assistant', {
        detail: {
          type: 'SEARCH_NODES',
          query: currentFlashcard.title,
        },
      })
      window.dispatchEvent(searchEvent)
      setTimeout(() => {
        pushMessage(generateSearchNodeMessage(), getCurrentDateYYMMDD())
        setTimeout(scrollToTheEnd, 1000)
        setTimeout(() => {
          pushMessage(generateNodeDiscoverMessage(), getCurrentDateYYMMDD())
          setTimeout(scrollToTheEnd, 1000)
        }, 2000)
      }, 2000)
    }, [currentFlashcard, setNodeIdx, pushMessage, setNodeSelection])

    const formatDate = (date: string) => {
      const _date = new Date()
      const today = moment().startOf('day')
      const yesterday = moment().subtract(1, 'days').startOf('day')
      let formatedDate = date
      if (moment(_date).isSame(today, 'day')) {
        formatedDate = 'Today'
      }
      if (moment(_date).isSame(yesterday, 'day')) {
        formatedDate = 'Yesterday'
      }
      return formatedDate
    }

    const onClearChat = () => {
      setMessagesObj([])
      setNotebook(null)
      setIsLoading(false)
    }

    return (
      <Stack
        sx={{
          ...sx,
          width: '420px',
          height: '600px',
          position: 'fixed',
          bottom: '112px',
          right: '38px',
          borderRadius: '8px',
          backgroundColor:
            mode === 'dark'
              ? DESIGN_SYSTEM_COLORS.notebookG900
              : DESIGN_SYSTEM_COLORS.gray50,
          border: `solid 2px ${
            mode === 'light'
              ? DESIGN_SYSTEM_COLORS.primary200
              : DESIGN_SYSTEM_COLORS.primary400
          }`,
        }}
      >
        {/* header */}
        <HeaderMessage
          displayClearButton={Boolean(messagesObj.length)}
          onClearChat={onClearChat}
        />

        {/* sticky message */}
        <ChatStickyMessage />

        {/* messages */}
        <Stack
          ref={chatElementRef}
          spacing="14px"
          onScroll={onLoadNextNodeToBeDisplayed}
          sx={{
            // height: "358px",
            p: '12px 24px',
            overflowY: 'auto',
            scrollBehavior: 'smooth',
            flexGrow: 1,
            ...(!messagesObj.length &&
              !isLoading && {
                backgroundImage: `url(${CHAT_BACKGROUND_IMAGE_URL})`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundSize: '208px auto',
              }),
          }}
        >
          {messagesObj.map((cur) => {
            return (
              <Fragment key={cur.date}>
                <Box>
                  <Divider
                    sx={{
                      ':before': {
                        borderTop: `solid 1px ${
                          mode === 'light'
                            ? DESIGN_SYSTEM_COLORS.notebookG100
                            : DESIGN_SYSTEM_COLORS.notebookG500
                        }`,
                      },
                      ':after': {
                        borderTop: `solid 1px ${
                          mode === 'light'
                            ? DESIGN_SYSTEM_COLORS.notebookG100
                            : DESIGN_SYSTEM_COLORS.notebookG500
                        }`,
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        color:
                          mode === 'dark'
                            ? DESIGN_SYSTEM_COLORS.gray25
                            : DESIGN_SYSTEM_COLORS.gray900,
                      }}
                    >
                      {formatDate(cur.date)}
                    </Typography>
                  </Divider>
                </Box>
                {cur.messages.map((c) => (
                  <Stack
                    key={c.id}
                    direction={c.type === 'READER' ? 'row' : 'row-reverse'}
                    spacing="12px"
                  >
                    {c.type === 'READER' && (
                      <CustomAvatar
                        imageUrl={LOGO_URL}
                        alt="onecademy assistant logo"
                      />
                    )}
                    <Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mb: '7px',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography
                            sx={{
                              fontWeight: 500,
                              fontSize: '14px',
                              color:
                                mode === 'dark'
                                  ? DESIGN_SYSTEM_COLORS.gray25
                                  : DESIGN_SYSTEM_COLORS.gray900,
                            }}
                          >
                            {c.type === 'READER' ? ASSISTANT_NAME : USER_NAME+" "}
                            {/* {c.uname} */}
                          </Typography>
                          {c.type === 'READER' && (
                            <IconButton
                              onClick={() => narrateMessage(c.id, c.content)}
                              size="small"
                              sx={{ p: '4px', ml: '4px' }}
                            >
                              {speakingMessageId === c.id ? (
                                <VolumeOffIcon
                                  sx={{
                                    fontSize: '16px',
                                    color:
                                      mode === 'dark'
                                        ? DESIGN_SYSTEM_COLORS.gray25
                                        : DESIGN_SYSTEM_COLORS.gray900,
                                  }}
                                />
                              ) : (
                                <VolumeUpIcon
                                  sx={{
                                    fontSize: '16px',
                                    color:
                                      mode === 'dark'
                                        ? DESIGN_SYSTEM_COLORS.gray25
                                        : DESIGN_SYSTEM_COLORS.gray900,
                                  }}
                                />
                              )}
                            </IconButton>
                          )}
                        </Box>
                        <Typography
                          sx={{
                            fontWeight: 400,
                            fontSize: '14px',
                            color:
                              mode === 'dark'
                                ? DESIGN_SYSTEM_COLORS.gray25
                                : DESIGN_SYSTEM_COLORS.gray900,
                          }}
                        >
                          {c.hour}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          p: '10px 14px',
                          borderRadius:
                            c.type === 'WRITER'
                              ? '8px 0px 8px 8px'
                              : '0px 8px 8px 8px',
                          backgroundColor:
                            c.type === 'WRITER'
                              ? mode === 'light'
                                ? DESIGN_SYSTEM_COLORS.orange100
                                : DESIGN_SYSTEM_COLORS.notebookO900
                              : mode === 'light'
                              ? DESIGN_SYSTEM_COLORS.gray200
                              : DESIGN_SYSTEM_COLORS.notebookG600,
                        }}
                      >
                        {c.nodes.length > 0 && (
                          <Stack spacing={'12px'} sx={{ mb: '10px' }}>
                            {c.nodes.map((node) => (
                              <NodeLink
                                key={node.id}
                                id={node.id}
                                title={node.title}
                                type={node.type}
                                link={node.link}
                                notebookId={notebook?.id}
                                isAuthenticated={isAuthenticated}
                                isAuthenticatedRef={isAuthenticatedRef}
                              />
                            ))}
                          </Stack>
                        )}

                        <Box
                          sx={{
                            fontSize: '14px',
                            color: 'red',
                            '& *': {
                              color: `${
                                mode === 'dark'
                                  ? DESIGN_SYSTEM_COLORS.gray25
                                  : DESIGN_SYSTEM_COLORS.gray800
                              } !important`,
                            },
                            lineHeight: '21px',
                          }}
                        >
                          <MarkdownRender
                            text={c.content}
                            customClass="one-react-markdown"
                          />
                          {c.image && (
                            <img
                              src={c.image}
                              alt={`node image`}
                              style={{ margin: 'auto', maxWidth: '100%' }}
                            />
                          )}
                          {c.video && (
                            <Box
                              sx={{
                                display: 'flex',
                                width: '100%',
                                height: '150px',
                              }}
                            >
                              <iframe
                                src={c.video}
                                width={'100%'}
                                style={{ border: '0px' }}
                              ></iframe>
                            </Box>
                          )}
                          {c.practice &&
                          c.practice.answered &&
                          c.practice.totalQuestions ? (
                            <Box sx={{ mt: '12px' }}>
                              <PieChart
                                answers={c.practice.answered}
                                questions={c.practice.totalQuestions}
                              />
                            </Box>
                          ) : null}
                        </Box>

                        {c.actions.length > 0 && (
                          <Stack spacing={'12px'} sx={{ mt: '12px' }}>
                            {c.actions.map((action, idx) =>
                              getAction(c.id, cur.date, action, c.request)
                            )}
                          </Stack>
                        )}
                      </Box>
                    </Box>
                  </Stack>
                ))}
                {isLoading && <SearchMessage />}
              </Fragment>
            )
          })}
          {!messagesObj?.length && isLoading ? <SearchMessage /> : null}
        </Stack>

        {/* footer options */}
        <ChatFooter
          isLoading={isLoading}
          onSubmitMessage={onSubmitMessage}
          setUserMessage={setUserMessage}
          userMessage={userMessage}
        />
      </Stack>
    )
  }
)

const mapAssistantResponseToMessage = (
  newMessage: IAssistantResponse
): MessageData => {
  const message: MessageData = {
    actions: newMessage.actions
      ? newMessage.actions.map((c) => ({
          title: c.title,
          type: c.type,
          variant: tempMap(c.variant as string),
        }))
      : [],
    content: newMessage.message,
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: '',
    video: '',
    nodes: newMessage.nodes ? newMessage.nodes.map(mapNodesToNodeLink) : [],
    type: 'READER',
    request: newMessage.request,
    is404: newMessage.is404,
  }
  console.log('message', message)
  return message
}

const mapUserMessageToMessage = (userMessage: string): MessageData => {
  const message: MessageData = {
    actions: [],
    content: userMessage,
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: '',
    video: '',
    nodes: [],
    type: 'WRITER',
  }
  return message
}

const mapNodesToNodeLink = (node: NodeAssistantResponse): NodeLinkType => {
  const nodeCopy = { ...node } as any
  delete nodeCopy.node
  return { ...nodeCopy, id: node.node }
}
