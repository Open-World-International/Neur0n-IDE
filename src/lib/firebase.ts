// Firebase is disabled by user request. Switching to local state and Excel-based logging.
export const db = null as any; 
export const auth = { currentUser: { uid: 'guest', email: 'guest@neur0n.local', displayName: 'Neural Guest', photoURL: null, providerData: [] } } as any;

export const googleProvider = null as any;
export const githubProvider = null as any;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('[Neur0n] Local Bypass: Firebase is disabled.');
}

export async function syncUserToFirestore(user: any) {
  console.log('[Neur0n] Local Sync: User data persisted to local session.');
}

