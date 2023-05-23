import React, { forwardRef, ReactNode, useImperativeHandle } from "react";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { CustomAvatar } from "./CustomAvatar";
import { DESIGN_SYSTEM_COLORS } from "../../utils/colors";
import {
  Box,
  Button,
  Divider,
  IconButton,
  InputBase,
  Stack,
  SxProps,
  Tooltip,
  Typography,
} from "@mui/material";
import { RiveComponentMemoized } from "./RiveMemoized";
import { getFirestore } from "firebase/firestore";
import { useAuth } from "../../utils/AuthContext";
import {
  CreateNotebookWorkerResponse,
  IAssistantCreateNotebookRequestPayload,
  IAssistantRequestPayload,
  IAssistantResponse,
  IAssitantRequestAction,
  IViewNodeOpenNodesPayload,
  NodeAssistantResponse,
  NodeType,
  ViewNodeWorkerResponse,
} from "../../types";
import { NodeLink } from "./NodeLink";
import {
  ASSISTANT_NAME,
  CHAT_BACKGROUND_IMAGE_URL,
  ENDPOINT_BASE,
  LOGO_URL,
  NOTEBOOKS_LINK,
  NOTEBOOK_LINK,
  SEARCH_ANIMATION_URL,
  USER_NAME,
} from "../../utils/constants";
import { useTheme } from "../../hooks/useTheme";
import { getCurrentDateYYMMDD, getCurrentHourHHMM } from "../../utils/date";
import { Theme } from "@mui/system";
import { generateRandomId } from "../../utils/others";
import { generateContinueDisplayingNodeMessage, generateNodeMessage, generateTopicNotFound, generateUserActionAnswer, generateWhereContinueExplanation } from "../../utils/messages";
import SearchMessage from "./SearchMessage";
import moment from "moment";
import MarkdownRender from "./MarkdownRender";
import { HeaderMessage } from "../ChatHeader";
import { ChatFooter } from "../ChatFooter";
import { ChatStickyMessage } from "../ChatStickyMessage";
import { PieChart } from "../Charts/PieComponent";

/**
 * - NORMAL: is only content
 * - HELP: content + button to practice + teach content page
 * - NODE: Node Link + content
 * - PRACTICE: content + button to remind later + begin practice
 * - EXPLANATION: content + button to continue explaining + button to stop explanation
 */
// type MessageType = "NORMAL" | "HELP" | "NODE" | "PRACTICE";
export type NodeLinkType = {
  type: NodeType;
  id: string;
  title: string;
  link: string;
  content: string;
  unit: string;
  nodeImage: string;
  nodeVideo: string
};

type ActionVariant = "contained" | "outlined";

type MessageAction = {
  type:
  | IAssitantRequestAction
  | "LOCAL_OPEN_NOTEBOOK"
  | "LOCAL_CONTINUE_EXPLANATION_HERE"
  title: string;
  variant: ActionVariant;
};

export type MessageData = {
  id: string;
  type: "WRITER" | "READER";
  // uname: string;
  image: string;
  video: string;
  content: string;
  nodes: NodeLinkType[];
  actions: MessageAction[];
  hour: string;
  is404?: boolean
  request?: string
  componentContent?: ReactNode
};
type Message = {
  date: string;
  messages: MessageData[];
};

type Notebook = { id: string, name: string }

const tempMap = (variant: string): ActionVariant => {
  if (variant === "outline") return "outlined";
  return "contained";
};

type ChatProps = {
  // setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  isLoading: boolean,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  appMessages: MessageData[]
  clearAppMessages: () => void
  isAuthenticated: boolean,
  sx?: SxProps<Theme>,
  isAuthenticatedRef: {
    current: boolean;
  }
};

