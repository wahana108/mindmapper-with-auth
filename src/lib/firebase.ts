// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";

// Konfigurasi Firebase dibaca dari environment variables (.env.local)
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Inisialisasi aplikasi Firebase, hindari duplikasi
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Inisialisasi Analytics hanya di sisi browser
let analytics;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.error("Firebase Analytics initialization error", error);
  }
}

// Hubungkan ke emulator HANYA saat dalam mode development
if (process.env.NODE_ENV === 'development') {
  try {
    console.log("Development mode: Attempting to connect to Firebase emulators.");
    
    // Alamat host untuk emulator
    const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST?.split(':')[0] || 'localhost';
    const firestorePort = parseInt(process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1] || '8080', 10);
    
    const storageHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST?.split(':')[0] || 'localhost';
    const storagePort = parseInt(process.env.FIREBASE_STORAGE_EMULATOR_HOST?.split(':')[1] || '5004', 10);

    // Auth emulator biasanya berjalan di 9099
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, firestoreHost, firestorePort);
    connectStorageEmulator(storage, storageHost, storagePort);
    
    console.log(`Successfully connected to emulators: Auth (localhost:9099), Firestore (${firestoreHost}:${firestorePort}), Storage (${storageHost}:${storagePort})`);
  } catch (error) {
    console.error("Error connecting to Firebase emulators:", error);
  }
}

export { app, db, storage, auth, googleProvider, analytics };
