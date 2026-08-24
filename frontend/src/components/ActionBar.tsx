import { useEffect, useState } from 'react';
import type { BoardData, GameState } from '../lib/types';
import { money } from '../lib/api';
import { useGame } from '../store/gameStore';

export function ActionBar({
  board,
  state,
  meUserId,
  onOpenBuild,
  onOpenTrade,
}: {
  board: BoardData;
  state: GameState;
  meUserId: string;
  onOpenBuild: () => void;
  onOpenTrade: () => void;
}) {
  const command = useGame((s) => s.command);
  const current = state.players[state.currentTurnIndex];
  const myTurn = current?.userId === meUserId && state.phase !== 'ENDED';
  const [left, setLeft] = useState(0);

  useEffect(() => {
    const tick = () => setLeft(state.turnDeadline ? Math.max(0, Math.round((state.turnDeadline - Date.now()) / 1000)) : 0);
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [state.turnDeadline]);

  if (state.phase === 'ENDED') {
    const winner = state.players.find((p) => p.id === state.winnerId);
    return (
      <div className="card border-gold-400 text-center">
        <p className="text-sm text-slate-400">Partida terminada</p>
        <p className="mt-1 font-display text-2xl font-bold text-gold-400">🏆 {winner?.nickname ?? '—'} ganó</p>
      </div>
    );
  }

  const pendingTile = state.pendingBuyPosition != null ? board.tiles.find((t) => t.position === state.pendingBuyPosition) : null;

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold" style={{ color: current?.color }}>
          {myTurn ? 'Tu turno' : `Turno de ${current?.nickname}`}
        </span>
        <span className={left <= 10 ? 'text-coral' : 'text-slate-400'}>⏱ {left}s</span>
      </div>

      {!myTurn && <p className="text-center text-sm text-slate-500">Esperando a {current?.nickname}…</p>}

      {myTurn && state.phase === 'ROLLING' && (
        <div className="space-y-2">
          {current?.inJail && (
            <>
              <p className="text-center text-xs text-slate-400">🔒 Estás en el Calabozo. Saca dobles o paga la fianza.</p>
              <button className="btn-emerald w-full" onClick={() => command('PAY_BAIL')}>Pagar fianza {money(board.config.jailBail)}</button>
            </>
          )}
          <button className="btn-gold w-full text-lg" onClick={() => command('ROLL_DICE')}>🎲 Lanzar dados</button>
        </div>
      )}

      {myTurn && state.phase === 'DECISION' && pendingTile && (
        <div className="space-y-2">
          <p className="text-center text-sm">
            <span className="font-semibold text-white">{pendingTile.name}</span> está libre.
          </p>
          <div className="flex gap-2">
            <button className="btn-emerald flex-1" onClick={() => command('BUY_PROPERTY')}>Comprar {money(pendingTile.price ?? 0)}</button>
            <button className="btn-ghost flex-1" onClick={() => command('DECLINE_BUY')}>No comprar</button>
          </div>
        </div>
      )}

      {myTurn && state.phase === 'ACTION' && (
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost flex-1" onClick={onOpenBuild}>🏠 Propiedades</button>
          <button className="btn-ghost flex-1" onClick={onOpenTrade}>🤝 Negociar</button>
          <button className="btn-gold flex-1" onClick={() => command('END_TURN')}>
            {state.doublesCount > 0 ? '🎲 Lanzar de nuevo' : 'Terminar turno'}
          </button>
        </div>
      )}
    </div>
  );
}