export const Chat = ({ isLoading, setIsLoading, appMessages, clearAppMessages, isAuthenticated, isAuthenticatedRef, sx }: ChatProps) => {

  const [notebook, setNotebook] = useState<Notebook | null>(null)
  const [messagesObj, setMessagesObj] = useState<Message[]>([]);
  const [speakingMessageId, setSpeakingMessageId] = useState<string>("");
  const chatElementRef = useRef<HTMLDivElement | null>(null);
  const [conversationId, setConversationId] = useState("");
  const [nodesToBeDisplayed, setNodesToBeDisplayed] = useState<NodeLinkType[]>([]);
  const [tmpNodesToBeDisplayed, setTmpNodesToBeDisplayed] = useState<NodeLinkType[]>([]);
  const { mode } = useTheme();
  const [userMessage, setUserMessage] = useState("");

  useEffect(() => {
    if (!appMessages.length) return
    appMessages.forEach(cur => pushMessage(cur, getCurrentDateYYMMDD()))
    clearAppMessages()
  }, [appMessages])

  const pushMessage = useCallback(
    (message: MessageData, currentDateYYMMDD: string) => {
      console.log('pushMessage', { message })

      // dont add empty message
      if (!message.content) return

      setMessagesObj((prev) => {
        if (prev.length === 0)
          return [{ date: currentDateYYMMDD, messages: [message] }];
        const res = prev.reduce(
          (acu: { found: boolean; result: Message[] }, cur) => {
            if (cur.date === currentDateYYMMDD)
              return {
                found: true,
                result: [
                  ...acu.result,
                  { ...cur, messages: [...cur.messages, message] },
                ],
              };
            return { ...acu, result: [...acu.result, cur] };
          },
          { found: false, result: [] }
        );
        // console.log("pushMessage", { res })
        const newMessageObj: Message[] = res.found
          ? res.result
          : [...res.result, { date: currentDateYYMMDD, messages: [message] }];
        return newMessageObj;
      });

      if (message.type === 'WRITER') {
        setTimeout(() => {
          scrollToTheEnd();
        }, 500)
      }
    },
    []
  );

  const removeActionOfAMessage = (messageId: string, date: string) => {
    const removeActionOFMessage = (message: MessageData): MessageData =>
      message.id === messageId ? { ...message, actions: [] } : message;
    setMessagesObj((prev) =>
      prev.map((cur) =>
        cur.date === date
          ? { ...cur, messages: cur.messages.map(removeActionOFMessage) }
          : cur
      )
    );
    // idMessage
  };

  const onPushAssistantMessage = (newMessage: IAssistantResponse) => {
    const currentDateYYMMDD = getCurrentDateYYMMDD();
    const message: MessageData = mapAssistantResponseToMessage(newMessage);
    pushMessage(message, currentDateYYMMDD);
  };

  const onPushUserMessage = (userMessage: string) => {
    const currentDateYYMMDD = getCurrentDateYYMMDD();
    const message = mapUserMessageToMessage(userMessage);
    pushMessage(message, currentDateYYMMDD);
  };

  const onSubmitMessage = useCallback(async () => {
    if (isLoading) return
    const userMessageProcessed = userMessage.trim();
    if (!userMessageProcessed) return;

    setIsLoading(true);
    onPushUserMessage(userMessageProcessed);
    const payload: IAssistantRequestPayload = {
      actionType: "DirectQuestion",
      message: userMessageProcessed,
      conversationId,
    };
    chrome.runtime.sendMessage(chrome.runtime.id || process.env.EXTENSION_ID, {
      payload,
      messageType: "assistant",
    });

    setUserMessage("");
  }, [isLoading, userMessage, conversationId]);

  const scrollToTheEnd = () => {
    if (!chatElementRef.current) return;
    chatElementRef.current.scrollTop = chatElementRef.current.scrollHeight;
  };

  const onLoadNextNodeToBeDisplayed = useCallback(() => {
    if (!chatElementRef.current) return;

    const scrollTop = chatElementRef.current.scrollTop;
    const scrollHeight = chatElementRef.current.scrollHeight;
    const clientHeight = chatElementRef.current.clientHeight;

    const scrollDistanceFromTop = scrollTop + clientHeight;
    const distanceToBottom = scrollHeight - scrollDistanceFromTop;

    const threshold = 0.1; // 10% of the element's height
    const thresholdValue = threshold * scrollHeight;

    if (distanceToBottom < thresholdValue) {
      // User is close to the bottom of the element
      // console.log('Scroll is near to the end!.', nodesToBeDisplayed.length);
      if (nodesToBeDisplayed.length < 0) return;
      onDisplayNextNodeToBeDisplayed(nodesToBeDisplayed);
    }
  }, [nodesToBeDisplayed]);

  const narrateMessage = useCallback((id: string, message: string) => {
    console.log("narrateMessage", { message });
    if (!window.speechSynthesis.speaking) {
      const msg = new SpeechSynthesisUtterance(message);
      window.speechSynthesis.speak(msg);
      setSpeakingMessageId(id);
      msg.onend = () => {
        setSpeakingMessageId("");
      };
    } else {
      window.speechSynthesis.cancel();
      setSpeakingMessageId("");
    }
  }, []);

  const onDisplayNextNodeToBeDisplayed = (
    nodesToBeDisplayed: NodeLinkType[]
  ) => {
    // console.log({ nodesToBeDisplayed })
    const copyNodesToBeDisplayed = [...nodesToBeDisplayed];
    const firstElement = copyNodesToBeDisplayed.shift();
    if (!firstElement) return;
    pushMessage(generateNodeMessage(firstElement), getCurrentDateYYMMDD());
    const thereIsNextNode = Boolean(copyNodesToBeDisplayed.length);
    pushMessage(
      generateContinueDisplayingNodeMessage(
        firstElement.title,
        firstElement.unit,
        thereIsNextNode,
        // TODO: after map practice into a node, send practice property and add PieChart
        // { answered: firstElement, totalQuestions: 10 },
        // <PieChart answers={2} questions={10} />
      ),
      getCurrentDateYYMMDD()
    );
    setNodesToBeDisplayed(copyNodesToBeDisplayed);
  };

  const getAction = (
    messageId: string,
    date: string,
    action: MessageAction,
    request?: string
  ) => {

    if (!notebook) return null

    let onClick = undefined
    if (action.type === "LOCAL_OPEN_NOTEBOOK") {
      onClick = () => {
        console.log("-> Open Notebook", notebook);
        const messageWithSelectedAction = generateUserActionAnswer(
          action.title
        );
        pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD());
        removeActionOfAMessage(messageId, date);
        // window.open(`${NOTEBOOKS_LINK}/${notebookId}`, '_blank')?.focus();

        // open all nodes
        const payload: IViewNodeOpenNodesPayload = {
          nodeIds: tmpNodesToBeDisplayed.map(c => c.id),
          notebookId: notebook.id,
          visible: true
        };
        chrome.runtime.sendMessage(chrome.runtime.id || process.env.EXTENSION_ID, {
          payload,
          messageType: "notebook:open-nodes",
        });

        setTmpNodesToBeDisplayed([]);
        chrome.runtime.sendMessage(chrome.runtime.id, {
          type: "SELECT_NOTEBOOK",
          notebookId: notebook.id
        });
        chrome.runtime.sendMessage(chrome.runtime.id, { type: "FOCUS_NOTEBOOK" });
      }
    }

    if (action.type === "LOCAL_CONTINUE_EXPLANATION_HERE") {
      onClick = () => {
        console.log("-> Continue explanation here", tmpNodesToBeDisplayed);
        const messageWithSelectedAction = generateUserActionAnswer(
          action.title
        );
        pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD());
        onDisplayNextNodeToBeDisplayed(tmpNodesToBeDisplayed);
        setTmpNodesToBeDisplayed([]);
        removeActionOfAMessage(messageId, date);
      }
    }

    if (action.type === 'IllContribute') {
      onClick = () => {
        console.log("-> IllContribute");
        const messageWithSelectedAction = generateUserActionAnswer(action.title);
        pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD());
        setTmpNodesToBeDisplayed([]);
        removeActionOfAMessage(messageId, date);
        if (notebook) {
          chrome.runtime.sendMessage(chrome.runtime.id, {
            type: "SELECT_NOTEBOOK",
            notebookId: notebook.id
          });
          chrome.runtime.sendMessage(chrome.runtime.id, { type: "FOCUS_NOTEBOOK" });
        } else {
          chrome.runtime.sendMessage(chrome.runtime.id, { type: "FOCUS_NOTEBOOK" });
        }
      }
    }

    if (action.type === 'GeneralExplanation') {
      onClick = () => {
        console.log("-> GeneralExplanation");
        const messageWithSelectedAction = generateUserActionAnswer(action.title);
        pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD());
        setTmpNodesToBeDisplayed([]);
        removeActionOfAMessage(messageId, date);
        // TODO: sendMessage to service worker
        const payload: IAssistantRequestPayload = {
          actionType: "GeneralExplanation",
          message: request ?? '',
          conversationId,
        };
        chrome.runtime.sendMessage(chrome.runtime.id || process.env.EXTENSION_ID, {
          payload,
          messageType: "assistant",
        });
        setIsLoading(true);
      }
    }

    return (
      <Button onClick={onClick} variant={action.variant} fullWidth>
        {action.title}
      </Button>
    );
  };

  useEffect(() => {
    const listenWorker = (message: (IAssistantResponse | ViewNodeWorkerResponse | CreateNotebookWorkerResponse) & { messageType: string }) => {
      if (message.messageType === 'assistant') {
        console.log('>:message form assistant', { message })
        const { is404, request, nodes, conversationId } = message as IAssistantResponse
        if (is404) {
          // console.log(1)
          pushMessage(generateTopicNotFound(request ?? "", isAuthenticatedRef.current), getCurrentDateYYMMDD())
        } else {
          // console.log(22)
          onPushAssistantMessage({ ...(message as IAssistantResponse), nodes: [] })
          const nodesOnMessage = nodes ? nodes.map(mapNodesToNodeLink) : []
          if (!nodesOnMessage.length) return setIsLoading(false);

          setTmpNodesToBeDisplayed(nodesOnMessage)

          if (notebook) {
            // TODO: manage response when notebookId exist
            pushMessage(generateWhereContinueExplanation(notebook.name, isAuthenticatedRef.current, false), getCurrentDateYYMMDD())
            setIsLoading(false);
            return
          }
          if (!isAuthenticatedRef.current) return setIsLoading(false);
          const payload: IAssistantCreateNotebookRequestPayload = { conversationId, message: request }
          chrome.runtime.sendMessage(chrome.runtime.id || process.env.EXTENSION_ID, {
            payload,
            messageType: "notebook:create-notebook",
          });
        }
        setConversationId(conversationId)
        setIsLoading(false);
      }

      if (message.messageType === 'notebook:open-node') {
        // const { linkToOpenNode } = message as ViewNodeWorkerResponse

        console.log('>notebook:open-node', { message })
        setIsLoading(false);
      }

      if (message.messageType === 'notebook:create-notebook') {
        const { notebookId, notebookTitle } = message as CreateNotebookWorkerResponse
        console.log('>notebook:create-notebook', { message })
        pushMessage(generateWhereContinueExplanation(notebookTitle, isAuthenticatedRef.current, true), getCurrentDateYYMMDD())
        setNotebook({ id: notebookId, name: notebookTitle })
        setIsLoading(false);
      }
    }

    chrome.runtime.onMessage.addListener(listenWorker);
    return () => chrome.runtime.onMessage.removeListener(listenWorker);
  }, [notebook]);

  const formatDate = (date: string) => {
    const _date = new Date();
    const today = moment().startOf("day");
    const yesterday = moment().subtract(1, "days").startOf("day");
    let formatedDate = date;
    if (moment(_date).isSame(today, "day")) {
      formatedDate = "Today";
    }
    if (moment(_date).isSame(yesterday, "day")) {
      formatedDate = "Yesterday";
    }
    return formatedDate;
  };

  const onClearChat = () => {
    setMessagesObj([])
    setNotebook(null)
    setIsLoading(false)
  }

  return (
    <Stack
      sx={{
        ...sx,
        width: "420px",
        height: "600px",
        position: "fixed",
        bottom: "112px",
        right: "38px",
        borderRadius: "8px",
        backgroundColor:
          mode === "dark"
            ? DESIGN_SYSTEM_COLORS.notebookG900
            : DESIGN_SYSTEM_COLORS.gray50,
        border: `solid 2px ${mode === "light"
          ? DESIGN_SYSTEM_COLORS.primary200
          : DESIGN_SYSTEM_COLORS.primary400
          }`,
      }}
    >
      {/* header */}
      <HeaderMessage displayClearButton={Boolean(messagesObj.length)} onClearChat={onClearChat} />

      {/* sticky message */}
      <ChatStickyMessage />

      {/* messages */}
      <Stack
        ref={chatElementRef}
        spacing="14px"
        onScroll={onLoadNextNodeToBeDisplayed}
        sx={{
          // height: "358px",
          p: "12px 24px",
          overflowY: "auto",
          scrollBehavior: "smooth",
          flexGrow: 1,
          ...(!messagesObj.length &&
            !isLoading && {
            backgroundImage: `url(${CHAT_BACKGROUND_IMAGE_URL})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "208px auto"
          }),
        }}
      >
        {messagesObj.map((cur) => {
          return (
            <Fragment key={cur.date}>
              <Box>
                <Divider
                  sx={{
                    ":before": {
                      borderTop: `solid 1px ${mode === "light"
                        ? DESIGN_SYSTEM_COLORS.notebookG100
                        : DESIGN_SYSTEM_COLORS.notebookG500
                        }`,
                    },
                    ":after": {
                      borderTop: `solid 1px ${mode === "light"
                        ? DESIGN_SYSTEM_COLORS.notebookG100
                        : DESIGN_SYSTEM_COLORS.notebookG500
                        }`,
                    },
                  }}
                >
                  <Typography
                    sx={{
                      color:
                        mode === "dark"
                          ? DESIGN_SYSTEM_COLORS.gray25
                          : DESIGN_SYSTEM_COLORS.gray900,
                    }}
                  >
                    {formatDate(cur.date)}
                  </Typography>
                </Divider>
              </Box>
              {cur.messages.map((c, idx) => (
                <Stack
                  key={c.id}
                  direction={c.type === "READER" ? "row" : "row-reverse"}
                  spacing="12px"
                >
                  {c.type === "READER" && (
                    <CustomAvatar
                      imageUrl={LOGO_URL}
                      alt="onecademy assistant logo"
                    />
                  )}
                  <Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: "7px",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Typography
                          sx={{
                            fontWeight: 500,
                            fontSize: "14px",
                            color:
                              mode === "dark"
                                ? DESIGN_SYSTEM_COLORS.gray25
                                : DESIGN_SYSTEM_COLORS.gray900,
                          }}
                        >
                          {c.type === "READER" ? ASSISTANT_NAME : USER_NAME}
                          {/* {c.uname} */}
                        </Typography>
                        {c.type ===
                          "READER" /* && <Tooltip title={speakingMessageId === c.id ? "Stop narrating" : "Narrate message"} placement='top'> */ && (
                            <IconButton
                              onClick={() => narrateMessage(c.id, c.content)}
                              size="small"
                              sx={{ p: "4px", ml: "4px" }}
                            >
                              {speakingMessageId === c.id ? (
                                <VolumeOffIcon
                                  sx={{
                                    fontSize: "16px",
                                    color:
                                      mode === "dark"
                                        ? DESIGN_SYSTEM_COLORS.gray25
                                        : DESIGN_SYSTEM_COLORS.gray900,
                                  }}
                                />
                              ) : (
                                <VolumeUpIcon
                                  sx={{
                                    fontSize: "16px",
                                    color:
                                      mode === "dark"
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
                          fontSize: "14px",
                          color:
                            mode === "dark"
                              ? DESIGN_SYSTEM_COLORS.gray25
                              : DESIGN_SYSTEM_COLORS.gray900,
                        }}
                      >
                        {c.hour}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        p: "10px 14px",
                        borderRadius:
                          c.type === "WRITER"
                            ? "8px 0px 8px 8px"
                            : "0px 8px 8px 8px",
                        backgroundColor:
                          c.type === "WRITER"
                            ? mode === "light"
                              ? DESIGN_SYSTEM_COLORS.orange100
                              : DESIGN_SYSTEM_COLORS.notebookO900
                            : mode === "light"
                              ? DESIGN_SYSTEM_COLORS.gray200
                              : DESIGN_SYSTEM_COLORS.notebookG600,
                      }}
                    >
                      {c.nodes.length > 0 && (
                        <Stack spacing={"12px"} sx={{ mb: "10px" }}>
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
                          fontSize: "14px",
                          color: "red",
                          "& *": {
                            color: `${mode === "dark"
                              ? DESIGN_SYSTEM_COLORS.gray25
                              : DESIGN_SYSTEM_COLORS.gray800
                              } !important`,
                          },
                          lineHeight: "21px",
                        }}
                      >
                        <MarkdownRender
                          text={c.content}
                          customClass="one-react-markdown"
                        />
                        {c.image && <img src={c.image} alt={`node image`} style={{ margin: "auto", maxWidth: "100%" }} />}
                        {/* {c.video && <video src={c.video} style={{ margin: "auto", maxWidth: "100%" }} />} */}
                        {c.video && <Box
                          sx={{
                            display: "flex",
                            width: "100%",
                            height: "150px",
                          }}
                        >
                          <iframe
                            src={c.video}
                            width={"100%"}
                            style={{ border: "0px" }}
                          ></iframe>
                        </Box>}
                        {c.componentContent && <Box sx={{ mt: "12px" }}>{c.componentContent}</Box>}
                      </Box>

                      {c.actions.length > 0 && (
                        <Stack spacing={"12px"} sx={{ mt: "12px" }}>
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
          );
        })}
      </Stack>

      {/* footer options */}
      <ChatFooter isLoading={isLoading} onSubmitMessage={onSubmitMessage} setUserMessage={setUserMessage} userMessage={userMessage} />

    </Stack>
  );
}


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
    image: "",
    video: "",
    nodes: newMessage.nodes ? newMessage.nodes.map(mapNodesToNodeLink) : [],
    type: "READER",
    request: newMessage.request,
    is404: newMessage.is404
  };
  return message;
};

const mapUserMessageToMessage = (userMessage: string): MessageData => {
  const message: MessageData = {
    actions: [],
    content: userMessage,
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: "",
    video: "",
    nodes: [],
    type: "WRITER",
  }
  return message
}

const mapNodesToNodeLink = (node: NodeAssistantResponse): NodeLinkType => {
  const nodeCopy = { ...node } as any
  delete nodeCopy.node
  return { ...nodeCopy, id: node.node }
}
