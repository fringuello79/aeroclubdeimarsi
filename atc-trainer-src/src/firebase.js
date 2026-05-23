import { initializeApp } from "firebase/app";
import {
  getDatabase, ref, onValue, set, update, remove, onDisconnect,
} from "firebase/database";
import {
  getAuth, signInAnonymously, onAuthStateChanged,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCooxrTmX2i_npnGyHFRpaqEht2u4NZPVw",
  authDomain: "aeroclub-marsi-atc.firebaseapp.com",
  databaseURL: "https://aeroclub-marsi-atc-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "aeroclub-marsi-atc",
  storageBucket: "aeroclub-marsi-atc.firebasestorage.app",
  messagingSenderId: "953328904001",
  appId: "1:953328904001:web:9034ebb0e008a11e0863c0",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export {
  ref, onValue, set, update, remove, onDisconnect,
  signInAnonymously, onAuthStateChanged,
};