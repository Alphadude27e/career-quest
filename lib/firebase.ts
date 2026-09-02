import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDf_egX5rvpB2Z5mONQXINKND8Fci8UrD0",
  authDomain: "ai-academic-counsellor.firebaseapp.com",
  projectId: "ai-academic-counsellor",
  storageBucket: "ai-academic-counsellor.appspot.com",
  messagingSenderId: "633059779073",
  appId: "1:633059779073:web:032b828b326e33f3de1600"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();