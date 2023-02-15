import React from 'react'
import { createTheme, ThemeProvider } from "@mui/material";
import { createRoot } from 'react-dom/client'
import Popup from './components/Popup';

let popup = document.getElementById("oa-ext-app");
if(!popup) {
  popup = document.createElement('div');
  popup.setAttribute("id", "oa-ext-popup");
  document.body.appendChild(popup);
}

const theme = createTheme();

const root = createRoot(popup)
root.render(
  <>
    <ThemeProvider theme={theme}>
      <Popup />
    </ThemeProvider>
  </>
);