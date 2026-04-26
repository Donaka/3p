import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging.js";
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

// Initialize Firebase ONCE
export const app = initializeApp(firebaseConfig);
export const messaging = typeof window !== 'undefined' && 'Notification' in window ? getMessaging(app) : null;
export const auth = getAuth(app);
export { getToken, onMessage };
window.firebaseConfig = firebaseConfig; // Fallback for sw.js or other older scripts if needed
