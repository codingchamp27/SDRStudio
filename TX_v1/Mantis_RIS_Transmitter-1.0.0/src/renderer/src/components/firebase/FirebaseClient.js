import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBE1GbZcjKdZ3088PVvufyMvYzty-xImjs",
  authDomain: "mantisris.firebaseapp.com",
  databaseURL: "https://mantisris-default-rtdb.firebaseio.com",
  projectId: "mantisris",
  storageBucket: "mantisris.firebasestorage.app",
  messagingSenderId: "269488449183",
  appId: "1:269488449183:web:ea7dbb786b9ac211d4e4aa",
  measurementId: "G-HN56LGG9TH"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
