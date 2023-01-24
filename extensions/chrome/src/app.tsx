import React from 'react'
import { createTheme, ThemeProvider } from "@mui/material";
import { createRoot } from 'react-dom/client'
import FeedbackPopup from './components/FeedbackPopup';

let container = document.getElementById("oa-ext-app");
if(!container) {
  container = document.createElement('div');
  container.setAttribute("id", "oa-ext-app");
  document.body.appendChild(container);
}

const theme = createTheme();

const root = createRoot(container)
root.render(
  <>
    <ThemeProvider theme={theme}>
      <FeedbackPopup />
    </ThemeProvider>
  </>
);