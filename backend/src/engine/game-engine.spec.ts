import { describe, expect, it } from 'vitest';
import { BOARD, CARDS, GAME_CONFIG, PLAYER_COLORS } from './board.config';
import type { Group } from './types';
import { GameEngine } from './game-engine';
import { GameState, Ownership } from './types';

// Deterministic dice: die() = 1 + floor(rng()*6).
const dieVals: Record<number, number> = { 1: 0, 2: 0.2, 3: 0.4, 4: 0.6, 5: 0.8, 6: 0.99 };
function diceRng(pairs: Array<[number, number]>) {
  const seq: number[] = [];
  for (const [a, b] of pairs) seq.push(dieVals[a], dieVals[b]);
  let i = 0;
  return () => (i < seq.length ? seq[i++] : 0);
}
function own(position: number, ownerId: string, extra: Partial<Ownership> = {}): Ownership {
  return { position, ownerId, houses: 0, hotel: false, mortgaged: false, ...extra };
}
function fresh(): GameState {
  const build = new GameEngine(BOARD, CARDS, GAME_CONFIG, Math.random);
  return build.createGame('g1', 'ABCD', [
    { userId: 'u1', nickname: 'Ana' },
    { userId: 'u2', nickname: 'Beto' },
  ], PLAYER_COLORS);
}
function roller(pairs: Array<[number, number]>) {
  return new GameEngine(BOARD, CARDS, GAME_CONFIG, diceRng(pairs));
}

