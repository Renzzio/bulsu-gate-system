// frontend/src/firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set, update, remove } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDEwKw-Ln1fnPPhcfZ6Y2oizkFOst_YTeo",
  authDomain: "bulsugatesystem.firebaseapp.com",
  databaseURL: "https://bulsugatesystem-default-rtdb.firebaseio.com",
  projectId: "bulsugatesystem",
  storageBucket: "bulsugatesystem.firebasestorage.app",
  messagingSenderId: "728887777947",
  appId: "1:728887777947:web:63656539af99524091843e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get database reference
const db = getDatabase(app);

export { db, ref, onValue, push, set, update, remove };
