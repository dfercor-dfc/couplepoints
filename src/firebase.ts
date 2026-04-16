import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, onValue, get, update } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyBwiLnMHAw_JFcaOSH_LNkGwdctaRubJ6Y",
  authDomain: "family-points-72ccf.firebaseapp.com",
  databaseURL: "https://family-points-72ccf-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "family-points-72ccf",
  storageBucket: "family-points-72ccf.firebasestorage.app",
  messagingSenderId: "688669853973",
  appId: "1:688669853973:web:38c2b7ceb80d952081011c"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)

export function roomRef(roomId: string) { return ref(db, `rooms/${roomId}`) }
export async function createRoom(roomId: string, initialState: RoomState) { await set(roomRef(roomId), initialState) }
export async function getRoomOnce(roomId: string): Promise<RoomState | null> { const snap = await get(roomRef(roomId)); return snap.exists() ? snap.val() : null }
export function subscribeRoom(roomId: string, cb: (state: RoomState) => void) { return onValue(roomRef(roomId), (snap) => { if (snap.exists()) cb(snap.val()) }) }
export async function updateRoom(roomId: string, partial: Partial<RoomState>) { await update(roomRef(roomId), partial) }

export interface Player { id: number; name: string; emoji: string; points: number; streak: number; totalEarned: number; totalSpent: number }
export interface PendingTask { id: string; taskName: string; taskIcon: string; pts: number; requestedBy: number; pendingFor: number; timestamp: number; status: 'pending' | 'approved' | 'rejected' }
export interface HistoryEntry { id: string; type: 'earn' | 'spend' | 'rejected'; playerId: number; label: string; pts: number; timestamp: number; validated?: boolean }
export interface RoomState { players: Player[]; pending: PendingTask[]; history: HistoryEntry[]; createdAt: number }

export function defaultRoomState(name1 = 'Jugador 1', name2 = 'Jugador 2'): RoomState {
  return {
    players: [
      { id: 0, name: name1, emoji: '👩', points: 0, streak: 0, totalEarned: 0, totalSpent: 0 },
      { id: 1, name: name2, emoji: '👨', points: 0, streak: 0, totalEarned: 0, totalSpent: 0 },
    ],
    pending: [], history: [], createdAt: Date.now(),
  }
}
