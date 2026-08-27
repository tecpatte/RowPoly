// Client-side mirror of the shapes the backend broadcasts. Kept intentionally
// loose — the server is authoritative, the client only renders.
export interface Tile {
  position: number;
  type: string;
  name: string;
  region?: string;
  description?: string;
  group?: string;
  color?: string;
  price?: number;
  baseRent?: number;
  setRent?: number;
  houseRent?: [number, number, number, number];
  hotelRent?: number;
  houseCost?: number;
  hotelCost?: number;
  deck?: string;
  taxAmount?: number;
}

export interface BoardData {
  tiles: Tile[];
  groupColors: Record<string, string>;
  config: {
    startingMoney: number;
    goReward: number;
    jailBail: number;
    turnSeconds: number;
    transportRent: number[];
    utilityMultiplier: number[];
  };
}

export interface PlayerState {
  id: string;
  userId: string;
  nickname: string;
  color: string;
  order: number;
  position: number;
  money: number;
  inJail: boolean;
  jailTurns: number;
  bankrupt: boolean;
  connected: boolean;
  skipNextTurn: boolean;
  missedTurns: number;
}

export interface Ownership {
  position: number;
  ownerId: string;
  houses: number;
  hotel: boolean;
  mortgaged: boolean;
}

export interface Trade {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  offerMoney: number;
  offerProperties: number[];
  requestMoney: number;
  requestProperties: number[];
  status: string;
}

export interface GameEvent {
  type: string;
  playerId?: string;
  message: string;
  data?: Record<string, unknown>;
  at: number;
}

export interface PendingDebt {
  playerId: string;
  amount: number;
  creditorId: string | null;
  reason: string;
}

export interface GameState {
  id: string;
  code: string;
  phase: 'WAITING' | 'ROLLING' | 'DECISION' | 'ACTION' | 'DEBT' | 'ENDED';
  players: PlayerState[];
  currentTurnIndex: number;
  dice: [number, number] | null;
  doublesCount: number;
  ownerships: Record<number, Ownership>;
  pendingBuyPosition: number | null;
  pendingDebt: PendingDebt | null;
  trades: Trade[];
  log: GameEvent[];
  winnerId: string | null;
  turnDeadline: number | null;
}

export interface Member {
  userId: string;
  nickname: string;
  color: string;
  connected: boolean;
}

export interface RoomSummary {
  id: string;
  code: string;
  status: string;
  hostUserId: string;
  maxPlayers: number;
  isPrivate: boolean;
  startingMoney: number;
  members: Member[];
}

export interface AuthUser {
  id: string;
  nickname: string;
  email: string;
  avatar: string | null;
  isGuest: boolean;
}

export interface ChatMessage {
  nickname: string;
  text: string;
  at: number;
}
