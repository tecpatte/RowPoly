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
  const me = state.players.find((p) => p.userId === meUserId);
  const solventOthers = state.players.filter((p) => p.userId !== meUserId && !p.bankrupt);
  const canPlay = state.phase !== 'ENDED' && me && !me.bankrupt;
  const [left, setLeft] = useState(0);
  const [confirmBankrupt, setConfirmBankrupt] = useState(false);

  useEffect(() => {
    const tick = () => setLeft(state.turnDeadline ? Math.max(0, Math.round((state.turnDeadline - Date.now()) / 1000)) : 0);
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [state.turnDeadline]);

  // Disarm the bankruptcy confirm if left untouched, so it can't sit hot and be misclicked.
  useEffect(() => {
    if (!confirmBankrupt) return;
    const id = setTimeout(() => setConfirmBankrupt(false), 4000);
    return () => clearTimeout(id);
  }, [confirmBankrupt]);

  if (state.phase === 'ENDED') {
    const winner = state.players.find((p) => p.id === state.winnerId);
    return (
      <div className="card w-full max-w-sm border-gold-400 text-center">
        <p className="text-sm text-slate-400">Partida terminada</p>
        <p className="mt-1 font-display text-2xl font-bold text-gold-400">🏆 {winner?.nickname ?? '—'} ganó</p>
      </div>
    );
  }

  const pendingTile = state.pendingBuyPosition != null ? board.tiles.find((t) => t.position === state.pendingBuyPosition) : null;

  return (
    <div className="card w-full max-w-sm p-3">
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

      {myTurn && state.phase === 'DEBT' && state.pendingDebt && (
        <div className="space-y-2">
          <p className="text-center text-sm font-semibold text-coral">
            Debes {money(state.pendingDebt.amount)}. Vende o hipoteca para reunir el dinero.
          </p>
          <p className="text-center text-xs text-slate-400">Tienes {money(me?.money ?? 0)}</p>
          <button className="btn-ghost w-full" onClick={onOpenBuild}>🏠 Vender / Hipotecar</button>
          <button
            className="btn-emerald w-full"
            disabled={(me?.money ?? 0) < state.pendingDebt.amount}
            onClick={() => command('PAY_DEBT')}
          >
            Pagar {money(state.pendingDebt.amount)}
          </button>
          <p className="text-center text-[11px] text-slate-500">Si no puedes cubrirlo, declárate en bancarrota abajo.</p>
        </div>
      )}

      {myTurn && state.phase === 'ACTION' && (
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost flex-1" onClick={onOpenBuild}>🏠 Propiedades</button>
          <button className="btn-gold flex-1" onClick={() => command('END_TURN')}>
            {state.doublesCount > 0 ? '🎲 Lanzar de nuevo' : 'Terminar turno'}
          </button>
        </div>
      )}

      {/* Always available regardless of whose turn it is. */}
      {canPlay && (
        <div className="mt-2 flex gap-2 border-t border-base-600 pt-2">
          <button className="btn-ghost flex-1 py-1 text-sm" disabled={solventOthers.length === 0} onClick={onOpenTrade}>
            🤝 Negociar
          </button>
          {confirmBankrupt ? (
            <button
              className="btn flex-1 border border-coral bg-coral/20 py-1 text-sm font-semibold text-coral"
              onClick={() => { command('DECLARE_BANKRUPTCY'); setConfirmBankrupt(false); }}
            >
              ⚠️ Confirmar bancarrota
            </button>
          ) : (
            <button className="btn-ghost flex-1 py-1 text-sm text-coral" onClick={() => setConfirmBankrupt(true)}>
              🏳️ Bancarrota
            </button>
          )}
        </div>
      )}
    </div>
  );
}
