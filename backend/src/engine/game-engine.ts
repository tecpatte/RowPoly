// RowPoly GameEngine — the single authority over game rules.
// Pure TypeScript: no NestJS, Socket.IO, Astro or React. Fully testable.
// The server is the ONLY source of truth; clients send commands, never values.
import {
  Card,
  Deck,
  GameConfig,
  GameEvent,
  GameState,
  Group,
  Ownership,
  Phase,
  PlayerState,
  Tile,
  Trade,
} from './types';

export interface NewPlayer {
  userId: string;
  nickname: string;
}

type Rng = () => number;

export class GameEngine {
  private readonly tilesByPos: Map<number, Tile>;
  private readonly cardsByDeck: Map<Deck, Card[]>;

  constructor(
    private readonly board: Tile[],
    private readonly cards: Card[],
    private readonly config: GameConfig,
    private readonly rng: Rng = Math.random,
  ) {
    this.tilesByPos = new Map(board.map((t) => [t.position, t]));
    this.cardsByDeck = new Map();
    for (const c of cards) {
      const arr = this.cardsByDeck.get(c.deck) ?? [];
      arr.push(c);
      this.cardsByDeck.set(c.deck, arr);
    }
  }

  // ---- Construction -------------------------------------------------------
  createGame(
    id: string,
    code: string,
    players: NewPlayer[],
    colors: string[],
  ): GameState {
    if (players.length < 2) throw new Error('Se necesitan al menos 2 jugadores.');
    const state: GameState = {
      id,
      code,
      phase: 'ROLLING',
      players: players.map((p, i) => ({
        id: `p${i}`,
        userId: p.userId,
        nickname: p.nickname,
        color: colors[i % colors.length],
        order: i,
        position: 0,
        money: this.config.startingMoney,
        inJail: false,
        jailTurns: 0,
        bankrupt: false,
        connected: true,
        skipNextTurn: false,
        missedTurns: 0,
        totalEarned: 0,
        totalSpent: 0,
        propsBought: 0,
      })),
      currentTurnIndex: 0,
      dice: null,
      doublesCount: 0,
      ownerships: {},
      pendingBuyPosition: null,
      trades: [],
      deckPointers: { QUE_MAS_PUES: 0, LA_VUELTA: 0 },
      deckOrder: {
        QUE_MAS_PUES: this.shuffledIndexes('QUE_MAS_PUES'),
        LA_VUELTA: this.shuffledIndexes('LA_VUELTA'),
      },
      log: [],
      winnerId: null,
      startedAt: Date.now(),
      turnDeadline: null,
    };
    this.emit(state, { type: 'GAME_STARTED', message: '¡Arrancó la partida!' });
    this.startTurnDeadline(state);
    return state;
  }

  // ---- Public commands ----------------------------------------------------
  rollDice(state: GameState, userId: string): GameEvent[] {
    const player = this.requireTurn(state, userId);
    if (state.phase !== 'ROLLING') throw new Error('No es momento de lanzar los dados.');
    player.missedTurns = 0; // played this turn → reset the inactivity counter
    const start = state.log.length;

    const d1 = this.die();
    const d2 = this.die();
    state.dice = [d1, d2];
    const total = d1 + d2;
    const isDouble = d1 === d2;
    this.emit(state, {
      type: 'DICE_ROLLED',
      playerId: player.id,
      message: `${player.nickname} sacó ${d1} y ${d2}.`,
      data: { dice1: d1, dice2: d2, total, isDouble },
    });

    if (player.inJail) {
      this.handleJailRoll(state, player, total, isDouble);
      // Paying the jail bail on the last turn can bankrupt the player; end their
      // turn so the game advances instead of stalling until the timeout.
      if ((state.phase as Phase) !== 'ENDED' && player.bankrupt) this.finishTurn(state);
      return state.log.slice(start);
    }

    if (isDouble) {
      state.doublesCount += 1;
      if (state.doublesCount >= 3) {
        this.sendToJail(state, player);
        this.finishTurn(state);
        return state.log.slice(start);
      }
    } else {
      state.doublesCount = 0;
    }

    this.movePlayer(state, player, total);
    // movePlayer mutates state.phase via helpers TS can't track; widen it.
    const phase = state.phase as Phase;
    if (phase === 'ENDED') return state.log.slice(start);
    // A player who went bankrupt this move (rent/tax/card) can't take an ACTION
    // phase; end their turn so the game advances instead of stalling until the
    // turn timeout fires.
    if (player.bankrupt) {
      this.finishTurn(state);
      return state.log.slice(start);
    }
    if (state.pendingBuyPosition === null && !player.inJail && phase !== 'DECISION') {
      state.phase = 'ACTION';
    }
    return state.log.slice(start);
  }

