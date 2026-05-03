import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface Alert {
  id: string;
  userId: string;
  symbol: string;
  condition: 'above' | 'below';
  targetPrice: number;
  createdAt: any;
  triggered: boolean;
  triggeredAt?: any;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const createAlert = async (symbol: string, condition: 'above' | 'below', targetPrice: number) => {
  if (!auth.currentUser) throw new Error("Unauthorized");
  
  const path = 'alerts';
  try {
    const docRef = await addDoc(collection(db, path), {
      userId: auth.currentUser.uid,
      symbol,
      condition,
      targetPrice,
      createdAt: serverTimestamp(),
      triggered: false
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const deleteAlert = async (alertId: string) => {
  const path = `alerts/${alertId}`;
  try {
    await deleteDoc(doc(db, 'alerts', alertId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const markAlertAsTriggered = async (alertId: string) => {
  const path = `alerts/${alertId}`;
  try {
    await updateDoc(doc(db, 'alerts', alertId), {
      triggered: true,
      triggeredAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const useAlerts = (callback: (alerts: Alert[]) => void) => {
  if (!auth.currentUser) return () => {};

  const q = query(collection(db, 'alerts'), where('userId', '==', auth.currentUser.uid), where('triggered', '==', false));
  
  return onSnapshot(q, (snapshot) => {
    const alerts: Alert[] = [];
    snapshot.forEach((doc) => {
      alerts.push({ id: doc.id, ...doc.data() } as Alert);
    });
    callback(alerts);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'alerts');
  });
};
