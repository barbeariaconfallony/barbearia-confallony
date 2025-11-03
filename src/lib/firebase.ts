// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBIVVXaxM-yPYRELT_ZWgRuT0Kcd5dbp6c",
  authDomain: "barbearia-confallony.firebaseapp.com",
  projectId: "barbearia-confallony",
  storageBucket: "barbearia-confallony.firebasestorage.app",
  messagingSenderId: "206443720437",
  appId: "1:206443720437:web:4d1fcaacbf1958a7711fbc",
  measurementId: "G-K24DQ1FXZ8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;