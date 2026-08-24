import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import { ensureAccess } from '../lib/api';
import type { AuthUser, ChatMessage, GameEvent, GameState, RoomSummary } from '../lib/types';

const WS = (import.meta.env.PUBLIC_WS_URL as string) || 'http://localhost:3001';

type View = 'auth' | 'menu' | 'lobby' | 'game';

interface Store {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  socket: Socket | null;
  view: View;
  room: RoomSummary | null;
  state: GameState | null;
  events: GameEvent[];
  chat: ChatMessage[];
  toast: string | null;

  setAuth: (token: string, refreshToken: string, user: AuthUser) => void;
  logout: () => void;
  connect: () => void;
  setView: (v: View) => void;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  command: (command: string, payload?: unknown) => void;
  sendChat: (text: string) => void;
  clearToast: () => void;
  hydrate: () => void | Promise<void>;
}

export const useGame = create<Store>((set, get) => ({
  token: null,
  refreshToken: null,
  user: null,
  socket: null,
  view: 'auth',
  room: null,
  state: null,
  events: [],
  chat: [],
  toast: null,

  hydrate: async () => {
    if (typeof localStorage === 'undefined') return;
    // The api layer refreshes/invalidates tokens transparently; react to it.
    window.addEventListener('rp-auth-lost', () => {
      get().logout();
      set({ toast: 'Tu sesión expiró. Vuelve a entrar.' });
    });
    window.addEventListener('rp-token', (e) => {
      const access = (e as CustomEvent).detail as string;
      set({ token: access });
      // Reconnect the socket with the fresh token so realtime recovers too.
      const s = get().socket;
      if (s) { s.disconnect(); set({ socket: null }); get().connect(); }
    });

    const userRaw = localStorage.getItem('rp_user');
    if (!userRaw) return;
    // Proactively ensure a valid access token so the socket connects cleanly
    // (avoids a transient 401 + failed WS handshake on a stale token).
    const token = await ensureAccess();
    if (!token) { get().logout(); return; }
    set({ token, refreshToken: localStorage.getItem('rp_refresh'), user: JSON.parse(userRaw), view: 'menu' });
    get().connect();
  },

  setAuth: (token, refreshToken, user) => {
    localStorage.setItem('rp_token', token);
    localStorage.setItem('rp_refresh', refreshToken);
    localStorage.setItem('rp_user', JSON.stringify(user));
    set({ token, refreshToken, user, view: 'menu' });
    get().connect();
  },

  logout: () => {
    get().socket?.disconnect();
    localStorage.removeItem('rp_token');
    localStorage.removeItem('rp_refresh');
    localStorage.removeItem('rp_user');
    set({ token: null, user: null, socket: null, view: 'auth', room: null, state: null, events: [], chat: [] });
  },

  connect: () => {
    const { token, socket } = get();
    if (!token || socket) return;
    // Prefer WebSocket, but keep polling as a fallback for hosts/proxies that
    // block raw WS upgrades (common in some production networks).
    const s = io(WS, { auth: { token }, transports: ['websocket', 'polling'] });

    // On (re)connect, re-subscribe to the active room and pull a fresh snapshot.
    s.on('connect', () => {
      const room = get().room;
      if (room) s.emit('get_state', { code: room.code });
    });

    s.on('snapshot', (snap: { room: RoomSummary | null; state: GameState | null }) => {
      if (!snap) return;
      const view: View = snap.state && snap.state.phase !== 'ENDED' ? 'game'
        : snap.state && snap.state.phase === 'ENDED' ? 'game'
        : 'lobby';
      set({ room: snap.room, state: snap.state, view });
    });
    s.on('room_update', (room: RoomSummary) => {
      set((st) => ({ room, view: st.state ? st.view : 'lobby' }));
    });
    s.on('game_state', (state: GameState) => {
      set({ state, view: 'game' });
    });
    s.on('game_events', (events: GameEvent[]) => {
      set((st) => ({ events: [...st.events, ...events].slice(-80) }));
    });
    s.on('chat', (msg: ChatMessage) => set((st) => ({ chat: [...st.chat, msg].slice(-100) })));
    s.on('error_msg', (e: { message: string }) => set({ toast: e.message }));
    s.on('connect_error', (e) => set({ toast: 'Conexión: ' + e.message }));

    set({ socket: s });
  },

  setView: (v) => set({ view: v }),

  joinRoom: (code) => {
    get().connect();
    const s = get().socket;
    s?.emit('join_room', { code });
    set({ view: 'lobby', events: [], chat: [] });
  },

  leaveRoom: () => {
    const { socket, room } = get();
    if (room) socket?.emit('leave_room', { code: room.code });
    set({ room: null, state: null, view: 'menu', events: [], chat: [] });
  },

  startGame: () => {
    const { socket, room } = get();
    if (room) socket?.emit('start_game', { code: room.code });
  },

  command: (command, payload) => {
    const { socket, room } = get();
    if (room) socket?.emit('command', { code: room.code, command, payload });
  },

  sendChat: (text) => {
    const { socket, room } = get();
    if (room && text.trim()) socket?.emit('chat', { code: room.code, text });
  },

  clearToast: () => set({ toast: null }),
}));
