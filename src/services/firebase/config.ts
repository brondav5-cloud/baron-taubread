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

const DEMO_PLACEHOLDERS = [
  "demo-key-for-development",
  "your-api-key",
  "demo.firebaseapp.com",
  "demo-project",
];

function isFirebaseKeyValid(): boolean {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!key) return false;
  if (DEMO_PLACEHOLDERS.some((p) => key.includes(p))) return false;
  return key.startsWith("AIza");
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

function initializeFirebase(): void {
  if (!isFirebaseKeyValid()) return;
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0] as FirebaseApp;
    }
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch {
    app = auth = db = storage = null;
  }
}

initializeFirebase();

export { app, auth, db, storage };

export function isFirebaseConfigured(): boolean {
  return !!(auth && db);
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
