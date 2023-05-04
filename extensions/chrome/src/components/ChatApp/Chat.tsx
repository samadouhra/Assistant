import React from "react";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import MicIcon from "@mui/icons-material/Mic";
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
  IAssistantRequestPayload,
  IAssistantResponse,
  IAssitantRequestAction,
  NodeAssistantResponse,
  NodeType,
} from "../../types";
import { NodeLink } from "./NodeLink";
import {
  CHAT_BACKGROUND_IMAGE_URL,
  ENDPOINT_BASE,
  LOGO_URL,
  SEARCH_ANIMATION_URL,
} from "../../utils/constants";
import { useTheme } from "../../hooks/useTheme";
import { getCurrentDateYYMMDD, getCurrentHourHHMM } from "../../utils/date";
import { Theme } from "@mui/system";
import { generateRandomId } from "../../utils/others";
import { generateContinueDisplayingNodeMessage, generateNodeMessage, generateTopicNotFound, generateUserActionAnswer, generateWhereContinueExplanation } from "../../utils/messages";
import SearchMessage from "./SearchMessage";
import moment from "moment";
import MarkdownRender from "./MarkdownRender";

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
  uname: string;
  image: string;
  content: string;
  nodes: NodeLinkType[];
  actions: MessageAction[];
  hour: string;
  is404?: boolean
  request?: string
};
type Message = {
  date: string;
  messages: MessageData[];
};
// const MESSAGES: Message[] = [
//   {
//     date: "12/12/12",
//     messages: [
//       {
//         id: "01",
//         type: "READER",
//         hour: "20:00",
//         image: "",
//         content: "Message with actions",
//         nodes: [],
//         uname: "1Cademy Assistant",
//         actions: [
//           {
//             title: "Teach me the content of this page",
//             type: "TeachContent",
//             variant: "outlined",
//           },
//           // {
//           //   title: "Remind me later",
//           //   type: "RemindLater",
//           //   variant: "outlined",
//           // },
//           // { title: "Yes", type: "Yes", variant: "outlined" },
//           // { title: "ExplainMore", type: "ExplainMore", variant: "outlined" },
//           // {
//           //   title: "Provide me an explanation",
//           //   type: "GiveMoreExplanation",
//           //   variant: "outlined",
//           // },
//           // {
//           //   title: "I’ll contribute",
//           //   type: "IllContribute",
//           //   variant: "outlined",
//           // },
//           // { title: "Question", type: "Question", variant: "outlined" },
//           // { title: "Text", type: "Text", variant: "outlined" },
//           // { title: "Let’s practice", type: "Practice", variant: "outlined" },
//         ],
//       },
//       {
//         id: "03",
//         type: "READER",
//         hour: "20:00",
//         image: "",
//         content: "Message with Nodes",
//         nodes: [
//           {
//             id: "01",
//             title: "Advertisement Node title",
//             type: "Advertisement",
//           },
//           { id: "02", title: "Code Node title", type: "Code" },
//           { id: "03", title: "Concept Node title", type: "Concept" },
//           { id: "04", title: "Idea Node title", type: "Idea" },
//           { id: "05", title: "News Node title", type: "News" },
//           { id: "06", title: "Private Node title", type: "Private" },
//           { id: "07", title: "Profile Node title", type: "Profile" },
//           { id: "08", title: "Question Node title", type: "Question" },
//           { id: "09", title: "Reference Node title", type: "Reference" },
//           { id: "10", title: "Relation Node title", type: "Relation" },
//           { id: "11", title: "Sequel Node title", type: "Sequel" },
//         ],
//         uname: "1Cademy Assistant",
//         actions: [],
//       },
//       {
//         id: "07",
//         type: "READER",
//         hour: "20:00",
//         image: "",
//         content: "klkljg",
//         nodes: [],
//         uname: "1Cademy Assistant",
//         actions: [],
//       },
//       {
//         id: "05",
//         type: "READER",
//         hour: "20:00",
//         image: "",
//         content: "klkljg",
//         nodes: [],
//         uname: "1Cademy Assistant",
//         actions: [],
//       },
//       {
//         id: "06",
//         type: "WRITER",
//         hour: "20:00",
//         image: "",
//         content: "klkljg",
//         nodes: [],
//         uname: "You",
//         actions: [],
//       },
//       {
//         id: "04",
//         type: "WRITER",
//         hour: "20:00",
//         image: "",
//         content: "klkljg",
//         nodes: [],
//         uname: "You",
//         actions: [],
//       },
//       {
//         id: "02",
//         type: "WRITER",
//         hour: "20:00",
//         image: "",
//         content: "What can you tell me about Visual Communications?",
//         nodes: [],
//         uname: "You",
//         actions: [],
//       },
//     ],
//   },
//   {
//     date: "11/11/11",
//     messages: [
//       {
//         id: "08",
//         type: "READER",
//         hour: "20:00",
//         image: "",
//         content: "klkljg",
//         nodes: [{ type: "Idea", id: "dfdgfsdf", title: "adasd" }],
//         uname: "1Cademy Assistant",
//         actions: [],
//       },
//     ],
//   },
// ];

