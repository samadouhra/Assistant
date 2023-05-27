import React from 'react'
import { createRoot } from 'react-dom/client'
import ChatApp from './components/ChatApp'
import { AuthProvider } from './utils/AuthContext'
import { initFirebaseClientSDK } from './utils/firestoreClient.config'
initFirebaseClientSDK()

let container = document.getElementById("oa-assistant-chat");
if (!container) {
  console.log('will mount')
  container = document.createElement('div');
  container.setAttribute("id", "oa-assistant-chat");
  document.body.appendChild(container);
}

const root = createRoot(container)
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ChatApp />
    </AuthProvider>
  </React.StrictMode>,
);