import React, { useEffect, useRef } from "react";
import { brandingLightTheme } from "../utils/brandingTheme";
import "./ChatApp/styles.css";

import CloseIcon from "@mui/icons-material/Close";
import { styled } from "@mui/material/styles";
import {
  Box,
  Button,
  IconButton,
  ThemeProvider,
  Tooltip,
  tooltipClasses,
  TooltipProps,
} from "@mui/material";
import { useState } from "react";
import { DESIGN_SYSTEM_COLORS } from "../utils/colors";
import { Chat, MessageData } from "./ChatApp/Chat";
import { LOGO_URL } from "../utils/constants";
import { useTheme } from "../hooks/useTheme";
import { db } from "../lib/firebase";
import { IAssistantRequestPayload } from "../types";
import { generateExplainSelectedText } from "../utils/messages";

function ChatApp() {
  const [displayAssistant, setDisplayAssistant] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [idToken, setIdToken] = useState("");
  const [appMessages, setAppMessages] = useState<MessageData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  // const chatRef = useRef<any>(null)
  const { mode } = useTheme();

  useEffect(() => {
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (typeof message !== "object" || message === null) return;
      if (message.type === "RECEIVE_ID_TOKEN") {
        console.log("message.token", message.token);
        setIdToken(message.token);
      }
    });
    chrome.runtime.sendMessage(chrome.runtime.id, {
      type: "REQUEST_ID_TOKEN"
    });

    // chrome.runtime.sendMessage(chrome.runtime.id, {
    //   type: "SELECT_NOTEBOOK",
    //   notebookId: "--notebookId--"
    // });
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
    setAppMessages([generateExplainSelectedText(selectedText)])
    setIsLoading(true)
    // console.log('ask:', chatRef.current)
    // if (!chatRef.current) return
    // console.log('ask:doing')
    // chatRef.current.onSetIsLoading(true)
  }

  const onOpenChat = () => {
    setDisplayAssistant(true)
    if (!selectedText) return

    askSelectedTextToAssistant(selectedText)
    setSelectedText("")
    setSelectedTextMouseUpPosition(null)
  }

  const onAskSelectedText = () => {
    askSelectedTextToAssistant(selectedText)
    setSelectedTextMouseUpPosition(null)
    setDisplayAssistant(true)
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
      // console.log('Mouse position relative to page:', positionX, positionY);

      setSelectedText(selectionProcess)
      setSelectedTextMouseUpPosition({ mouseX: positionX, mouseY: positionY })

    }

    document.addEventListener("mouseup", onDetectSelectedText);
    return () => document.removeEventListener('mouseup', onDetectSelectedText)
  }, [])

  return (
    <Box
      className="oassitant-bot"
      sx={{
        "*": {
          boxSizing: "border-box",
          fontFamily: `"Inter", sans-serif`,
        },
      }}
    >
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

      {/* floating buttons */}
      <Box sx={{ position: "fixed", bottom: "38px", right: "38px" }}>
        {displayAssistant && (
          <Button
            onClick={() => setDisplayAssistant(false)}
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
          <CustomWidthTooltip
            open={Boolean(selectedText)}
            title={
              <Box sx={{ textAlign: "center", lineHeight: "18px", fontSize: "12px" }}>
                I can clarify the selected text and respond to your queries.
              </Box>
            }
            placement="top"
          >
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
          </CustomWidthTooltip>
        )}
      </Box>

      {/* chat */}
      {displayAssistant && <Chat isLoading={isLoading} setIsLoading={setIsLoading} appMessages={appMessages} clearAppMessages={() => setAppMessages([])} token={idToken} sx={{ position: "fixed", bottom: "112px", right: "38px" }} />}
    </Box >
  )
}

const ChatAppWrapper = () => (
  <ThemeProvider theme={brandingLightTheme}>
    <ChatApp />
  </ThemeProvider>
);

export default ChatAppWrapper;

const CustomWidthTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))({
  [`& .${tooltipClasses.tooltip}`]: {
    maxWidth: 250,
  },
});
