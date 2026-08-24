// Framework-agnostic domain types for the RowPoly game engine.
// No NestJS / Socket.IO / Prisma imports allowed here.

export type Group =
  | 'BROWN'
  | 'LIGHT_BLUE'
  | 'PINK'
  | 'ORANGE'
  | 'RED'
  | 'YELLOW'
  | 'GREEN'
  | 'DARK_BLUE';

export type TileType =
  | 'GO'
  | 'PROPERTY'
  | 'TRANSPORT'
  | 'UTILITY'
  | 'TAX'
  | 'CARD'
  | 'JAIL'
  | 'GO_TO_JAIL'
  | 'FREE_PARKING';

export type Deck = 'QUE_MAS_PUES' | 'LA_VUELTA';

export interface Tile {
  position: number; // 0..39
  type: TileType;
  name: string;
  region?: string;
  description?: string;
  group?: Group;
  color?: string; // hex for UI
  price?: number;
  // Property rents indexed by number of houses (0 = base). hotelRent separate.
  baseRent?: number;
  setRent?: number; // full colour set, no houses
  houseRent?: [number, number, number, number]; // 1..4 houses
  hotelRent?: number;
  houseCost?: number;
  hotelCost?: number;
  // Transport / utility
  deck?: Deck; // for CARD tiles
  taxAmount?: number; // for TAX tiles
}

export type CardAction =
  | 'RECEIVE_MONEY'
  | 'PAY_MONEY'
  | 'MOVE_FORWARD'
  | 'MOVE_BACKWARD'
  | 'GO_TO_POSITION'
  | 'GO_TO_JAIL'
  | 'LOSE_TURN'
  | 'EVERYONE_RECEIVES'
  | 'EVERYONE_PAYS'
  | 'PAY_PER_PROPERTY'
  | 'RECEIVE_PER_PROPERTY'
  | 'PAY_PLAYERS'
  | 'RECEIVE_FROM_PLAYERS';

export interface Card {
  id: string;
  deck: Deck;
  title: string;
  description: string;
  action: CardAction;
  amount?: number;
  position?: number; // for GO_TO_POSITION
  movement?: number; // for MOVE_FORWARD / MOVE_BACKWARD
  collectOnPass?: boolean; // for movement cards
}

export interface GameConfig {
  startingMoney: number;
  goReward: number;
  jailBail: number;
  maxJailTurns: number;
  transportRent: [number, number, number, number]; // by count owned 1..4
  utilityMultiplier: [number, number]; // dice * m when owning 1 or 2 utilities
  maxHousesBeforeHotel: number;
  turnSeconds: number;
}

export interface Ownership {
  position: number;
  ownerId: string;
  houses: number; // 0..4
  hotel: boolean;
  mortgaged: boolean;
}

export type Phase =
  | 'WAITING'
  | 'ROLLING'
  | 'DECISION' // player landed on unowned buyable property
  | 'ACTION' // player may build/trade/end turn
  | 'ENDED';

export interface PlayerState {
  id: string; // in-game player id
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
  // Cumulative stats for the profile / leaderboard.
  totalEarned: number;
  totalSpent: number;
  propsBought: number;
}

export interface Trade {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  offerMoney: number;
  offerProperties: number[];
  requestMoney: number;
  requestProperties: number[];
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface GameEvent {
  type: string;
  playerId?: string;
  message: string;
  data?: Record<string, unknown>;
  at: number;
}

export interface GameState {
  id: string;
  code: string;
  phase: Phase;
  players: PlayerState[];
  currentTurnIndex: number;
  dice: [number, number] | null;
  doublesCount: number;
  ownerships: Record<number, Ownership>; // keyed by position
  pendingBuyPosition: number | null;
  trades: Trade[];
  deckPointers: Record<Deck, number>; // shuffled draw pointer
  deckOrder: Record<Deck, number[]>; // shuffled card indexes
  log: GameEvent[];
  winnerId: string | null;
  startedAt: number;
  turnDeadline: number | null;
}
