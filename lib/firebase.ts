import { getApp, getApps, initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCvE-BO2puKDD6ZF0fz9IVCpMnLRqGD6n4",
  authDomain: "tradesitegenie.firebaseapp.com",
  projectId: "tradesitegenie",
  storageBucket: "tradesitegenie.firebasestorage.app",
  messagingSenderId: "655550863852",
  appId: "1:655550863852:web:3f1e3d0e3a40e3e8e3e3e3"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (typeof window !== 'undefined' && !getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };
