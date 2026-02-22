import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User as FirebaseUser,
  type Unsubscribe,
} from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";
import type { User, ApiResponse } from "@/types";
import { FIREBASE_ERROR_MESSAGES } from "@/lib/constants";

// ============================================
// AUTH STATE LISTENER
// ============================================

export function subscribeToAuthState(
  callback: (user: FirebaseUser | null) => void,
): Unsubscribe {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

// ============================================
// SIGN IN
// ============================================

export async function signIn(
  email: string,
  password: string,
): Promise<ApiResponse<User>> {
  if (!auth || !db) {
    return { success: false, error: "Firebase לא מוגדר" };
  }
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);

    // Fetch user data from Firestore
    const userData = await getUserData(result.user.uid);

    if (!userData) {
      return {
        success: false,
        error: "משתמש לא נמצא במערכת",
      };
    }

    // Update last login
    await updateDoc(doc(db, "users", result.user.uid), {
      lastLogin: serverTimestamp(),
    });

    return {
      success: true,
      data: userData,
    };
  } catch (error) {
    const errorCode = (error as { code?: string }).code ?? "default";
    const message =
      FIREBASE_ERROR_MESSAGES[errorCode] ?? FIREBASE_ERROR_MESSAGES.default;

    return {
      success: false,
      error: message,
    };
  }
}

// ============================================
// SIGN OUT
// ============================================

export async function signOut(): Promise<ApiResponse<void>> {
  if (!auth) return { success: true };
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: "שגיאה בהתנתקות",
    };
  }
}

// ============================================
// RESET PASSWORD
// ============================================

export async function resetPassword(email: string): Promise<ApiResponse<void>> {
  if (!auth) {
    return { success: false, error: "Firebase לא מוגדר" };
  }
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: "נשלח אימייל לאיפוס סיסמה",
    };
  } catch (error) {
    const errorCode = (error as { code?: string }).code ?? "default";
    const message =
      FIREBASE_ERROR_MESSAGES[errorCode] ?? FIREBASE_ERROR_MESSAGES.default;

    return {
      success: false,
      error: message,
    };
  }
}

// ============================================
// GET USER DATA
// ============================================

export async function getUserData(userId: string): Promise<User | null> {
  if (!db) return null;
  try {
    const userDoc = await getDoc(doc(db, "users", userId));

    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();

    return {
      id: userDoc.id,
      email: data.email,
      name: data.name,
      role: data.role ?? "viewer",
      company_id: data.company_id ?? "",
      phone: data.phone,
      avatar: data.avatar,
      isActive: data.isActive ?? true,
      createdAt:
        data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      updatedAt:
        data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}

// ============================================
// UPDATE USER DATA
// ============================================

export async function updateUserData(
  userId: string,
  data: Partial<Omit<User, "id" | "email" | "createdAt">>,
): Promise<ApiResponse<void>> {
  if (!db) return { success: false, error: "Firebase לא מוגדר" };
  try {
    await updateDoc(doc(db, "users", userId), {
      ...data,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: "שגיאה בעדכון פרטי המשתמש",
    };
  }
}

// ============================================
// GET CURRENT USER
// ============================================

export function getCurrentFirebaseUser(): FirebaseUser | null {
  return auth?.currentUser ?? null;
}

export async function getCurrentUser(): Promise<User | null> {
  if (!auth) return null;
  const firebaseUser = auth.currentUser;

  if (!firebaseUser) {
    return null;
  }

  return getUserData(firebaseUser.uid);
}
