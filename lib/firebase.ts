import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDHpV--QSS0L1MNyRP7m2RD-uQyqY4EkAM",
  authDomain: "focusedu-4ccd1.firebaseapp.com",
  projectId: "focusedu-4ccd1",
  storageBucket: "focusedu-4ccd1.appspot.com",
  messagingSenderId: "694054386034",
  appId: "1:694054386034:web:d3d001d6799ca3cfb085eb",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app); // ✅ IMPORTANT

export default app;