  buyProperty(state: GameState, userId: string): GameEvent[] {
    const player = this.requireTurn(state, userId);
    const pos = state.pendingBuyPosition;
    if (pos === null || state.phase !== 'DECISION') throw new Error('No hay ninguna propiedad para comprar.');
    const tile = this.tile(pos);
    const price = tile.price ?? 0;
    if (player.money < price) throw new Error('No tienes suficiente dinero.');
    const start = state.log.length;

    player.money -= price;
    player.totalSpent += price;
    player.propsBought += 1;
    state.ownerships[pos] = { position: pos, ownerId: player.id, houses: 0, hotel: false, mortgaged: false };
    state.pendingBuyPosition = null;
    state.phase = 'ACTION';
    this.emit(state, {
      type: 'PROPERTY_PURCHASED',
      playerId: player.id,
      message: `${player.nickname} compró ${tile.name} por $${price}.`,
      data: { position: pos, price },
    });
    this.maybeReRoll(state, player);
    return state.log.slice(start);
  }

  declineBuy(state: GameState, userId: string): GameEvent[] {
    const player = this.requireTurn(state, userId);
    if (state.phase !== 'DECISION') throw new Error('No hay ninguna decisión de compra pendiente.');
    const start = state.log.length;
    state.pendingBuyPosition = null;
    state.phase = 'ACTION';
    this.emit(state, { type: 'BUY_DECLINED', playerId: player.id, message: `${player.nickname} no compró.` });
    this.maybeReRoll(state, player);
    return state.log.slice(start);
  }

  buildHouse(state: GameState, userId: string, position: number): GameEvent[] {
    return this.build(state, userId, position, false);
  }

  buildHotel(state: GameState, userId: string, position: number): GameEvent[] {
    return this.build(state, userId, position, true);
  }

  // Raise cash on your turn by mortgaging an unbuilt property (half its price).
  mortgageProperty(state: GameState, userId: string, position: number): GameEvent[] {
    const player = this.requireTurn(state, userId);
    const owner = state.ownerships[position];
    const tile = this.tile(position);
    if (!owner || owner.ownerId !== player.id) throw new Error('No eres dueño de esa propiedad.');
    if (owner.mortgaged) throw new Error('Ya está hipotecada.');
    if (owner.houses > 0 || owner.hotel) throw new Error('Vende las construcciones antes de hipotecar.');
    const start = state.log.length;
    const value = Math.floor((tile.price ?? 0) / 2);
    owner.mortgaged = true;
    this.credit(player, value);
    this.emit(state, { type: 'PROPERTY_MORTGAGED', playerId: player.id, message: `${player.nickname} hipotecó ${tile.name} por $${value}.`, data: { position, value } });
    return state.log.slice(start);
  }

  // Lift a mortgage by paying half the price + 10% interest.
  unmortgageProperty(state: GameState, userId: string, position: number): GameEvent[] {
    const player = this.requireTurn(state, userId);
    const owner = state.ownerships[position];
    const tile = this.tile(position);
    if (!owner || owner.ownerId !== player.id) throw new Error('No eres dueño de esa propiedad.');
    if (!owner.mortgaged) throw new Error('Esa propiedad no está hipotecada.');
    const cost = Math.ceil(((tile.price ?? 0) / 2) * 1.1);
    if (player.money < cost) throw new Error('No tienes dinero para levantar la hipoteca.');
    const start = state.log.length;
    player.money -= cost;
    player.totalSpent += cost;
    owner.mortgaged = false;
    this.emit(state, { type: 'PROPERTY_UNMORTGAGED', playerId: player.id, message: `${player.nickname} levantó la hipoteca de ${tile.name} por $${cost}.`, data: { position, cost } });
    return state.log.slice(start);
  }

