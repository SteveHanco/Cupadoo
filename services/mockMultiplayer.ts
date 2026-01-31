
import { GameState, Player } from '../types';

/**
 * Since we can't provide a real Firebase key, this service simulates 
 * a real-time multiplayer environment using BroadcastChannel.
 * This allows multiple tabs on the same browser to play together.
 */

const CHANNEL_NAME = 'cupadoo_multiplayer';
const broadcast = new BroadcastChannel(CHANNEL_NAME);

export const multiplayerService = {
  createRoom: (hostName: string, hue: number): GameState => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const host: Player = {
      id: Math.random().toString(36).substring(7),
      name: hostName,
      dice: [],
      cupColor: `hsl(${hue}, 70%, 50%)`,
      isHost: true,
      isActive: true,
      isEliminated: false
    };

    // Fix: Add missing lastUpdated property to satisfy GameState interface
    const newState: GameState = {
      id: roomId,
      status: 'waiting',
      players: [host],
      currentTurnIndex: 0,
      logs: [`${hostName} created the room ${roomId}`],
      lastUpdated: Date.now()
    };

    multiplayerService.saveAndSync(newState);
    return newState;
  },

  joinRoom: (roomId: string, name: string, hue: number): GameState | null => {
    const stateStr = localStorage.getItem(`room_${roomId}`);
    if (!stateStr) return null;

    const state: GameState = JSON.parse(stateStr);
    const newPlayer: Player = {
      id: Math.random().toString(36).substring(7),
      name,
      dice: [],
      cupColor: `hsl(${hue}, 70%, 50%)`,
      isHost: false,
      isActive: false,
      isEliminated: false
    };

    state.players.push(newPlayer);
    state.logs.push(`${name} joined the room`);
    multiplayerService.saveAndSync(state);
    return state;
  },

  saveAndSync: (state: GameState) => {
    // Fix: Ensure lastUpdated is refreshed before syncing
    state.lastUpdated = Date.now();
    localStorage.setItem(`room_${state.id}`, JSON.stringify(state));
    broadcast.postMessage({ type: 'UPDATE', state });
  },

  subscribe: (roomId: string, callback: (state: GameState) => void) => {
    const handler = (event: MessageEvent) => {
      if (event.data.type === 'UPDATE' && event.data.state.id === roomId) {
        callback(event.data.state);
      }
    };
    broadcast.addEventListener('message', handler);
    return () => broadcast.removeEventListener('message', handler);
  }
};
