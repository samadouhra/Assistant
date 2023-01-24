import { Box, CircularProgress, Fab, TextField, Tooltip, useTheme } from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOffAltIcon from '@mui/icons-material/ThumbUpOffAlt';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbDownOffAltIcon from '@mui/icons-material/ThumbDownOffAlt';
import React, { useCallback, useId, useMemo, useState } from "react";
import { db } from "../lib/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import { fetchClientInfo } from "../helpers/chatgpt";

declare const createToaster: (toasterType: string, message: string) => void;

const FeedbackPopup = () => {
  const [feedback, setFeedback] = useState("");
  const [hasError, setHasError] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [vote, setVote] = useState<boolean|null>(null);
  const theme = useTheme();
  const feedbackId = useId();

  const oneCademyIcon = useMemo(() => {
    const defaultUrl = "/images/icon.svg";
    try {
      return chrome.runtime.getURL("images/icon.svg") || defaultUrl
    } catch(e) {}
    return defaultUrl;
  }, [])

  const handleSubmit = useCallback(() => {
    if(!feedback.trim()) {
      setHasError(true);
      return;
    }
    setProcessing(true);
    (async () => {
      const clientInfo = await fetchClientInfo();
      const colRef = collection(db, "assistantFeedbacks");
      const feedbackRef = doc(colRef);
      const batch = writeBatch(db);
      batch.set(feedbackRef, {
        feedback,
        clientInfo: {
          country: clientInfo?.loc || "",
          ip: clientInfo?.ip || "",
          uag: clientInfo?.uag || ""
        },
        vote,
        createdAt: new Date()
      })
      await batch.commit();
      createToaster("Success", "We appreciate your feedback.")
      setFeedback("");
      setVote(null);
      setProcessing(false);
    })();
  }, [vote, feedback, setProcessing]);

  return (
    <Box sx={{
      position: "fixed",
      right: "10px",
      top: "10px",
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "right",
      width: "237px"
    }}>
      <Box sx={{
        width: "237px",
        maxWidth: "100%",
        marginBottom: "10px"
      }}>
        <TextField
          sx={{
            backgroundColor: "#fff",
            "textarea": {
              boxShadow: "none !important"
            },
            ".MuiInputBase-root": {
              padding: "10px 12px",
            },
            ".MuiFormLabel-root": {
              lineHeight: "0.9em"
            },
            width: "237px"
          }}
          error={hasError}
          disabled={processing}
          value={feedback}
          onChange={(e) => { setFeedback(e.currentTarget.value); setHasError(false); }}
          id={feedbackId}
          label="Your ideas..."
          variant="outlined"
          multiline={true}
        />
      </Box>
      <Tooltip title="Go to 1cademy.com">
        <Fab sx={{
          marginRight: "auto",
          background: "#ffffff",
          ":hover": {
            background: "rgb(217 217 217)"
          }
        }} size={"small"} aria-label="feedback" onClick={() => window.open("https://1cademy.com", "_blank")}>
          <img src={oneCademyIcon} width={"24px"} />
        </Fab>
      </Tooltip>
      <Box sx={{
        display: "flex",
        justifyContent: "center",
        paddingRight: "14px",
        paddingTop: "10px",
        paddingBottom: "0px",
        margin: "0 auto",
        alignSelf: "center"
      }}>
        <Tooltip title={vote === true ? "Click to remove vote" : "Click to up vote"}>
          <Box
            sx={{
              marginRight: "10px",
              color: theme.palette.success.main
            }}
            onClick={() => setVote((_vote) => _vote !== true ? true : null)}
          >
            {vote === true ? (<ThumbUpIcon />) : (<ThumbUpOffAltIcon />)}
          </Box>
        </Tooltip>
        <Tooltip title={vote === false ? "Click to remove vote" : "Click to down vote"}>
          <Box
            sx={{
              color: theme.palette.error.main
            }}
            onClick={() => setVote((_vote) => _vote !== false ? false : null)}
          >
            {vote === false ? (<ThumbDownIcon />) : (<ThumbDownOffAltIcon />)}
          </Box>
        </Tooltip>
      </Box>
      <Box sx={{
        m: "1",
        position: "relative"
      }}>
        {processing ? (
          <CircularProgress
            size={68}
            sx={{
              color: theme.palette.success.light,
              position: 'absolute',
              top: -6,
              left: -6,
              zIndex: 1,
            }}
          />
        ) : <span />}
        <Fab disabled={processing} size={"small"} color="primary" aria-label="feedback" onClick={handleSubmit}>
          <SendIcon />
        </Fab>
      </Box>
    </Box>
  );
}

export default React.memo(FeedbackPopup);