  // Sell one building back to the bank for half cost. A hotel downgrades to 4 houses.
  sellBuilding(state: GameState, userId: string, position: number): GameEvent[] {
    const player = this.requireTurn(state, userId);
    if (state.phase !== 'ACTION') throw new Error('Solo puedes vender en tu turno, tras mover.');
    const owner = state.ownerships[position];
    const tile = this.tile(position);
    if (!owner || owner.ownerId !== player.id) throw new Error('No eres dueño de esa propiedad.');
    const start = state.log.length;
    if (owner.hotel) {
      owner.hotel = false;
      owner.houses = this.config.maxHousesBeforeHotel;
      this.credit(player, Math.floor((tile.hotelCost ?? 0) / 2));
      this.emit(state, { type: 'BUILDING_SOLD', playerId: player.id, message: `${player.nickname} vendió el hotel de ${tile.name}.`, data: { position, hotel: true } });
    } else if (owner.houses > 0) {
      if (!this.evenSell(state, tile.group!, position)) throw new Error('Debes vender de forma pareja (desde la más construida).');
      owner.houses -= 1;
      this.credit(player, Math.floor((tile.houseCost ?? 0) / 2));
      this.emit(state, { type: 'BUILDING_SOLD', playerId: player.id, message: `${player.nickname} vendió una casa de ${tile.name} (${owner.houses}).`, data: { position, houses: owner.houses } });
    } else {
      throw new Error('No hay construcciones para vender.');
    }
    return state.log.slice(start);
  }

  // Pay the bail to leave the Calabozo before rolling this turn.
  payBail(state: GameState, userId: string): GameEvent[] {
    const player = this.requireTurn(state, userId);
    if (!player.inJail) throw new Error('No estás en el Calabozo.');
    if (state.phase !== 'ROLLING') throw new Error('Solo puedes pagar la fianza al inicio de tu turno.');
    if (player.money < this.config.jailBail) throw new Error('No tienes para la fianza.');
    const start = state.log.length;
    this.charge(state, player, this.config.jailBail, null, 'Fianza del Calabozo');
    player.inJail = false;
    player.jailTurns = 0;
    this.emit(state, { type: 'JAIL_RELEASED', playerId: player.id, message: `${player.nickname} pagó la fianza y quedó libre.` });
    return state.log.slice(start);
  }

  endTurn(state: GameState, userId: string): GameEvent[] {
    const player = this.requireTurn(state, userId);
    if (state.phase !== 'ACTION') throw new Error('Todavía no puedes terminar el turno.');
    const start = state.log.length;
    // Doubles grant another roll instead of ending.
    if (state.doublesCount > 0 && !player.inJail) {
      state.phase = 'ROLLING';
      this.emit(state, { type: 'EXTRA_ROLL', playerId: player.id, message: `${player.nickname} sacó dobles: lanza de nuevo.` });
      this.startTurnDeadline(state);
      return state.log.slice(start);
    }
    this.finishTurn(state);
    return state.log.slice(start);
  }

  // Called by the manager when a turn times out.
  forceEndTurn(state: GameState): GameEvent[] {
    const start = state.log.length;
    const player = this.current(state);
    player.missedTurns += 1;
    this.emit(state, { type: 'TURN_TIMEOUT', playerId: player.id, message: `${player.nickname} se pasó de tiempo (${player.missedTurns}/2).`, data: { missedTurns: player.missedTurns } });
    // Cancel any pending buy / doubles chain and move on.
    state.pendingBuyPosition = null;
    state.doublesCount = 0;
    // Two consecutive timeouts → eliminate the player and free their properties
    // (creditor null ⇒ ownerships deleted, so they're buyable again).
    if (player.missedTurns >= this.config.maxMissedTurns) {
      this.emit(state, { type: 'PLAYER_ELIMINATED', playerId: player.id, message: `${player.nickname} fue eliminado por no jugar en ${this.config.maxMissedTurns} turnos. Sus propiedades quedaron libres.`, data: { playerId: player.id } });
      this.bankrupt(state, player, null, `no jugó en ${this.config.maxMissedTurns} turnos`);
    }
    if ((state.phase as Phase) !== 'ENDED') this.finishTurn(state);
    return state.log.slice(start);
  }

