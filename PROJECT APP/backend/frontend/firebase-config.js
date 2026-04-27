import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getMessaging, getToken, onMessage, isSupported as isMessagingSupported } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDFK_jc_iAqH0k2TQ6zWjnPY-v9gyB6iSA",
  authDomain: "pchickenpops.firebaseapp.com",
  projectId: "pchickenpops",
  storageBucket: "pchickenpops.firebasestorage.app",
  messagingSenderId: "335909286449",
  appId: "1:335909286449:web:ce00da23665835cc16db10",
  measurementId: "G-GH4JFZE82L"
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export let messaging = null;
export const firebaseReady = (async () => {
  try {
    if (typeof window !== "undefined") {
      window.__firebaseApp = app;
      window.firebaseConfig = firebaseConfig;
    }
    if (typeof window !== "undefined" && "Notification" in window) {
      const supported = await isMessagingSupported().catch(() => false);
      if (supported) {
        messaging = getMessaging(app);
      }
    }
    if (typeof window !== "undefined") {
      window.__firebaseReady = true;
      window.__firebaseReadyError = null;
    }
    return { app, auth, messaging };
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    if (typeof window !== "undefined") {
      window.__firebaseReady = false;
      window.__firebaseReadyError = error;
    }
    throw error;
  }
})();
export { getToken, onMessage };
