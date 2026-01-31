
import { GameState, Player, UserProfile, Stats } from '../types';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  getDoc, 
  updateDoc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

/**
 * REQUIRED FIREBASE SECURITY RULES:
 * 
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /users/{userId} { allow read, write: if request.auth != null && request.auth.uid == userId; }
 *     match /rooms/{roomId} { allow read, write: if request.auth != null; }
 *     match /global/stats { allow read, write: if request.auth != null; }
 *   }
 * }
 */

const firebaseConfig = {
  apiKey: "AIzaSyBf9EnKelcauWdmC2roMnAEqy-B24uqHP4",
  authDomain: "cupadoo-ea45d.firebaseapp.com",
  projectId: "cupadoo-ea45d",
  storageBucket: "cupadoo-ea45d.firebasestorage.app",
  messagingSenderId: "355451671986",
  appId: "1:355451671986:web:1defcfdf9e51e133aac0ab",
  measurementId: "G-1KTMD6C451"
};

let app, db, auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) {
  console.error("Firebase Initialization Error:", e);
}

// Robust check to see if the user has replaced placeholders
const isConfigured = () => {
  return firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("PLACEHOLDER");
};

export const multiplayerService = {
  isConfigured,

  // --- Auth Methods ---
  signUp: async (email: string, pass: string, name: string, hue: number): Promise<UserProfile> => {
    if (!isConfigured()) throw new Error("Firebase config missing keys.");
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    const profile: UserProfile = {
      uid: res.user.uid,
      email,
      displayName: name,
      hue,
      createdAt: Date.now()
    };
    await setDoc(doc(db, "users", res.user.uid), profile);
    return profile;
  },

  signIn: async (email: string, pass: string): Promise<UserProfile> => {
    if (!isConfigured()) throw new Error("Firebase config missing keys.");
    const res = await signInWithEmailAndPassword(auth, email, pass);
    const snap = await getDoc(doc(db, "users", res.user.uid));
    if (!snap.exists()) throw new Error("User profile not found in Firestore.");
    return snap.data() as UserProfile;
  },

  updateUserHue: async (uid: string, hue: number) => {
    if (!isConfigured() || !db) return;
    await updateDoc(doc(db, "users", uid), { hue });
  },

  logout: () => auth && signOut(auth),

  onAuthChange: (callback: (user: UserProfile | null) => void) => {
    if (!auth) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            callback(snap.data() as UserProfile);
          } else {
            callback(null);
          }
        } catch (e: any) {
          if (e.code === 'permission-denied') {
            console.error("FIRESTORE PERMISSION DENIED: Check your Firebase Console Security Rules!");
          }
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  },

  // --- Game Methods ---
  createRoom: async (profile: UserProfile): Promise<GameState> => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const host: Player = {
      id: profile.uid,
      name: profile.displayName,
      dice: [],
      cupColor: `hsl(${profile.hue}, 70%, 50%)`,
      isHost: true,
      isActive: true,
      isEliminated: false
    };

    const newState: GameState = {
      id: roomId,
      status: 'waiting',
      players: [host],
      currentTurnIndex: 0,
      logs: [`${profile.displayName} created the room ${roomId}`],
      lastUpdated: Date.now()
    };

    await setDoc(doc(db, "rooms", roomId), newState);
    return newState;
  },

  joinRoom: async (roomId: string, profile: UserProfile): Promise<GameState | null> => {
    const roomRef = doc(db, "rooms", roomId);
    try {
      const result = await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) return null;

        const state = roomDoc.data() as GameState;
        if (state.status !== 'waiting' && !state.players.find(p => p.id === profile.uid)) {
          throw new Error("Game already in progress");
        }

        if (state.players.find(p => p.id === profile.uid)) return state;

        const newPlayer: Player = {
          id: profile.uid,
          name: profile.displayName,
          dice: [],
          cupColor: `hsl(${profile.hue}, 70%, 50%)`,
          isHost: false,
          isActive: false,
          isEliminated: false
        };

        state.players.push(newPlayer);
        state.logs.push(`${profile.displayName} joined the room`);
        state.lastUpdated = Date.now();

        transaction.update(roomRef, { 
          players: state.players, 
          logs: state.logs, 
          lastUpdated: state.lastUpdated 
        });
        return state;
      });
      return result;
    } catch (e) {
      console.error("Join room failed:", e);
      return null;
    }
  },

  saveState: async (state: GameState) => {
    if (!db) return;
    state.lastUpdated = Date.now();
    await updateDoc(doc(db, "rooms", state.id), { ...state });
  },

  subscribe: (roomId: string, callback: (state: GameState) => void) => {
    if (!db) return () => {};
    return onSnapshot(doc(db, "rooms", roomId), (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as GameState);
      }
    }, (error) => {
      console.error("Room sync error:", error);
    });
  },

  // --- Stats Methods ---
  subscribeToStats: (callback: (stats: Stats) => void) => {
    if (!db) return () => {};
    return onSnapshot(doc(db, "global", "stats"), (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as Stats);
      }
    }, (error) => {
      console.warn("Stats restricted by rules:", error);
    });
  },

  updateGlobalStats: async (update: Partial<Stats> | ((prev: Stats) => Stats)) => {
    if (!db) return;
    const statsRef = doc(db, "global", "stats");
    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(statsRef);
        let current: Stats;
        if (!snap.exists()) {
          current = {
            mostWins: { name: 'None', count: 0 },
            mostLosses: { name: 'None', count: 0 },
            bestCalza: { name: 'None', count: 0, bid: 'N/A' }
          };
          transaction.set(statsRef, current);
        } else {
          current = snap.data() as Stats;
        }

        const next = typeof update === 'function' ? update(current) : { ...current, ...update };
        transaction.update(statsRef, next);
      });
    } catch (e) {
      console.error("Stats write failed", e);
    }
  }
};