  // ---- Trading ------------------------------------------------------------
  proposeTrade(
    state: GameState,
    userId: string,
    toPlayerId: string,
    offer: { money: number; properties: number[] },
    request: { money: number; properties: number[] },
  ): { events: GameEvent[]; trade: Trade } {
    const from = this.playerByUser(state, userId);
    const to = this.player(state, toPlayerId);
    this.assertOwns(state, from.id, offer.properties);
    this.assertOwns(state, to.id, request.properties);
    if (offer.money < 0 || request.money < 0) throw new Error('Montos inválidos.');
    if (from.money < offer.money) throw new Error('No tienes ese dinero para ofrecer.');
    const trade: Trade = {
      id: `t${state.trades.length}-${Date.now()}`,
      fromPlayerId: from.id,
      toPlayerId: to.id,
      offerMoney: offer.money,
      offerProperties: offer.properties,
      requestMoney: request.money,
      requestProperties: request.properties,
      status: 'PENDING',
    };
    state.trades.push(trade);
    const start = state.log.length;
    this.emit(state, { type: 'TRADE_PROPOSED', playerId: from.id, message: `${from.nickname} propuso un trato a ${to.nickname}.`, data: { tradeId: trade.id } });
    return { events: state.log.slice(start), trade };
  }

  respondTrade(state: GameState, userId: string, tradeId: string, accept: boolean): GameEvent[] {
    const trade = state.trades.find((t) => t.id === tradeId);
    if (!trade || trade.status !== 'PENDING') throw new Error('El trato ya no está disponible.');
    const responder = this.playerByUser(state, userId);
    if (responder.id !== trade.toPlayerId) throw new Error('Este trato no es para ti.');
    const start = state.log.length;
    if (!accept) {
      trade.status = 'REJECTED';
      this.emit(state, { type: 'TRADE_REJECTED', playerId: responder.id, message: `${responder.nickname} rechazó el trato.`, data: { tradeId } });
      return state.log.slice(start);
    }
    const from = this.player(state, trade.fromPlayerId);
    const to = this.player(state, trade.toPlayerId);
    // Re-validate ownership and funds atomically before applying.
    this.assertOwns(state, from.id, trade.offerProperties);
    this.assertOwns(state, to.id, trade.requestProperties);
    if (from.money < trade.offerMoney || to.money < trade.requestMoney) throw new Error('Alguno no tiene el dinero acordado.');

    from.money += trade.requestMoney - trade.offerMoney;
    to.money += trade.offerMoney - trade.requestMoney;
    for (const p of trade.offerProperties) state.ownerships[p].ownerId = to.id;
    for (const p of trade.requestProperties) state.ownerships[p].ownerId = from.id;
    trade.status = 'ACCEPTED';
    this.emit(state, { type: 'TRADE_ACCEPTED', playerId: responder.id, message: `${from.nickname} y ${to.nickname} cerraron un trato.`, data: { tradeId } });
    return state.log.slice(start);
  }

  // Voluntary surrender: liquidate to the bank and drop out. Allowed on any turn.
  declareBankruptcy(state: GameState, userId: string): GameEvent[] {
    if (state.phase === 'ENDED') throw new Error('La partida ya terminó.');
    const player = this.playerByUser(state, userId);
    if (player.bankrupt) throw new Error('Ya estás fuera de la partida.');
    const start = state.log.length;
    const wasCurrent = this.current(state).id === player.id;
    this.bankrupt(state, player, null, 'se rindió');
    if (wasCurrent && (state.phase as Phase) !== 'ENDED') this.finishTurn(state);
    return state.log.slice(start);
  }

  // ---- Reconnection helpers ----------------------------------------------
  setConnected(state: GameState, userId: string, connected: boolean): void {
    const p = state.players.find((pl) => pl.userId === userId);
    if (p) p.connected = connected;
  }

  // ---- Core movement / landing -------------------------------------------
  private movePlayer(state: GameState, player: PlayerState, steps: number): void {
    const from = player.position;
    const to = (from + steps) % 40;
    if (to < from) this.passGo(state, player);
    player.position = to;
    this.emit(state, {
      type: 'PLAYER_MOVED',
      playerId: player.id,
      message: `${player.nickname} avanzó a ${this.tile(to).name}.`,
      data: { from, to, steps },
    });
    // Utility rent scales with the actual dice roll, not the (possibly card-driven) step count.
    const diceTotal = state.dice ? state.dice[0] + state.dice[1] : steps;
    this.resolveLanding(state, player, diceTotal);
  }

  private moveTo(state: GameState, player: PlayerState, target: number, collectGo: boolean): void {
    const from = player.position;
    if (collectGo && target <= from && target !== from) this.passGo(state, player);
    else if (collectGo && target === 0 && from !== 0) this.passGo(state, player);
    player.position = target;
    this.emit(state, { type: 'PLAYER_MOVED', playerId: player.id, message: `${player.nickname} se movió a ${this.tile(target).name}.`, data: { from, to: target } });
    this.resolveLanding(state, player, state.dice ? state.dice[0] + state.dice[1] : 0);
  }

