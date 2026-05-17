import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { initializeFirestore, doc, setDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use initializeFirestore with settings balanced for both web preview and native execution
const firestoreSettings = {
  experimentalForceLongPolling: true, // Standard for restricted environments
  ignoreUndefinedProperties: true,
};

export const db = initializeFirestore(app, firestoreSettings, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  
  // Suppress "Could not reach Cloud Firestore backend" noise in console
  if (errMessage.includes('Could not reach Cloud Firestore backend') || errMessage.includes('offline')) {
     console.warn('[Neur0n] Mesh link is currently in OFFLINE mode. Local state preserved.');
     return;
  }

  console.error('[Neur0n] Mesh Identity Sync Failure:', errInfo);
  // Throwing stringified JSON as per integration requirements for debugging
  throw new Error(JSON.stringify(errInfo));
}

export async function syncUserToFirestore(user: any) {
  if (!db) return;
  const userRef = doc(db, 'users', user.uid);
  try {
    // Attempt background sync
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLogin: serverTimestamp(),
      provider: user.providerData[0]?.providerId || 'unknown'
    }, { merge: true });
    console.log(`[Neur0n] Mesh Identity Synced: ${user.uid}`);
  } catch (error) {
    // Graceful failure for identity sync
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

async function testConnection() {
  console.log("Initiating Neur0n Mesh Handshake (Firestore Test)...");
  try {
    const testDoc = doc(db, '_health_check_', 'connection');
    // Using getDocFromServer as per integration guidelines to verify real connection
    await getDocFromServer(testDoc);
    console.log("Neur0n Mesh Connection: STABLE.");
  } catch (error: any) {
    if (error?.message?.includes('Could not reach Cloud Firestore backend')) {
      console.error("CRITICAL: Neur0n Mesh could not reach the backend. Check internet or proxy settings.");
    } else {
      console.warn("Neur0n Mesh Connection: OFFLINE / Restricted Access.");
    }
  }
}
testConnection();

