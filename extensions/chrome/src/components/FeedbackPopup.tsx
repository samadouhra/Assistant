import { Box, CircularProgress, Fab, TextField, Tooltip, useTheme } from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOffAltIcon from '@mui/icons-material/ThumbUpOffAlt';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbDownOffAltIcon from '@mui/icons-material/ThumbDownOffAlt';
import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { db } from "../lib/firebase";
import { collection, doc, onSnapshot, query, writeBatch } from "firebase/firestore";
import { fetchClientInfo } from "../helpers/chatgpt";
import { TAssistantStat } from "../types/TAssistantStat";
import { abbreviate } from "../helpers/common";

declare const createToaster: (toasterType: string, message: string) => void;

const FeedbackPopup = () => {
  const [feedback, setFeedback] = useState("");
  const [hasError, setHasError] = useState<boolean>(false);
  const [likes, setLikes] = useState<number>(0);
  const [processing, setProcessing] = useState<boolean>(false);
  const [vote, setVote] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState<boolean>(false);
  const theme = useTheme();
  const feedbackId = useId();

  useEffect(() => {
    onSnapshot(query(collection(db, "assistantStats")), (snapshot) => {
      if (snapshot.docs.length) {
        const statDoc = snapshot.docs[0];
        const statData = statDoc.data() as TAssistantStat;
        setLikes(statData.likes || 0);
      }
    });
  }, [setLikes]);

  // to load current vote
  useEffect(() => {
    const onVoteMessage = async (message: string) => {
      let vote: boolean | null = null;
      try {
        vote = JSON.parse(message.replace(/^current-vote-/, ""));
      } catch (e) { }
      setVote(vote);
      setLoaded(true);
    };
    chrome.runtime.sendMessage(chrome.runtime.id || process.env.EXTENSION_ID, "current-vote");
    chrome.runtime.onMessage.addListener(onVoteMessage);
    return () => chrome.runtime.onMessage.removeListener(onVoteMessage);
  }, [setVote])

  const onVote = useCallback((userVote: boolean | null) => {
    setVote(userVote);
    chrome.runtime.sendMessage(chrome.runtime.id || process.env.EXTENSION_ID, `set-vote-${JSON.stringify(userVote)}`);
  }, [setVote])

  const oneCademyIcon = useMemo(() => {
    const defaultUrl = "/images/icon.svg";
    try {
      return chrome.runtime.getURL("images/icon.svg") || defaultUrl
    } catch (e) { }
    return defaultUrl;
  }, [])

  const handleSubmit = useCallback(() => {
    if (!feedback.trim()) {
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
              boxShadow: "none !important",
              minHeight: "50px"
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
          placeholder="Suggest improvements to 1Cademy extension."
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
              display: "flex",
              fontFamily: "sans-serif",
              marginRight: "10px",
              color: theme.palette.success.main
            }}
            onClick={() => setVote((_vote) => {
              const __vote = _vote !== true ? true : null;
              onVote(__vote);
              return __vote;
            })}
          >
            <Box sx={{
              paddingRight: "2px",
              paddingTop: "2px",
              display: "flex",
              fontFamily: "sans-serif"
            }}>{likes ? `${abbreviate(likes, 2, false, false)} ` : ""}</Box> {vote === true ? (<ThumbUpIcon />) : (<ThumbUpOffAltIcon />)}
          </Box>
        </Tooltip>
        <Tooltip title={vote === false ? "Click to remove vote" : "Click to down vote"}>
          <Box
            sx={{
              color: theme.palette.error.main
            }}
            onClick={() => setVote((_vote) => {
              const __vote = _vote !== false ? false : null;
              onVote(__vote);
              return __vote;
            })}
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
            size={40}
            sx={{
              color: theme.palette.success.light,
              position: 'absolute',
              top: 0,
              left: 0,
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