  private passGo(state: GameState, player: PlayerState): void {
    this.credit(player, this.config.goReward);
    this.emit(state, { type: 'PASSED_GO', playerId: player.id, message: `${player.nickname} pasó por la Salida y cobró $${this.config.goReward}.`, data: { amount: this.config.goReward } });
  }

  private resolveLanding(state: GameState, player: PlayerState, diceTotal: number): void {
    const tile = this.tile(player.position);
    switch (tile.type) {
      case 'GO': {
        // Landing exactly on Salida pays a bonus on top of the pass reward
        // (passGo already credited goReward during the move), so 200 -> 300.
        const bonus = Math.round(this.config.goReward / 2);
        this.credit(player, bonus);
        this.emit(state, { type: 'PASSED_GO', playerId: player.id, message: `${player.nickname} cayó justo en la Salida y cobró $${bonus} extra.`, data: { amount: bonus } });
        return;
      }
      case 'JAIL': // just visiting
      case 'FREE_PARKING':
        return; // nothing happens
      case 'GO_TO_JAIL':
        this.sendToJail(state, player);
        this.finishTurn(state);
        return;
      case 'TAX': {
        const tax = tile.taxAmount ?? 0;
        this.charge(state, player, tax, null, `Impuesto: ${tile.name}`);
        this.emit(state, {
          type: 'TAX_PAID',
          playerId: player.id,
          message: `${player.nickname} pagó $${tax} de ${tile.name}.`,
          data: { amount: tax, position: player.position },
        });
        return;
      }
      case 'CARD':
        this.drawCard(state, player, tile.deck!);
        return;
      case 'PROPERTY':
      case 'TRANSPORT':
      case 'UTILITY': {
        const owner = state.ownerships[player.position];
        if (!owner) {
          // Unowned: offer to buy if affordable, else nothing.
          if ((tile.price ?? 0) <= player.money) {
            state.pendingBuyPosition = player.position;
            state.phase = 'DECISION';
          }
          return;
        }
        if (owner.ownerId === player.id || owner.mortgaged) return;
        const rent = this.calculateRent(state, player.position, diceTotal);
        const ownerPlayer = this.player(state, owner.ownerId);
        this.charge(state, player, rent, owner.ownerId, `Renta de ${tile.name}`);
        this.emit(state, {
          type: 'RENT_PAID',
          playerId: player.id,
          message: `${player.nickname} le pagó $${rent} de renta a ${ownerPlayer.nickname}.`,
          data: { amount: rent, to: owner.ownerId, position: player.position },
        });
        return;
      }
    }
  }

  // ---- Rent ---------------------------------------------------------------
  calculateRent(state: GameState, position: number, diceTotal: number): number {
    const tile = this.tile(position);
    const owner = state.ownerships[position];
    if (!owner || owner.mortgaged) return 0;
    if (tile.type === 'PROPERTY') {
      if (owner.hotel) return tile.hotelRent!;
      if (owner.houses > 0) return tile.houseRent![owner.houses - 1];
      if (this.ownsFullGroup(state, owner.ownerId, tile.group!)) return tile.setRent!;
      return tile.baseRent!;
    }
    if (tile.type === 'TRANSPORT') {
      const count = this.countType(state, owner.ownerId, 'TRANSPORT');
      return this.config.transportRent[Math.min(count, 4) - 1];
    }
    if (tile.type === 'UTILITY') {
      const count = this.countType(state, owner.ownerId, 'UTILITY');
      const m = this.config.utilityMultiplier[Math.min(count, 2) - 1];
      return diceTotal * m;
    }
    return 0;
  }

  // ---- Cards --------------------------------------------------------------
  private drawCard(state: GameState, player: PlayerState, deck: Deck): void {
    const order = state.deckOrder[deck];
    const list = this.cardsByDeck.get(deck) ?? [];
    const idx = order[state.deckPointers[deck] % order.length];
    state.deckPointers[deck] += 1;
    const card = list[idx];
    this.emit(state, { type: 'CARD_DRAWN', playerId: player.id, message: `${player.nickname}: "${card.title}" — ${card.description}`, data: { deck, card } });
    this.resolveCard(state, player, card);
  }

