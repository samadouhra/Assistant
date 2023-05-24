import { Box, Button, Tooltip, Typography } from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";

type RecallBotStatus = "notStarted" | "started" | "completed";

const Popup = () => {
  const [botStatus, setBotStatus] = useState<RecallBotStatus>("notStarted");

  useEffect(() => {
    // status change listener
    const listener = (
      message: string,
      sender: chrome.runtime.MessageSender
    ) => {
      console.log("message message", message);
      if (String(message).startsWith("transcribing-status")) {
        const currentStatus = message.replace("transcribing-status-", "");
        setBotStatus(currentStatus as RecallBotStatus);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    // trigger message to receive value of status
    chrome.runtime.sendMessage(chrome.runtime.id, "transcribing-status");
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const onStartTranscribing = useCallback(() => {
    chrome.runtime.sendMessage(chrome.runtime.id, "start-transcribing");
  }, []);

  const onStopTranscribing = useCallback(() => {
    chrome.runtime.sendMessage(chrome.runtime.id, "stop-transcribing");
  }, []);

  const redLightStyle = {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: "red",
  };

  return (
    <Box
      sx={{
        width: "200px",
        minHeight: "100px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "wrap",
        borderRadius: "20px",
      }}
    >
      <Box
        sx={{
          width: "100%",
          textAlign: "center",
          borderRadius: "20px",
        }}
      ></Box>
      {["notStarted", "completed"].includes(botStatus.trim()) ? (
        <Box>
          <Typography sx={{ mb: "5px" }}>Start Transcribing</Typography>
          <Tooltip title="start transcribing">
            <Button
              variant="contained"
              onClick={onStartTranscribing}
              sx={{
                borderRadius: "26px",
                backgroundColor: "#FF6D00",
                textAlign: "center",
                ml: "25px",
              }}
            >
              Start
            </Button>
          </Tooltip>
        </Box>
      ) : (
        <Box>
          <Typography sx={{ mb: "5px" }}>Stop Transcribing</Typography>
          <Tooltip title="stop transcribing ">
            <Button
              variant="contained"
              color="error"
              onClick={onStopTranscribing}
              sx={{
                borderRadius: "26px",
                backgroundColor: "#91ff35",
                textAlign: "center",
                ml: "25px",
              }}
            >
              Stop
              <Box style={redLightStyle} sx={{ ml: "3px" }} />
            </Button>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};

export default React.memo(Popup);
