import { initializeApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// Default config with placeholders
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

let db: Firestore | null = null;

// Only initialize if we have a real project ID (basic check)
const isConfigured = firebaseConfig.projectId && firebaseConfig.projectId !== "YOUR_PROJECT_ID";

if (isConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.warn("Firebase initialization failed, falling back to local storage:", error);
    db = null;
  }
} else {
  console.warn("Firebase config missing or using placeholders. Falling back to local storage.");
  db = null;
}

export { db };