  private resolveCard(state: GameState, player: PlayerState, card: Card): void {
    const amt = card.amount ?? 0;
    switch (card.action) {
      case 'RECEIVE_MONEY':
        this.credit(player, amt);
        break;
      case 'PAY_MONEY':
        this.charge(state, player, amt, null, card.title);
        break;
      case 'MOVE_FORWARD':
        this.movePlayer(state, player, card.movement ?? 0);
        return;
      case 'MOVE_BACKWARD': {
        const to = (player.position - (card.movement ?? 0) + 40) % 40;
        player.position = to;
        this.emit(state, { type: 'PLAYER_MOVED', playerId: player.id, message: `${player.nickname} retrocedió a ${this.tile(to).name}.`, data: { to } });
        this.resolveLanding(state, player, state.dice ? state.dice[0] + state.dice[1] : 0);
        return;
      }
      case 'GO_TO_POSITION':
        this.moveTo(state, player, card.position ?? 0, true);
        return;
      case 'GO_TO_JAIL':
        this.sendToJail(state, player);
        this.finishTurn(state);
        return;
      case 'LOSE_TURN':
        player.skipNextTurn = true;
        break;
      case 'EVERYONE_RECEIVES':
        for (const p of this.solvent(state)) this.credit(p, amt);
        break;
      case 'EVERYONE_PAYS':
        for (const p of this.solvent(state)) {
          if (p.bankrupt) continue;
          this.charge(state, p, amt, null, card.title);
        }
        break;
      case 'PAY_PER_PROPERTY':
        this.charge(state, player, amt * this.ownedCount(state, player.id), null, card.title);
        break;
      case 'RECEIVE_PER_PROPERTY':
        this.credit(player, amt * this.ownedCount(state, player.id));
        break;
      case 'PAY_PLAYERS':
        for (const p of this.solvent(state)) {
          if (p.id === player.id || player.bankrupt) continue; // stop once the payer is out
          this.charge(state, player, amt, p.id, card.title);
        }
        break;
      case 'RECEIVE_FROM_PLAYERS':
        for (const p of this.solvent(state)) {
          if (p.id === player.id || p.bankrupt) continue;
          this.charge(state, p, amt, player.id, card.title);
        }
        break;
    }
    this.emit(state, { type: 'CARD_RESOLVED', playerId: player.id, message: `Se resolvió "${card.title}".`, data: { cardId: card.id } });
  }

  // ---- Building -----------------------------------------------------------
  private build(state: GameState, userId: string, position: number, hotel: boolean): GameEvent[] {
    const player = this.requireTurn(state, userId);
    if (state.phase !== 'ACTION') throw new Error('Solo puedes construir en tu turno, tras mover.');
    const owner = state.ownerships[position];
    const tile = this.tile(position);
    if (!owner || owner.ownerId !== player.id) throw new Error('No eres dueño de esa propiedad.');
    if (tile.type !== 'PROPERTY') throw new Error('Aquí no se puede construir.');
    if (owner.mortgaged) throw new Error('La propiedad está hipotecada.');
    if (!this.ownsFullGroup(state, player.id, tile.group!)) throw new Error('Necesitas todo el grupo de color.');
    if (this.groupHasMortgage(state, tile.group!)) throw new Error('No puedes construir con propiedades del grupo hipotecadas.');
    const start = state.log.length;

    if (hotel) {
      if (owner.hotel) throw new Error('Ya tiene hotel.');
      if (owner.houses < this.config.maxHousesBeforeHotel) throw new Error('Primero necesitas 4 casas.');
      const cost = tile.hotelCost ?? 0;
      if (player.money < cost) throw new Error('No tienes dinero para el hotel.');
      player.money -= cost;
      owner.houses = 0;
      owner.hotel = true;
      this.emit(state, { type: 'PROPERTY_BUILT', playerId: player.id, message: `${player.nickname} construyó un hotel en ${tile.name}.`, data: { position, hotel: true } });
    } else {
      if (owner.hotel || owner.houses >= this.config.maxHousesBeforeHotel) throw new Error('Ya no caben más casas.');
      if (!this.evenBuild(state, tile.group!, position)) throw new Error('Debes construir de forma pareja en el grupo.');
      const cost = tile.houseCost ?? 0;
      if (player.money < cost) throw new Error('No tienes dinero para la casa.');
      player.money -= cost;
      owner.houses += 1;
      this.emit(state, { type: 'PROPERTY_BUILT', playerId: player.id, message: `${player.nickname} construyó una casa en ${tile.name} (${owner.houses}).`, data: { position, houses: owner.houses } });
    }
    return state.log.slice(start);
  }

