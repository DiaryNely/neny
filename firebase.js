// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBqFHJtPuMJJK85rgSt1S5hVA97ZMNwTS8",
  authDomain: "neny-2cf61.firebaseapp.com",
  projectId: "neny-2cf61",
  storageBucket: "neny-2cf61.firebasestorage.app",
  messagingSenderId: "930879225204",
  appId: "1:930879225204:web:772cbc4aa6c01c22010021",
  measurementId: "G-V55J3H564D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);