describe('GameEngine — economía autoritativa', () => {
  it('reparte dinero inicial y arranca en ROLLING', () => {
    const s = fresh();
    expect(s.players.every((p) => p.money === 1500)).toBe(true);
    expect(s.phase).toBe('ROLLING');
  });

  it('comprar una propiedad descuenta el precio y asigna dueño', () => {
    const s = fresh();
    roller([[1, 2]]).rollDice(s, 'u1'); // -> pos 3 (Leticia, $60)
    expect(s.phase).toBe('DECISION');
    new GameEngine(BOARD, CARDS, GAME_CONFIG).buyProperty(s, 'u1');
    expect(s.players[0].money).toBe(1500 - 60);
    expect(s.ownerships[3].ownerId).toBe('p0');
  });

  it('cobra renta base al caer en propiedad ajena', () => {
    const s = fresh();
    s.ownerships[3] = own(3, 'p0');
    s.currentTurnIndex = 1;
    roller([[1, 2]]).rollDice(s, 'u2');
    expect(s.players[1].money).toBe(1500 - 4);
    expect(s.players[0].money).toBe(1500 + 4);
  });

  it('grupo de color completo duplica la renta base', () => {
    const s = fresh();
    s.ownerships[1] = own(1, 'p0');
    s.ownerships[3] = own(3, 'p0');
    expect(new GameEngine(BOARD, CARDS, GAME_CONFIG).calculateRent(s, 3, 5)).toBe(8);
  });

  it('renta de transporte escala con la cantidad poseída', () => {
    const s = fresh();
    const e = new GameEngine(BOARD, CARDS, GAME_CONFIG);
    s.ownerships[5] = own(5, 'p0');
    expect(e.calculateRent(s, 5, 0)).toBe(25);
    s.ownerships[15] = own(15, 'p0');
    expect(e.calculateRent(s, 5, 0)).toBe(50);
  });

  it('renta de servicio usa los dados', () => {
    const s = fresh();
    s.ownerships[12] = own(12, 'p0');
    expect(new GameEngine(BOARD, CARDS, GAME_CONFIG).calculateRent(s, 12, 7)).toBe(28); // 7 * 4
  });

  it('pasar por la Salida paga la recompensa', () => {
    const s = fresh();
    s.players[0].position = 39;
    roller([[1, 1]]).rollDice(s, 'u1'); // -> pos 1
    expect(s.players[0].position).toBe(1);
    expect(s.players[0].money).toBe(1700);
  });

  it('tres dobles seguidos mandan al Calabozo', () => {
    const s = fresh();
    const e = roller([[4, 4], [4, 4], [4, 4]]);
    const step = () => {
      e.rollDice(s, 'u1');
      if (s.phase === 'DECISION') e.declineBuy(s, 'u1');
      if (s.phase === 'ACTION') e.endTurn(s, 'u1');
    };
    step(); step(); step();
    expect(s.players[0].inJail).toBe(true);
    expect(s.players[0].position).toBe(10);
  });

  it('rechaza construir sin el grupo completo', () => {
    const s = fresh();
    s.ownerships[1] = own(1, 'p0');
    s.phase = 'ACTION';
    expect(() => new GameEngine(BOARD, CARDS, GAME_CONFIG).buildHouse(s, 'u1', 1)).toThrow();
  });

  it('construye casas parejas y sube la renta', () => {
    const s = fresh();
    s.ownerships[1] = own(1, 'p0');
    s.ownerships[3] = own(3, 'p0');
    s.phase = 'ACTION';
    const e = new GameEngine(BOARD, CARDS, GAME_CONFIG);
    e.buildHouse(s, 'u1', 1);
    expect(s.ownerships[1].houses).toBe(1);
    // even-build: cannot add a 2nd house to pos 1 before pos 3 gets its 1st.
    expect(() => e.buildHouse(s, 'u1', 1)).toThrow();
    expect(e.calculateRent(s, 1, 0)).toBe(10); // 1 house on Sincelejo
  });

  it('no puede comprar sin fondos', () => {
    const s = fresh();
    s.players[0].money = 10;
    roller([[1, 2]]).rollDice(s, 'u1'); // pos 3, price 60 > 10 -> no DECISION
    expect(s.phase).not.toBe('DECISION');
  });

  it('rechaza acciones fuera de turno', () => {
    const s = fresh();
    expect(() => new GameEngine(BOARD, CARDS, GAME_CONFIG).rollDice(s, 'u2')).toThrow('No es tu turno.');
  });

  it('la bancarrota termina la partida con ganador', () => {
    const s = fresh();
    s.players[1].money = 1;
    s.ownerships[24] = own(24, 'p0', { hotel: true }); // Cartagena con hotel
    s.currentTurnIndex = 1;
    s.players[1].position = 21;
    roller([[1, 2]]).rollDice(s, 'u2'); // Beto cae en 24, no puede pagar
    expect(s.players[1].bankrupt).toBe(true);
    expect(s.phase).toBe('ENDED');
    expect(s.winnerId).toBe('p0');
  });

  it('bancarrota sin fin de partida cede el turno al siguiente jugador', () => {
    // 3 jugadores: Beto quiebra pagándole a Ana, pero Carla sigue viva, así que
    // la partida continúa y el turno debe pasar SIN quedar atascado en Beto.
    const s = new GameEngine(BOARD, CARDS, GAME_CONFIG).createGame('g2', 'WXYZ', [
      { userId: 'u1', nickname: 'Ana' },
      { userId: 'u2', nickname: 'Beto' },
      { userId: 'u3', nickname: 'Carla' },
    ], PLAYER_COLORS);
    s.ownerships[24] = own(24, 'p0', { hotel: true }); // Cartagena con hotel de Ana
    s.players[1].money = 1;
    s.players[1].position = 21;
    s.currentTurnIndex = 1; // turno de Beto
    roller([[1, 2]]).rollDice(s, 'u2'); // Beto cae en 24 y quiebra
    expect(s.players[1].bankrupt).toBe(true);
    expect(s.phase).not.toBe('ENDED'); // Carla sigue viva
    expect(s.phase).toBe('ROLLING'); // el turno ya avanzó
    expect(s.currentTurnIndex).toBe(2); // le toca a Carla, no quedó atascado en Beto
  });

  it('el tablero cumple la jerarquía de color obligatoria', () => {
    expect(BOARD).toHaveLength(40);
    expect(new Set(BOARD.map((t) => t.position)).size).toBe(40);
    const order: Group[] = ['BROWN', 'LIGHT_BLUE', 'PINK', 'ORANGE', 'RED', 'YELLOW', 'GREEN', 'DARK_BLUE'];
    const maxPrice = (g: Group) => Math.max(...BOARD.filter((t) => t.group === g).map((t) => t.price!));
    for (let i = 1; i < order.length; i++) {
      expect(maxPrice(order[i])).toBeGreaterThan(maxPrice(order[i - 1]));
    }
    // Azul oscuro contiene las dos propiedades más caras del tablero.
    const dark = BOARD.filter((t) => t.group === 'DARK_BLUE').map((t) => t.price!);
    const topTwo = BOARD.filter((t) => t.type === 'PROPERTY').map((t) => t.price!).sort((a, b) => b - a).slice(0, 2);
    expect(dark.sort((a, b) => b - a)).toEqual(topTwo);
    // Ambas barajas tienen cartas.
    expect(CARDS.filter((c) => c.deck === 'QUE_MAS_PUES').length).toBeGreaterThan(5);
    expect(CARDS.filter((c) => c.deck === 'LA_VUELTA').length).toBeGreaterThan(5);
  });

  it('hipotecar da la mitad del precio y bloquea la renta', () => {
    const s = fresh();
    s.ownerships[3] = own(3, 'p0'); // Leticia $60
    s.phase = 'ACTION';
    const e = new GameEngine(BOARD, CARDS, GAME_CONFIG);
    e.mortgageProperty(s, 'u1', 3);
    expect(s.ownerships[3].mortgaged).toBe(true);
    expect(s.players[0].money).toBe(1530); // +30
    expect(e.calculateRent(s, 3, 0)).toBe(0); // hipotecada no cobra
  });

  it('levantar hipoteca cuesta mitad + 10%', () => {
    const s = fresh();
    s.ownerships[3] = own(3, 'p0', { mortgaged: true });
    s.phase = 'ACTION';
    new GameEngine(BOARD, CARDS, GAME_CONFIG).unmortgageProperty(s, 'u1', 3);
    expect(s.ownerships[3].mortgaged).toBe(false);
    expect(s.players[0].money).toBe(1500 - Math.ceil(30 * 1.1)); // 1467
  });

  it('vender una casa reembolsa la mitad del costo', () => {
    const s = fresh();
    s.ownerships[1] = own(1, 'p0', { houses: 1 });
    s.ownerships[3] = own(3, 'p0', { houses: 1 });
    s.phase = 'ACTION';
    new GameEngine(BOARD, CARDS, GAME_CONFIG).sellBuilding(s, 'u1', 1);
    expect(s.ownerships[1].houses).toBe(0);
    expect(s.players[0].money).toBe(1525); // casa cuesta 50 -> reembolsa 25
  });

  it('no se puede construir con el grupo hipotecado', () => {
    const s = fresh();
    s.ownerships[1] = own(1, 'p0', { mortgaged: true });
    s.ownerships[3] = own(3, 'p0');
    s.phase = 'ACTION';
    expect(() => new GameEngine(BOARD, CARDS, GAME_CONFIG).buildHouse(s, 'u1', 3)).toThrow();
  });

  it('pagar fianza libera del Calabozo antes de lanzar', () => {
    const s = fresh();
    s.players[0].inJail = true;
    s.players[0].position = 10;
    new GameEngine(BOARD, CARDS, GAME_CONFIG).payBail(s, 'u1');
    expect(s.players[0].inJail).toBe(false);
    expect(s.players[0].money).toBe(1450); // fianza 50
  });

  it('rastrea estadísticas de dinero y propiedades', () => {
    const s = fresh();
    roller([[1, 2]]).rollDice(s, 'u1'); // pos 3
    new GameEngine(BOARD, CARDS, GAME_CONFIG).buyProperty(s, 'u1');
    expect(s.players[0].propsBought).toBe(1);
    expect(s.players[0].totalSpent).toBe(60);
  });

  it('un trato intercambia dinero y propiedades atómicamente', () => {
    const s = fresh();
    s.ownerships[1] = own(1, 'p0');
    s.ownerships[6] = own(6, 'p1');
    const e = new GameEngine(BOARD, CARDS, GAME_CONFIG);
    const { trade } = e.proposeTrade(s, 'u1', 'p1', { money: 100, properties: [1] }, { money: 0, properties: [6] });
    e.respondTrade(s, 'u2', trade.id, true);
    expect(s.ownerships[1].ownerId).toBe('p1');
    expect(s.ownerships[6].ownerId).toBe('p0');
    expect(s.players[0].money).toBe(1400);
    expect(s.players[1].money).toBe(1600);
  });
});
