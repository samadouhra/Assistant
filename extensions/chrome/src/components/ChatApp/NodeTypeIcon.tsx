import React from "react";
import ArticleIcon from "@mui/icons-material/Article";
import CodeIcon from "@mui/icons-material/Code";
import EmojiObjectsIcon from "@mui/icons-material/EmojiObjects";
// import EventIcon from "@mui/icons-material/Event";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LocalLibraryIcon from "@mui/icons-material/LocalLibrary";
import LockIcon from "@mui/icons-material/Lock";
import MenuBookIcon from "@mui/icons-material/MenuBook";
// import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
// import PersonIcon from "@mui/icons-material/Person";
import ShareIcon from "@mui/icons-material/Share";
import { Box, SxProps } from "@mui/material";
import { SvgIconProps } from "@mui/material/SvgIcon";
import Tooltip, { TooltipProps } from "@mui/material/Tooltip";
import { Theme } from "@mui/system";
import { FC } from "react";
import { NodeType } from "../../types";
import { DESIGN_SYSTEM_COLORS } from "../../utils/colors";

// This component has improvementTypes
// 1. optional tooltip
// 2. and use NodeType from type

type NodeTypeIconProps = {
  tooltipPlacement?: TooltipProps["placement"];
  nodeType?: NodeType;
} & SvgIconProps;

const NodeTypeIcon = ({ nodeType, tooltipPlacement, color = "primary", ...rest }: NodeTypeIconProps) => {
  const defaultSx: SxProps<Theme> = { fontSize: "10px", color: DESIGN_SYSTEM_COLORS.gray25 }
  const renderIcon = () => {
    switch (nodeType) {
      case "Code":
        return <CodeIcon color={color} {...rest} sx={{ ...defaultSx }} />;
      case "Concept":
        return <LocalLibraryIcon color={color} {...rest} sx={{ ...defaultSx }} />;
      case "Relation":
        return <ShareIcon color={color} {...rest} sx={{ ...defaultSx }} />;
      case "Question":
        return <HelpOutlineIcon color={color} {...rest} sx={{ ...defaultSx }} />;
      // case "Profile":
      //   return <PersonIcon color={color} {...rest} />;
      // case "Sequel":
      //   return <MoreHorizIcon color={color} {...rest} />;
      // case "Advertisement":
      //   return <EventIcon color={color} {...rest} />;
      case "Reference":
        return <MenuBookIcon color={color} {...rest} sx={{ ...defaultSx }} />;
      case "Idea":
        return <EmojiObjectsIcon color={color} {...rest} sx={{ ...defaultSx }} />;
      case "News":
        return <ArticleIcon color={color} {...rest} sx={{ ...defaultSx }} />;
      // case "Private":
      //   return <LockIcon color={color} {...rest} />;
      default:
        return <LockIcon color={color} {...rest} sx={{ ...defaultSx }} />;
    }
  };

  if (!nodeType) return null;

  if (tooltipPlacement)
    return (
      <Tooltip title={`${nodeType} node`} placement={tooltipPlacement}>
        <Box sx={{ width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50px", backgroundColor: DESIGN_SYSTEM_COLORS.primary600 }}>
          {renderIcon()}
        </Box>
      </Tooltip>
    );

  return <Box sx={{ width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50px", backgroundColor: DESIGN_SYSTEM_COLORS.primary600 }}>
    {renderIcon()}
  </Box>
};

export default NodeTypeIcon;
