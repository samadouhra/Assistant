import React from 'react'
import { createRoot } from 'react-dom/client'
import ChatApp from './components/ChatApp'
import { AuthProvider } from './utils/AuthContext'
import { initFirebaseClientSDK } from './utils/firestoreClient.config'
initFirebaseClientSDK()

let container = document.getElementById("oa-econ-chat");
if (!container) {
  console.log('will mount')
  container = document.createElement('div');
  container.setAttribute("id", "oa-econ-chat");
  container.style.position = "absolute"
  container.style.zIndex = "2"
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