import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDrDsIaPa5GmMwLDkFZJWi4KSI8xGsvig",
  authDomain: "lanchita-gestion.firebaseapp.com",
  projectId: "lanchita-gestion",
  storageBucket: "lanchita-gestion.firebasestorage.app",
  messagingSenderId: "782976912630",
  appId: "1:782976912630:web:f499f91866d40c33a3b0d7",
  measurementId: "G-MNFE7BTE5G"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const isFirebaseConfigured = true;
export default app;
