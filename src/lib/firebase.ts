import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  memoryLocalCache,
  getFirestore,
  doc, 
  getDocFromServer, 
  setLogLevel 
} from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

// Combined configuration: prioritize local Sandboxed Firebase config in AI Studio preview 
// but fall back/configure to the user's custom production credentials.
const productionConfig = {
  apiKey: "AIzaSyDe6N4Fgl02pz-27N5sDCZhVB5X_SHTiPI",
  authDomain: "moviepulse-256.firebaseapp.com",
  projectId: "moviepulse-256",
  storageBucket: "moviepulse-256.appspot.com",
  messagingSenderId: "673829570223",
  appId: "1:673829570223:web:6613983b25d600c7aff65a",
  measurementId: "G-NKWC9FN1YX"
};

// Check if we are in local sandbox mode or if user has configured custom DB
const useSandbox = window.location.hostname.includes('localhost') || 
                   window.location.hostname.includes('run.app') || 
                   window.location.hostname.includes('stackblitz') ||
                   localStorage.getItem('MP_DATABASE_MODE') === 'sandbox';

const activeConfig = useSandbox ? appletConfig : productionConfig;

const app = getApps().length === 0 ? initializeApp(activeConfig) : getApp();

function createResilientFirestore(app: any, databaseId?: string) {
  const settings: any = {
    experimentalForceLongPolling: true,
  };
  
  try {
    settings.localCache = persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    });
  } catch (cacheErr) {
    console.warn("Firestore persistent LocalCache failed to initialize (usually due to sandboxed iframe permissions). Falling back to memory Cache.", cacheErr);
    settings.localCache = memoryLocalCache();
  }

  try {
    return databaseId 
      ? initializeFirestore(app, settings, databaseId) 
      : initializeFirestore(app, settings);
  } catch (err) {
    console.error("Failed to initializeFirestore with settings, falling back to standard getFirestore:", err);
    return getFirestore(app);
  }
}

// In standard sandboxed Firestore enterprise setup, we use databaseId from config if provided
export const db = useSandbox 
  ? createResilientFirestore(app, (appletConfig as any).firestoreDatabaseId)
  : createResilientFirestore(app);

// Suppress warning/info logs from Firestore (such as offline mode alerts)
setLogLevel('error');

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Check database mode switcher
export function getFirebaseMode() {
  return useSandbox ? 'sandbox' : 'production';
}

export function switchFirebaseMode(mode: 'sandbox' | 'production') {
  localStorage.setItem('MP_DATABASE_MODE', mode);
  window.location.reload();
}

// Test Connection on load
async function testConnection() {
  try {
    if (useSandbox) {
      // Avoid raw 10-second hang if Firestore enterprise sandboxed database is loading/offline
      const connectionPromise = getDocFromServer(doc(db, 'test', 'connection'));
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000));
      await Promise.race([connectionPromise, timeoutPromise]);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client appears to be offline. Verify your internet configuration.");
    } else {
      console.warn("Firebase sandbox database connection tested or offline fallback active.");
    }
  }
}
testConnection();
