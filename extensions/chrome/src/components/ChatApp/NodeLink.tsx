import { Stack, Typography } from "@mui/material";
import React, { useCallback } from "react";
import { DESIGN_SYSTEM_COLORS } from "../../utils/colors";
import NodeTypeIcon from "./NodeTypeIcon";
import { useTheme } from "../../hooks/useTheme";
import { IViewNodePayload, NodeType } from "../../types";
import MarkdownRender from "./MarkdownRender";

type NodeLinkProps = {
  isAuthenticated: boolean;
  id: string;
  notebookId?: string;
  type: NodeType;
  title: string;
  link: string;
  isAuthenticatedRef: {
    current: boolean
  }
}
export const NodeLink = ({ id, notebookId, title, type, link, isAuthenticated, isAuthenticatedRef }: NodeLinkProps) => {
  const { mode } = useTheme();
  const onOpenNode = useCallback(() => {
    if (!window) return
    if (!notebookId) return
    if (!isAuthenticatedRef.current) return

    // after open link on notebook will open notebook in new tab
    const payload: IViewNodePayload = { notebookId, visible: true };
    chrome.runtime.sendMessage(chrome.runtime.id || process.env.EXTENSION_ID, {
      payload: { apiPayload: payload, nodeId: id },
      messageType: "notebook:open-node",
      linkToOpenNode: link
    });

    chrome.runtime.sendMessage(chrome.runtime.id, {
      type: "SELECT_NOTEBOOK",
      notebookId
    });
    chrome.runtime.sendMessage(chrome.runtime.id, {
      type: "FOCUS_NOTEBOOK"
    });
  }, []);


  return (
    <Stack
      onClick={onOpenNode}
      spacing="8px"
      direction={"row"}
      alignItems={"center"}
      sx={{
        p: "10px 12px",
        backgroundColor:
          mode === "light"
            ? DESIGN_SYSTEM_COLORS.gray100
            : DESIGN_SYSTEM_COLORS.notebookG400,
        borderRadius: "8px",
        boxShadow:
          "0px 1px 2px rgba(0, 0, 0, 0.06), 0px 1px 3px rgba(0, 0, 0, 0.1)",
        cursor: "pointer",
        ":hover": {
          backgroundColor:
            mode === "light"
              ? DESIGN_SYSTEM_COLORS.primary50
              : DESIGN_SYSTEM_COLORS.notebookO200,
        },
      }}
    >
      <NodeTypeIcon nodeType={type} />
      <Typography
        sx={{
          fontSize: "14px",
          color:
            mode === "dark"
              ? DESIGN_SYSTEM_COLORS.gray25
              : DESIGN_SYSTEM_COLORS.gray900,
        }}
      >
        <MarkdownRender text={title} />
      </Typography>
    </Stack>
  );
};