  // ---- Money / bankruptcy -------------------------------------------------
  // Credit money and track lifetime earnings for stats.
  private credit(player: PlayerState, amount: number): void {
    if (amount <= 0) return;
    player.money += amount;
    player.totalEarned += amount;
  }

  private charge(state: GameState, player: PlayerState, amount: number, creditorId: string | null, reason: string): void {
    if (amount <= 0) return;
    if (player.money >= amount) {
      player.money -= amount;
      player.totalSpent += amount;
      if (creditorId) this.credit(this.player(state, creditorId), amount);
      return;
    }
    // Insufficient funds → bankruptcy. MVP: no partial mortgage flow.
    // ponytail: instant liquidation to creditor/bank; add asset-selling UI when players ask.
    this.bankrupt(state, player, creditorId, reason);
  }

  private bankrupt(state: GameState, player: PlayerState, creditorId: string | null, reason: string): void {
    const creditor = creditorId ? this.player(state, creditorId) : null;
    if (creditor) this.credit(creditor, player.money);
    player.money = 0;
    player.bankrupt = true;
    // Transfer / release properties.
    for (const key of Object.keys(state.ownerships)) {
      const pos = Number(key);
      const o = state.ownerships[pos];
      if (o.ownerId !== player.id) continue;
      if (creditor) {
        o.ownerId = creditor.id;
      } else {
        delete state.ownerships[pos];
      }
    }
    this.emit(state, {
      type: 'PLAYER_BANKRUPT',
      playerId: player.id,
      message: `${player.nickname} quedó en bancarrota (${reason}).`,
      data: { creditorId },
    });
    this.checkGameEnd(state);
  }

  private checkGameEnd(state: GameState): void {
    const alive = this.solvent(state);
    if (alive.length <= 1) {
      state.phase = 'ENDED';
      state.winnerId = alive[0]?.id ?? null;
      state.turnDeadline = null;
      this.emit(state, { type: 'GAME_FINISHED', playerId: state.winnerId ?? undefined, message: alive[0] ? `¡${alive[0].nickname} ganó la partida!` : 'Partida terminada.', data: { winnerId: state.winnerId } });
    }
  }

  // ---- Turn flow ----------------------------------------------------------
  private handleJailRoll(state: GameState, player: PlayerState, total: number, isDouble: boolean): void {
    if (isDouble) {
      player.inJail = false;
      player.jailTurns = 0;
      this.emit(state, { type: 'JAIL_RELEASED', playerId: player.id, message: `${player.nickname} salió del Calabozo con dobles.` });
      this.movePlayer(state, player, total);
      if (state.phase !== 'DECISION' && !player.inJail) state.phase = 'ACTION';
      return;
    }
    player.jailTurns += 1;
    if (player.jailTurns >= this.config.maxJailTurns) {
      this.charge(state, player, this.config.jailBail, null, 'Fianza del Calabozo');
      if (player.bankrupt) return;
      player.inJail = false;
      player.jailTurns = 0;
      this.emit(state, { type: 'JAIL_RELEASED', playerId: player.id, message: `${player.nickname} pagó la fianza y salió.` });
      this.movePlayer(state, player, total);
      if (state.phase !== 'DECISION' && !player.inJail) state.phase = 'ACTION';
      return;
    }
    this.emit(state, { type: 'JAIL_STAY', playerId: player.id, message: `${player.nickname} sigue en el Calabozo.` });
    this.finishTurn(state);
  }

  private sendToJail(state: GameState, player: PlayerState): void {
    player.position = 10;
    player.inJail = true;
    player.jailTurns = 0;
    state.doublesCount = 0;
    this.emit(state, { type: 'SENT_TO_JAIL', playerId: player.id, message: `${player.nickname} fue directo al Calabozo.` });
  }

  private maybeReRoll(state: GameState, player: PlayerState): void {
    // After a buy decision on a doubles turn the player still owes a re-roll,
    // handled at endTurn. Nothing to do here beyond leaving phase = ACTION.
    void state;
    void player;
  }

