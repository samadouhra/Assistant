import React from "react";
import { brandingLightTheme } from '../utils/brandingTheme'
import './ChatApp/styles.css'

import CloseIcon from '@mui/icons-material/Close';
import { styled } from '@mui/material/styles';
import { Box, Button, ThemeProvider, Tooltip, tooltipClasses, TooltipProps } from "@mui/material"
import { useState } from "react"
import { DESIGN_SYSTEM_COLORS } from '../utils/colors';
import { Chat } from './ChatApp/Chat';
import { LOGO_URL } from '../utils/constants';


function ChatApp() {
  const [displayAssistant, setDisplayAssistant] = useState(false)
  const [selectedText, setSelectedText] = useState('');

  return (
    <Box sx={{
      "*": {
        boxSizing: 'border-box',
        fontFamily: `"Inter", sans-serif`,
      },
      ".rive-component": {
        width: 'inherit',
        height: 'inherit'
      },
      ".rive-canvas-hidden": {
        opacity: 0
      }
    }}>
      {/* floating buttons */}
      <Box sx={{ position: "fixed", bottom: "38px", right: "38px" }}>
        {displayAssistant && <Button
          onClick={() => setDisplayAssistant(false)}
          sx={{
            minWidth: "0px",
            width: "52px",
            height: "52px",
            backgroundColor: DESIGN_SYSTEM_COLORS.gray50,
            borderRadius: "50%",
            boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.06), 0px 1px 3px rgba(0, 0, 0, 0.1)',
            color: DESIGN_SYSTEM_COLORS.gray800,
            ":hover": {
              backgroundColor: DESIGN_SYSTEM_COLORS.gray300,
            }
          }}>
          <CloseIcon />
        </Button>}

        {
          !displayAssistant && <CustomWidthTooltip open={Boolean(selectedText)} title={<Box sx={{ textAlign: "center" }}>I can clarify the selected text and respond to your queries.</Box>} placement='top'  >
            <Button
              onClick={() => setDisplayAssistant(true)}
              sx={{
                minWidth: "0px",
                width: "52px",
                height: "52px",
                border: `solid 2px ${DESIGN_SYSTEM_COLORS.primary200}`,
                borderRadius: "12px",
                backgroundColor: DESIGN_SYSTEM_COLORS.gray100,
                ":hover": {
                  backgroundColor: DESIGN_SYSTEM_COLORS.gray300,
                }
              }}>
              <img src={LOGO_URL} alt="onecademy assistant logo" style={{ width: "32px", height: "32px" }} />
            </Button>
          </CustomWidthTooltip>
        }
      </Box >

      {/* chat */}
      {displayAssistant && <Chat sx={{ position: "fixed", bottom: "112px", right: "38px" }} />}
    </Box >
  )
}

const ChatAppWrapper = () => <ThemeProvider theme={brandingLightTheme}>
  <ChatApp />
</ThemeProvider>

export default ChatAppWrapper


const CustomWidthTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))({
  [`& .${tooltipClasses.tooltip}`]: {
    maxWidth: 250,
  },
});