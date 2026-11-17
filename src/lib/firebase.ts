import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Les identifiants du projet Firebase « neny-2cf61 » vivent dans `.env`
 * (voir `.env.example`). Un fichier `.env` par environnement suffit :
 * rien n'est écrit en dur dans le code.
 */
const options: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseConfigured = Boolean(options.apiKey && options.projectId && options.appId);

const app = initializeApp(
  firebaseConfigured
    ? options
    : { apiKey: 'non-configuré', projectId: 'non-configuré', appId: 'non-configuré' },
);

export const auth = getAuth(app);
export const db = getFirestore(app);
