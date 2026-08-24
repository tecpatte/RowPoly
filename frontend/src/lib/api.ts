import type { AuthUser, BoardData, RoomSummary } from './types';

const API = (import.meta.env.PUBLIC_API_URL as string) || 'http://localhost:3001/api';

// --- token helpers (localStorage is the single source shared with the store) ---
const getAccess = () => (typeof localStorage !== 'undefined' ? localStorage.getItem('rp_token') : null);
const getRefresh = () => (typeof localStorage !== 'undefined' ? localStorage.getItem('rp_refresh') : null);

async function rawFetch(path: string, opts: RequestInit, token?: string) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function req<T>(path: string, opts: RequestInit = {}, token?: string): Promise<T> {
  const { res, data } = await rawFetch(path, opts, token);
  if (!res.ok) throw new Error((data as any).message ?? 'Error de red');
  return data as T;
}

// Try to mint a new access token from the stored refresh token. Broadcasts the
// new tokens so the store can update itself and reconnect its socket.
let refreshing: Promise<string | null> | null = null;
async function refreshAccess(): Promise<string | null> {
  const refresh = getRefresh();
  if (!refresh) return null;
  if (!refreshing) {
    refreshing = fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    })
      .then(async (r) => {
        if (!r.ok) return null;
        const d = (await r.json()) as AuthResponse;
        localStorage.setItem('rp_token', d.accessToken);
        localStorage.setItem('rp_refresh', d.refreshToken);
        window.dispatchEvent(new CustomEvent('rp-token', { detail: d.accessToken }));
        return d.accessToken;
      })
      .catch(() => null)
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

// Authenticated request: uses the stored access token; on a 401 (only) it
// refreshes once and retries. If the refresh token is also dead, signals auth
// loss so the store can log out cleanly instead of surfacing raw 401s.
async function authReq<T>(path: string, opts: RequestInit = {}): Promise<T> {
  let { res, data } = await rawFetch(path, opts, getAccess() ?? undefined);
  if (res.status === 401) {
    const fresh = await refreshAccess();
    if (fresh) {
      ({ res, data } = await rawFetch(path, opts, fresh));
    } else {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('rp-auth-lost'));
      throw new Error('Sesión expirada. Vuelve a entrar.');
    }
  }
  if (!res.ok) throw new Error((data as any).message ?? 'Error de red');
  return data as T;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface Achievement { id: string; title: string; description: string; unlocked: boolean }
export interface Profile extends AuthUser {
  gamesPlayed: number; wins: number; losses: number; bankruptcies: number;
  moneyEarned: number; moneyLost: number; propsAcquired: number; timePlayedSec: number;
  achievements: Achievement[];
}
export interface HistoryRow { code: string; finishedAt: string | null; placement: number; finalMoney: number; isWinner: boolean }

export const api = {
  register: (email: string, nickname: string, password: string) =>
    req<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ email, nickname, password }) }),
  login: (email: string, password: string) =>
    req<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  guest: (nickname: string) =>
    req<AuthResponse>('/auth/guest', { method: 'POST', body: JSON.stringify({ nickname }) }),
  board: () => req<BoardData>('/board'),
  createRoom: (opts: { isPrivate?: boolean; maxPlayers?: number; startingMoney?: number }) =>
    authReq<{ code: string; id: string }>('/rooms', { method: 'POST', body: JSON.stringify(opts) }),
  quickPlay: () => authReq<{ code: string; id: string }>('/rooms/quickplay', { method: 'POST', body: '{}' }),
  listRooms: () => authReq<RoomSummary[]>('/rooms'),
  me: () => authReq<Profile>('/users/me'),
  history: () => authReq<HistoryRow[]>('/users/me/history'),
  leaderboard: () => req<Array<{ nickname: string; wins: number; gamesPlayed: number; moneyEarned: number }>>('/users/leaderboard'),
};

// Decode a JWT's `exp` (seconds) without a library; null if unreadable.
function jwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

// Returns a currently-valid access token, refreshing proactively if the stored
// one is missing/expired. Lets the app connect its socket with a good token on
// load instead of failing the handshake and recovering after a 401.
export async function ensureAccess(): Promise<string | null> {
  const access = getAccess();
  if (access) {
    const exp = jwtExp(access);
    if (exp === null || exp * 1000 > Date.now() + 30_000) return access; // still good
  }
  return refreshAccess();
}

export const money = (n: number) => '$' + n.toLocaleString('es-CO');
