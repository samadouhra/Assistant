import { Box, Button, Tooltip, Typography } from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import axios from "axios";
import LoadingButton from "@mui/lab/LoadingButton";
import Alert from "@mui/material/Alert";
type RecallBotStatus = "notStarted" | "started" | "completed";

const Popup = () => {
  const [botStatus, setBotStatus] = useState<RecallBotStatus>("notStarted");
  const [markedAttended, setMarkedAttended] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [intreviewStatus, setIntreviewStatus] = useState<boolean>(false);
  const [loadingPage, setLoadingPage] = useState<boolean>(true);

  useEffect(() => {
    // status change listener
    const listener = (
      message: string,
      sender: chrome.runtime.MessageSender
    ) => {
      if (String(message).startsWith("transcribing-status")) {
        const currentStatus = message.replace("transcribing-status-", "");
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    // trigger message to receive value of status
    chrome.runtime.sendMessage(chrome.runtime.id, "transcribing-status");
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  useEffect(() => {
    const checkEntreviewStatus = async () => {
      let fullUrl = "";
      setLoadingPage(true);
      const gptTabs = await chrome.tabs.query({
        url: "https://meet.google.com/*",
        active: true,
      });
      if (gptTabs.length > 0 && gptTabs[0].url) {
        fullUrl = gptTabs[0].url;
        const response: any = await axios.post(
          "https://1cademy.us/api/checkEntreviewStatus",
          {
            meetingURL: fullUrl,
          }
        );
        setIntreviewStatus(response.data.message);
        setMarkedAttended(response.data.attended);
      } else {
        setMarkedAttended(false);
        setIntreviewStatus(false);
      }
      setLoadingPage(false);
    };
    checkEntreviewStatus();
  }, []);

  useEffect(() => {
    const getBotSataus = async () => {
      const storageValues = await chrome.storage.local.get(["transcribing"]);
      if (
        storageValues.transcribing &&
        storageValues.transcribing.hasOwnProperty("status")
      ) {
        setBotStatus(storageValues.transcribing?.status);
      }
    };
    getBotSataus();
  }, []);

  const onStartTranscribing = useCallback(async () => {
    chrome.runtime.sendMessage(chrome.runtime.id, "start-transcribing");
    setBotStatus("started");
  }, []);

  const onStopTranscribing = useCallback(async () => {
    chrome.runtime.sendMessage(chrome.runtime.id, "stop-transcribing");
    await chrome.storage.local.set({
      markedAttended: {
        status: false,
      } as any,
    });
    setBotStatus("notStarted");
  }, []);
  const markAttended = useCallback(async () => {
    try {
      const gptTabs = await chrome.tabs.query({
        url: "https://meet.google.com/*",
        active: true,
      });
      let fullUrl = "";
      if (gptTabs[0].url) {
        fullUrl = gptTabs[0].url;
      }
      setLoading(true);
      await axios.post("https://1cademy.us/api/markEntreviewAttended", {
        meetingURL: fullUrl,
      });
      await chrome.storage.local.set({
        markedAttended: {
          status: true,
        } as any,
      });
      setMarkedAttended(true);
      chrome.runtime.sendMessage(chrome.runtime.id, "start-transcribing");
      setBotStatus("started");
    } catch (error) {
      alert(
        "Error in marking the participant  attended can you refresh the paage and try again please !"
      );
    } finally {
      setLoading(false);
    }
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
      {intreviewStatus ? (
        markedAttended ? (
          ["notStarted", "completed"].includes(botStatus.trim()) ? (
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
          )
        ) : (
          <Box>
            <Tooltip title="Mark Attended and Start Transcribing">
              <LoadingButton
                variant="contained"
                onClick={markAttended}
                loading={loading}
                sx={{
                  borderRadius: "26px",
                  backgroundColor: "#FF6D00",
                  textAlign: "center",
                  ml: "25px",
                }}
              >
                Mark Attended and Start Transcribing
              </LoadingButton>
            </Tooltip>
          </Box>
        )
      ) : loadingPage ? (
        <Box>
          <CircularProgress color="warning" sx={{ margin: "0" }} size="50px" />
        </Box>
      ) : (
        <Box
          sx={{
            width: "100%",
            textAlign: "center",
            borderRadius: "20px",
          }}
        >
          <Alert severity="warning" sx={{ mt: "15px", mb: "15px" }}>
            Works only on 1cademy interview sessions
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default React.memo(Popup);
