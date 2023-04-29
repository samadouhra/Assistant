import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const app_1cademy = initializeApp({
  apiKey: process.env.ONECADEMY_FIREBASE_API_KEY,
  authDomain: process.env.ONECADEMY_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.ONECADEMY_FIREBASE_PROJECT_ID,
  storageBucket: process.env.ONECADEMY_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.ONECADEMY_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.ONECADEMY_FIREBASE_APP_ID,
}, "onecademy");

const db_1cademy = getFirestore(app_1cademy);

const auth_1cademy = getAuth(app_1cademy);
export { db_1cademy, app_1cademy, auth_1cademy };