  private finishTurn(state: GameState): void {
    if (state.phase === 'ENDED') return;
    state.doublesCount = 0;
    state.dice = null;
    state.pendingBuyPosition = null;
    // Advance to next solvent player, honouring skipNextTurn.
    let guard = 0;
    do {
      state.currentTurnIndex = (state.currentTurnIndex + 1) % state.players.length;
      const next = state.players[state.currentTurnIndex];
      if (next.bankrupt) continue;
      if (next.skipNextTurn) {
        next.skipNextTurn = false;
        this.emit(state, { type: 'TURN_SKIPPED', playerId: next.id, message: `${next.nickname} pierde el turno.` });
        continue;
      }
      break;
    } while (guard++ < state.players.length * 2);

    state.phase = 'ROLLING';
    const cur = this.current(state);
    this.emit(state, { type: 'TURN_STARTED', playerId: cur.id, message: `Turno de ${cur.nickname}.`, data: { playerId: cur.id } });
    this.startTurnDeadline(state);
  }

  private startTurnDeadline(state: GameState): void {
    state.turnDeadline = Date.now() + this.config.turnSeconds * 1000;
  }

  // ---- Queries ------------------------------------------------------------
  private ownsFullGroup(state: GameState, ownerId: string, group: Group): boolean {
    const groupTiles = this.board.filter((t) => t.type === 'PROPERTY' && t.group === group);
    return groupTiles.every((t) => state.ownerships[t.position]?.ownerId === ownerId);
  }

  private evenBuild(state: GameState, group: Group, position: number): boolean {
    const groupTiles = this.board.filter((t) => t.type === 'PROPERTY' && t.group === group);
    const target = state.ownerships[position];
    const targetLevel = target.hotel ? 5 : target.houses;
    const min = Math.min(...groupTiles.map((t) => {
      const o = state.ownerships[t.position];
      return o.hotel ? 5 : o.houses;
    }));
    return targetLevel === min; // may only add to the least-built tile
  }

  private evenSell(state: GameState, group: Group, position: number): boolean {
    const groupTiles = this.board.filter((t) => t.type === 'PROPERTY' && t.group === group);
    const level = (pos: number) => {
      const o = state.ownerships[pos];
      return o.hotel ? 5 : o.houses;
    };
    const max = Math.max(...groupTiles.map((t) => level(t.position)));
    return level(position) === max; // may only sell from the most-built tile
  }

  private groupHasMortgage(state: GameState, group: Group): boolean {
    return this.board
      .filter((t) => t.type === 'PROPERTY' && t.group === group)
      .some((t) => state.ownerships[t.position]?.mortgaged);
  }

  private countType(state: GameState, ownerId: string, type: 'TRANSPORT' | 'UTILITY'): number {
    return this.board.filter((t) => t.type === type && state.ownerships[t.position]?.ownerId === ownerId).length;
  }

  private ownedCount(state: GameState, ownerId: string): number {
    return Object.values(state.ownerships).filter((o) => o.ownerId === ownerId).length;
  }

  private solvent(state: GameState): PlayerState[] {
    return state.players.filter((p) => !p.bankrupt);
  }

  private assertOwns(state: GameState, ownerId: string, positions: number[]): void {
    for (const p of positions) {
      const o = state.ownerships[p];
      if (!o || o.ownerId !== ownerId) throw new Error('Alguna propiedad del trato no pertenece a quien la ofrece.');
      if (o.houses > 0 || o.hotel) throw new Error('No puedes negociar propiedades con construcciones.');
    }
  }

  // ---- Small helpers ------------------------------------------------------
  private tile(pos: number): Tile {
    const t = this.tilesByPos.get(pos);
    if (!t) throw new Error(`Casilla inválida: ${pos}`);
    return t;
  }
  current(state: GameState): PlayerState {
    return state.players[state.currentTurnIndex];
  }
  private requireTurn(state: GameState, userId: string): PlayerState {
    if (state.phase === 'ENDED') throw new Error('La partida ya terminó.');
    const cur = this.current(state);
    if (cur.userId !== userId) throw new Error('No es tu turno.');
    if (cur.bankrupt) throw new Error('Estás fuera de la partida.');
    return cur;
  }
  private player(state: GameState, id: string): PlayerState {
    const p = state.players.find((pl) => pl.id === id);
    if (!p) throw new Error('Jugador no encontrado.');
    return p;
  }
  private playerByUser(state: GameState, userId: string): PlayerState {
    const p = state.players.find((pl) => pl.userId === userId);
    if (!p) throw new Error('No estás en esta partida.');
    return p;
  }
  private die(): number {
    return 1 + Math.floor(this.rng() * 6);
  }
  private shuffledIndexes(deck: Deck): number[] {
    const n = (this.cardsByDeck.get(deck) ?? []).length;
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  private emit(state: GameState, e: Omit<GameEvent, 'at'>): void {
    state.log.push({ ...e, at: Date.now() });
  }
}
