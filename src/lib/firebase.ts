import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { initializeFirestore, doc, setDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use initializeFirestore with experimentalForceLongPolling to bypass potential WebSocket blocks in iframe
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

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
    await getDocFromServer(testDoc);
    console.log("Neur0n Mesh Connection: STABLE.");
  } catch (error) {
    console.warn("Neur0n Mesh Connection: OFFLINE / BLOCKED. Check network firewall.");
  }
}
testConnection();

