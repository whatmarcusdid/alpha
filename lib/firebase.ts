let app: any;
let auth: any;
let db: any;
let storage: any;

if (typeof window !== 'undefined') {
  const { initializeApp, getApps, getApp } = require('firebase/app');
  const { getAuth } = require('firebase/auth');
  const { getFirestore } = require('firebase/firestore');
  const { getStorage } = require('firebase/storage');

  const firebaseConfig = {
    apiKey: "AIzaSyCvE-BO2puKDD6ZF0fz9IVCpMnLRqGD6n4",
    authDomain: "tradesitegenie.firebaseapp.com",
    projectId: "tradesitegenie",
    storageBucket: "tradesitegenie.firebasestorage.app",
    messagingSenderId: "655550863852",
    appId: "1:655550863852:web:3f1e3d0e3a40e3e8e3e3e3"
  };

  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };
