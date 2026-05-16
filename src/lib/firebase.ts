import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { initializeFirestore, doc, setDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use initializeFirestore with settings balanced for both web preview and native execution
const firestoreSettings = {
  experimentalAutoDetectLongPolling: true, // Smarter than forcing it
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
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('[Neur0n] Firestore Identity Sync Failure:', errInfo);
  // Do not throw in production if it's a connectivity issue to avoid crashing the UI
  if (errInfo.error.includes('Could not reach Cloud Firestore backend')) {
     console.warn('[Neur0n] Mesh is in OFFLINE mode.');
     return;
  }
  throw new Error(JSON.stringify(errInfo));
}

export async function syncUserToFirestore(user: any) {
  if (!db) return;
  const userRef = doc(db, 'users', user.uid);
  try {
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

