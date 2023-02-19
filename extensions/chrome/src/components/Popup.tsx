import { Box, Button } from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";

type RecallBotStatus = "notStarted" | "started" | "completed";

const Popup = () => {
  const [botStatus, setBotStatus] = useState<RecallBotStatus>("notStarted");

  useEffect(() => {

    // status change listener
    const listener = (message: string, sender: chrome.runtime.MessageSender) => {
      if(!String(message).startsWith("recall-status-")) return;
      const currentStatus = message.replace("recall-status-", "");
      console.log("currentStatus", currentStatus);
      setBotStatus(currentStatus as RecallBotStatus)
    }
    chrome.runtime.onMessage.addListener(listener)

    // trigger message to receive value of status
    chrome.runtime.sendMessage(chrome.runtime.id, "recall-grading-status");

    return () => chrome.runtime.onMessage.removeListener(listener)
  }, []);

  const onStartRecallGrading = useCallback(() => {
    chrome.runtime.sendMessage(chrome.runtime.id, "start-recall-grading")
  }, [])

  const onStopRecallGrading = useCallback(() => {
    chrome.runtime.sendMessage(chrome.runtime.id, "stop-recall-grading")
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
        <Button variant="contained" color="primary" onClick={onStartRecallGrading}>
          Start Grading Recalls
        </Button>
      ) : (
        <Button variant="contained" color="error" onClick={onStopRecallGrading}>
          Stop Grading Recalls
        </Button>
      )}
    </Box>
  );
}

export default React.memo(Popup);