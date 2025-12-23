// lib/firebase.ts
let firebaseExports: any = {};

if (typeof window !== 'undefined') {
  // Only import Firebase modules in the browser
  const { initializeApp, getApps, getApp } = require('firebase/app');
  const { getAuth } = require('firebase/auth');
  const { getFirestore } = require('firebase/firestore');

  const firebaseConfig = {
    apiKey: "AIzaSyCvE-BO2puKDD6ZF0fz9IVCpMnLRqGD6n4",
    authDomain: "tradesitegenie.firebaseapp.com",
    projectId: "tradesitegenie",
    storageBucket: "tradesitegenie.firebasestorage.app",
    messagingSenderId: "692679763264",
    appId: "1:692679763264:web:25bad17a7b382b7554c6a5",
  };

  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  firebaseExports = { app, auth, db };
}

export const app = firebaseExports.app;
export const auth = firebaseExports.auth;
export const db = firebaseExports.db;
