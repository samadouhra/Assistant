import React from 'react'
import { createRoot } from 'react-dom/client'

let container = document.getElementById("oa-assistant-chat");
if (!container) {
  container = document.createElement('div');
  container.setAttribute("id", "oa-assistant-chat");
  document.body.appendChild(container);
}

const root = createRoot(container)
root.render(
  <React.StrictMode>
    <div>
      App
    </div>
  </React.StrictMode>,
);