const tempMap = (variant: string): ActionVariant => {
  if (variant === "outline") return "outlined";
  return "contained";
};

type ChatProps = {
  sx?: SxProps<Theme>;
};

export const Chat = ({ sx }: ChatProps) => {
  const db = getFirestore();
  const [{ user, reputation, settings }, { dispatch }] = useAuth();
  // console.log({ user });
  const [messagesObj, setMessagesObj] = useState<Message[]>([]);
  const [speakingMessageId, setSpeakingMessageId] = useState<string>("");
  const chatElementRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [nodesToBeDisplayed, setNodesToBeDisplayed] = useState<NodeLinkType[]>(
    []
  );
  const [tmpNodesToBeDisplayed, setTmpNodesToBeDisplayed] = useState<
    NodeLinkType[]
  >([]);
  const { mode } = useTheme();

  const [userMessage, setUserMessage] = useState("");

  const pushMessage = useCallback(
    (message: MessageData, currentDateYYMMDD: string) => {
      console.log('pushMessage', { message })
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
        console.log("pushMessage", { res })
        const newMessageObj: Message[] = res.found
          ? res.result
          : [...res.result, { date: currentDateYYMMDD, messages: [message] }];
        return newMessageObj;
      });
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
  }, [userMessage, conversationId]);

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
    const copyNodesToBeDisplayed = [...nodesToBeDisplayed];
    const firstElement = copyNodesToBeDisplayed.shift();
    if (!firstElement) return;
    pushMessage(generateNodeMessage(firstElement), getCurrentDateYYMMDD());
    const thereIsNextNode = Boolean(copyNodesToBeDisplayed.length);
    pushMessage(
      generateContinueDisplayingNodeMessage(
        firstElement.title,
        firstElement.unit,
        thereIsNextNode
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

    let onClick = undefined
    if (action.type === "LOCAL_OPEN_NOTEBOOK") {
      onClick = () => {
        console.log("-> Open Notebook");
        const messageWithSelectedAction = generateUserActionAnswer(
          action.title
        );
        pushMessage(messageWithSelectedAction, getCurrentDateYYMMDD());
        setTmpNodesToBeDisplayed([]);
        removeActionOfAMessage(messageId, date);
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
        window.open('https://1cademy.com/notebook', '_blank')?.focus();
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
      }
    }

    return (
      <Button onClick={onClick} variant={action.variant} fullWidth>
        {action.title}
      </Button>
    );
  };

  // useEffect(() => {
  //   scrollToTheEnd();
  // }, [messagesObj]);

  useEffect(() => {
    chrome.runtime.onMessage.addListener((message: IAssistantResponse & { messageType: string }) => {
      if (message.messageType === 'assistant') {
        console.log('answer:message form assistant', { message })
        if (message.is404) {
          console.log(1)
          pushMessage(generateTopicNotFound(message.request ?? ""), getCurrentDateYYMMDD())
        } else {
          console.log(22)
          onPushAssistantMessage({ ...message, nodes: [] })
          const nodesOnMessage = message.nodes ? message.nodes.map(mapNodesToNodeLink) : []
          if (!nodesOnMessage.length) return
          // if there is nodes I need to create a notebook
          pushMessage(generateWhereContinueExplanation('[notebook name here]'), getCurrentDateYYMMDD())
          setTmpNodesToBeDisplayed(nodesOnMessage)
          // if is authenticated create notebook
          // chrome.runtime.sendMessage(chrome.runtime.id || process.env.EXTENSION_ID, {
          //   payload,
          //   messageType: "assistant",
          // });
        }
        setConversationId(message.conversationId)
        setIsLoading(false);
      }
    }
    );
  }, []);

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
      <Box
        sx={{
          width: "100%",
          height: "80px",
          p: "16px 24px",
          display: "grid",
          alignItems: "center",
          gridTemplateColumns: "48px auto",
          gap: "11px",
          borderBottom: `solid 1px ${mode === "light"
            ? DESIGN_SYSTEM_COLORS.gray300
            : DESIGN_SYSTEM_COLORS.notebookG500
            }`,
        }}
      >
        <CustomAvatar
          imageUrl={LOGO_URL}
          alt="onecademy assistant logo"
          size="lg"
        />
        <Box
          sx={{
            display: "flex",
            alignContent: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: "18px",
                color:
                  mode === "dark"
                    ? DESIGN_SYSTEM_COLORS.gray25
                    : DESIGN_SYSTEM_COLORS.gray900,
                fontWeight: 500,
              }}
            >
              1Cademy Assistant
            </Typography>
            <Typography
              sx={{
                fontSize: "14px",
                color:
                  mode === "dark"
                    ? DESIGN_SYSTEM_COLORS.gray100
                    : DESIGN_SYSTEM_COLORS.gray500,

                fontWeight: 400,
              }}
            >
              Powered by GPT-4
            </Typography>
          </Box>
          {messagesObj.length > 0 && (
            <Button onClick={() => setMessagesObj([])}>Clear chat</Button>
          )}
        </Box>
      </Box>

      {/* sticky message */}
      <Box
        sx={{
          width: "100%",
          height: "38px",
          p: "10px 24px",
          display: "grid",
          placeItems: "center",
          borderBottom: `solid 1px ${mode === "light"
            ? DESIGN_SYSTEM_COLORS.gray300
            : DESIGN_SYSTEM_COLORS.notebookG500
            }`,
        }}
      >
        <Typography
          sx={{
            color:
              mode === "light"
                ? DESIGN_SYSTEM_COLORS.gray500
                : DESIGN_SYSTEM_COLORS.gray50,
            fontSize: "12px",
          }}
        >
          This conversation is recorded and can be viewable by instructors
        </Typography>
      </Box>

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
                          {c.uname}
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
                              : DESIGN_SYSTEM_COLORS.primary600
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
                              title={node.title}
                              type={node.type}
                              link={node.link}
                            // id={node.id}
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
      <Box
        sx={{
          width: "100%",
          height: "124px",
          p: "16px 24px",
          borderTop: `solid 1px ${mode === "light"
            ? DESIGN_SYSTEM_COLORS.gray300
            : DESIGN_SYSTEM_COLORS.notebookG500
            }`,
        }}
      >
        <Box
          sx={{
            height: "92px",
            border: `solid 1px ${mode === "light"
              ? DESIGN_SYSTEM_COLORS.gray300
              : DESIGN_SYSTEM_COLORS.notebookG500
              }`,
            borderRadius: "4px",
            backgroundColor:
              mode === "dark"
                ? DESIGN_SYSTEM_COLORS.notebookG700
                : DESIGN_SYSTEM_COLORS.gray100,
          }}
        >
          <InputBase
            id="message-chat"
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.keyCode === 13) && onSubmitMessage()
            }
            fullWidth
            placeholder="Type your message here..."
            sx={{
              p: "10px 14px",
              fontSize: "14px",
              backgroundColor:
                mode === "dark"
                  ? DESIGN_SYSTEM_COLORS.notebookG700
                  : DESIGN_SYSTEM_COLORS.gray100,
              color:
                mode === "dark"
                  ? DESIGN_SYSTEM_COLORS.baseWhite
                  : DESIGN_SYSTEM_COLORS.notebookMainBlack,
              "::placeholder": {
                color: DESIGN_SYSTEM_COLORS.gray500,
              },
            }}
          />
          <Box
            sx={{
              width: "100%",
              p: "0px 8px 8px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <IconButton size="small" sx={{ p: "5px" }}>
              <MicIcon
                sx={{
                  color:
                    mode === "dark"
                      ? DESIGN_SYSTEM_COLORS.gray50
                      : DESIGN_SYSTEM_COLORS.gray500,
                }}
              />
            </IconButton>
            <Button
              onClick={onSubmitMessage}
              variant="contained"
              sx={{
                minWidth: "0px",
                width: "36px",
                height: "36px",
                p: "10px",
                borderRadius: "8px",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7.74976 10.2501L16.4998 1.50014M7.85608 10.5235L10.0462 16.1552C10.2391 16.6513 10.3356 16.8994 10.4746 16.9718C10.5951 17.0346 10.7386 17.0347 10.8592 16.972C10.9983 16.8998 11.095 16.6518 11.2886 16.1559L16.7805 2.08281C16.9552 1.63516 17.0426 1.41133 16.9948 1.26831C16.9533 1.1441 16.8558 1.04663 16.7316 1.00514C16.5886 0.957356 16.3647 1.0447 15.9171 1.21939L1.84398 6.71134C1.34808 6.90486 1.10013 7.00163 1.02788 7.14071C0.965237 7.26129 0.965322 7.40483 1.0281 7.52533C1.10052 7.66433 1.34859 7.7608 1.84471 7.95373L7.47638 10.1438C7.57708 10.183 7.62744 10.2026 7.66984 10.2328C7.70742 10.2596 7.74028 10.2925 7.76709 10.3301C7.79734 10.3725 7.81692 10.4228 7.85608 10.5235Z"
                  stroke="white"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </Box>
        </Box>
      </Box>
    </Stack>
  );
};

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
    nodes: newMessage.nodes ? newMessage.nodes.map(mapNodesToNodeLink) : [],
    type: "READER",
    uname: "1Cademy Assistant",
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
    nodes: [],
    type: "WRITER",
    uname: "You"
  }
  return message
}

const mapNodesToNodeLink = (node: NodeAssistantResponse): NodeLinkType => {
  const nodeCopy = { ...node } as any
  delete nodeCopy.node
  return { ...nodeCopy, id: node.node }
}
