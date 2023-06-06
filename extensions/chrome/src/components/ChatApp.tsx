import React, {
  useEffect,
  useRef
} from "react";
import { brandingLightTheme } from "../utils/brandingTheme";
import "./ChatApp/styles.css";

import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  IconButton,
  ThemeProvider,
} from "@mui/material";
import {
  useState
} from "react";
import {
  DESIGN_SYSTEM_COLORS
} from "../utils/colors";
import {
  Chat
} from "./ChatApp/Chat";
import {
  LOGO_URL
} from "../utils/constants";
import {
  useTheme
} from "../hooks/useTheme";
import {
  IAssistantRequestPayload, MessageData
} from "../types";
import {
  generateExplainSelectedText
} from "../utils/messages";
import { ONECADEMY_IFRAME_URL } from "../utils/constants";
import { getCurrentDateYYMMDD } from "../utils/date";

function ChatApp() {
  const [displayAssistant, setDisplayAssistant] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isAuthenticatedRef = useRef<boolean>(false);
  const [conversationId, setConversationId] = useState("");
  const chatRef = useRef<{
    pushMessage: (message: MessageData, currentDateYYMMDD: string) => void
  }>({
    pushMessage: () => { }
  });
  const [isLoading, setIsLoading] = useState(false)
  const iframeRef = useRef<null | HTMLIFrameElement>(null);
  const { mode } = useTheme();

  useEffect(() => {
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (typeof message !== "object" || message === null) return;
      if (message.type === "REQUEST_AUTHENTICATED") {
        setIsAuthenticated(message.isAuthenticated);
        isAuthenticatedRef.current = message.isAuthenticated;
        if (!message.isAuthenticated) {
          setTimeout(() => {
            chrome.runtime.sendMessage(chrome.runtime.id, {
              type: "REQUEST_ID_TOKEN"
            });
          }, 500);
        }
      }
    });
    chrome.runtime.sendMessage(chrome.runtime.id, {
      type: "REQUEST_ID_TOKEN"
    });
  }, []);

  const [selectedTextMouseUpPosition, setSelectedTextMouseUpPosition] = useState<{ mouseX: number, mouseY: number } | null>(null);

  const askSelectedTextToAssistant = (selectedText: string) => {
    const payload: IAssistantRequestPayload = {
      actionType: "TeachContent",
      message: selectedText,
    };
    chrome.runtime.sendMessage(chrome.runtime.id || process.env.EXTENSION_ID, {
      payload,
      messageType: "assistant",
    });
    chatRef.current.pushMessage(
      generateExplainSelectedText(selectedText),
      getCurrentDateYYMMDD()
    );
    setIsLoading(true)
  }

  const onOpenChat = () => {
    setDisplayAssistant(true)
    if (!selectedText) return

    askSelectedTextToAssistant(selectedText)
    setSelectedText("")
    setSelectedTextMouseUpPosition(null)
  }

  const onCloseChat = () => {
    setDisplayAssistant(false)
    setIsLoading(false)
  }

  const onAskSelectedText = () => {
    setSelectedTextMouseUpPosition(null)
    setDisplayAssistant(true)
    setTimeout(() => {
      askSelectedTextToAssistant(selectedText)
    }, 100)
  }

  useEffect(() => {

    const onDetectSelectedText = () => {
      var selection = window.getSelection();
      if (!selection) {
        setSelectedTextMouseUpPosition(null)
        setSelectedText("")
        return
      }

      const selectionText = selection.toString();
      const selectionProcess = selectionText.trim()

      if (!selectionProcess) {
        setSelectedTextMouseUpPosition(null)
        setSelectedText("")
        return
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const posX = rect.left + window.pageXOffset;
      const posY = rect.top + window.pageYOffset;

      const elementWidth = 48;
      const elementHeight = 48;
      const shiftX = 20;
      const shiftY = 0;
      const windowHeight = window.innerHeight;
      const positionBelow = posY + shiftX + elementHeight > windowHeight;
      const positionY = positionBelow ? posY - shiftY - elementHeight : posY + shiftY;
      const positionX = posX - shiftX - elementWidth;

      console.log('onDetectSelectedText:', { positionX, positionY })
      setSelectedText(selectionProcess)
      setSelectedTextMouseUpPosition({ mouseX: positionX, mouseY: positionY })

    }

    const selectionMessageListener = (message: any) => {
      if (typeof message !== "object" || message?.type !== "ASSISTANT_SELECTION") return;
      console.log(message, "CHAT_MENUITEM_ID")
      setSelectedText(message.selection as string);
      askSelectedTextToAssistant(message.selection as string);
      setSelectedTextMouseUpPosition(null)
      setDisplayAssistant(true)
    }

    chrome.runtime.onMessage.addListener(selectionMessageListener);

    document.addEventListener("mouseup", onDetectSelectedText);

    return () => {
      document.removeEventListener('mouseup', onDetectSelectedText)
      chrome.runtime.onMessage.removeListener(selectionMessageListener);
    }
  }, [])

  useEffect(() => {
    if (iframeRef.current) {
      const src = iframeRef.current.src;
      iframeRef.current.src = ""
      iframeRef.current.src = src;
    }
  }, [iframeRef]);

  return (
    <>
      <Box sx={{
        position: "fixed",
        top: "0px",
        left: "0px"
      }}>
        <iframe ref={iframeRef} src={ONECADEMY_IFRAME_URL} width={"0px"} height={"0px"} />
      </Box>
      {selectedText && selectedTextMouseUpPosition && <IconButton
        onClick={onAskSelectedText}
        sx={{
          position: "absolute",
          top: selectedTextMouseUpPosition.mouseY,
          left: selectedTextMouseUpPosition.mouseX,
          backgroundColor: mode === "light"
            ? DESIGN_SYSTEM_COLORS.gray100
            : DESIGN_SYSTEM_COLORS.notebookG800,
          ":hover": {
            backgroundColor: mode === "light"
              ? DESIGN_SYSTEM_COLORS.gray200
              : DESIGN_SYSTEM_COLORS.notebookG600,
          }
        }}
      >
        <img
          src={LOGO_URL}
          alt="onecademy assistant logo"
          style={{ width: "32px", height: "32px" }}
        />
      </IconButton>}

      <Box
        className="oassitant-bot"
        sx={{
          position: "absolute",
          zIndex: 2,
          "*": {
            boxSizing: "border-box",
            fontFamily: `"Inter", sans-serif`,
          },
        }}
      >

        {/* floating buttons */}
        <Box sx={{ position: "fixed", bottom: "38px", right: "38px" }}>
          {displayAssistant && (
            <Button
              onClick={onCloseChat}
              sx={{
                minWidth: "0px",
                width: "52px",
                height: "52px",
                backgroundColor:
                  mode === "light"
                    ? DESIGN_SYSTEM_COLORS.gray50
                    : DESIGN_SYSTEM_COLORS.notebookG800,
                borderRadius: "50%",
                boxShadow:
                  "0px 1px 2px rgba(0, 0, 0, 0.06), 0px 1px 3px rgba(0, 0, 0, 0.1)",
                color:
                  mode === "dark"
                    ? DESIGN_SYSTEM_COLORS.gray50
                    : DESIGN_SYSTEM_COLORS.gray800,
                ":hover": {
                  backgroundColor:
                    mode === "light"
                      ? DESIGN_SYSTEM_COLORS.gray250
                      : DESIGN_SYSTEM_COLORS.notebookG500,
                },
              }}
            >
              <CloseIcon />
            </Button>
          )}

          {!displayAssistant && (
            <Button
              onClick={onOpenChat}
              sx={{
                minWidth: "0px",
                width: "52px",
                height: "52px",
                border: `solid 2px ${DESIGN_SYSTEM_COLORS.primary200}`,
                borderRadius: "12px",
                backgroundColor:
                  mode === "light"
                    ? DESIGN_SYSTEM_COLORS.gray250
                    : DESIGN_SYSTEM_COLORS.notebookG800,
                ":hover": {
                  backgroundColor:
                    mode === "light"
                      ? DESIGN_SYSTEM_COLORS.gray250
                      : DESIGN_SYSTEM_COLORS.notebookG500,
                },
              }}
            >
              <img
                src={LOGO_URL}
                alt="onecademy assistant logo"
                style={{ width: "32px", height: "32px" }}
              />
            </Button>
          )}
        </Box>

        {/* chat */}
        {
          displayAssistant &&
          <Chat
            ref={chatRef}
            conversationId={conversationId}
            setConversationId={setConversationId}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            isAuthenticated={isAuthenticated}
            isAuthenticatedRef={isAuthenticatedRef}
            sx={{ position: "fixed", bottom: "112px", right: "38px" }}
          />
        }
      </Box >
    </>
  )
}

const ChatAppWrapper = () => (
  <ThemeProvider theme={brandingLightTheme}>
    <ChatApp />
  </ThemeProvider>
);

export default ChatAppWrapper;