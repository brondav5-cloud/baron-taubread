import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate configuration
function validateConfig(): void {
  const requiredKeys = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ];

  const missingKeys = requiredKeys.filter((key) => !process.env[key]);

  if (missingKeys.length > 0 && process.env.NODE_ENV === "development") {
    console.warn(
      `⚠️ Missing Firebase config keys: ${missingKeys.join(", ")}\n` +
        "The app will run with demo data until Firebase is configured.",
    );
  }
}

// Initialize Firebase only once
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

function initializeFirebase(): void {
  if (getApps().length === 0) {
    validateConfig();
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0]!;
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

// Initialize on module load
initializeFirebase();

export { app, auth, db, storage };

// Helper to check if Firebase is properly configured
export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

// Collection paths helper
export function getCollectionPath(
  companyId: string,
  collection: string,
): string {
  return `companies/${companyId}/${collection}`;
}

// Document path helper
export function getDocPath(
  companyId: string,
  collection: string,
  docId: string,
): string {
  return `companies/${companyId}/${collection}/${docId}`;
}
