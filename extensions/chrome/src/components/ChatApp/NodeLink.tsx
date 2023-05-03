import { Stack, Typography } from "@mui/material";
import React, { useCallback } from "react";
import { DESIGN_SYSTEM_COLORS } from "../../utils/colors";
import { NodeLinkType } from "./Chat";
import NodeTypeIcon from "./NodeTypeIcon";
import { useTheme } from "../../hooks/useTheme";
import { NodeType } from "../../types";

type NodeLinkProps = {
  type: NodeType;
  title: string;
  link: string;
}
export const NodeLink = ({ title, type, link }: NodeLinkProps) => {
  const { mode } = useTheme();
  const onOpenNode = useCallback(() => {
    if (!window) return
    window.open(link, '_blank')?.focus();
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
        {title}
      </Typography>
    </Stack>
  );
};