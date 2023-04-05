import { Box, Button } from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";

type ContentBotStatus = "notStarted" | "started" | "completed";

const Popup = () => {
  const [botStatus, setBotStatus] = useState<ContentBotStatus>("notStarted");

  useEffect(() => {

    // status change listener
    const listener = (message: string, sender: chrome.runtime.MessageSender) => {
      if(!String(message).startsWith("content-status-")) return;
      const currentStatus = message.replace("content-status-", "");
      setBotStatus(currentStatus as ContentBotStatus)
    }
    chrome.runtime.onMessage.addListener(listener)

    // trigger message to receive value of status
    chrome.runtime.sendMessage(chrome.runtime.id, "content-bot-status");

    return () => chrome.runtime.onMessage.removeListener(listener)
  }, []);

  const onStartContentBot = useCallback(() => {
    chrome.runtime.sendMessage(chrome.runtime.id, "start-content-bot")
  }, [])

  const onStopContentBot = useCallback(() => {
    chrome.runtime.sendMessage(chrome.runtime.id, "stop-content-bot")
  }, [])

  return (
    <Box sx={{
      width: "300px",
      minHeight: "200px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "wrap"
    }}>
      <Box sx={{
        width: "100%",
        textAlign: "center"
      }}>
        Bot Status: {botStatus}
      </Box>
      {["notStarted", "completed"].includes(botStatus) ? (
        <Button variant="contained" color="primary" onClick={onStartContentBot}>
          Start Content Bot
        </Button>
      ) : (
        <Button variant="contained" color="error" onClick={onStopContentBot}>
          Stop Content Bot
        </Button>
      )}
    </Box>
  );
}

export default React.memo(Popup);