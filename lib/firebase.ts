let firebaseExports: any = {};

if (typeof window !== 'undefined') {
  const { initializeApp, getApps, getApp } = require('firebase/app');
  const { getAuth } = require('firebase/auth');
  const { getFirestore } = require('firebase/firestore');

  const firebaseConfig = {
    apiKey: "AIzaSyCvE-BO2puKDD6ZF0fz9IVCpMnLRqGD6n4",
    authDomain: "tradesitegenie.firebaseapp.com",
    projectId: "tradesitegenie",
    storageBucket: "tradesitegenie.firebasestorage.app",
    messagingSenderId: "655550863852",
    appId: "1:655550863852:web:3f1e3d0e3a40e3e8e3e3e3"
  };

  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  firebaseExports = { app, auth, db };
}

export const app = firebaseExports.app;
export const auth = firebaseExports.auth;
export const db = firebaseExports.db;