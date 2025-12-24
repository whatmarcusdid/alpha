import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCvE-BO2puKDD6ZF0fz9IVCpMnLRqGD6n4",
  authDomain: "tradesitegenie.firebaseapp.com",
  projectId: "tradesitegenie",
  storageBucket: "tradesitegenie.firebasestorage.app",
  messagingSenderId: "655550863852",
  appId: "1:655550863852:web:3f1e3d0e3a40e3e8e3e3e3"
};

// Initialize Firebase (works on both client and server)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
