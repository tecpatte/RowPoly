import type { BoardData, GameState } from '../lib/types';
import { money } from '../lib/api';

// Read-only history of every trade proposed in the game: who offered whom, the
// contents of each side, and how it ended. Lives in the right sidebar between
// the players list and Mis propiedades.
const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Pendiente', cls: 'text-gold-400' },
  ACCEPTED: { label: 'Cerrado', cls: 'text-emerald-500' },
  REJECTED: { label: 'Rechazado', cls: 'text-coral' },
};

export function TradesPanel({ board, state }: { board: BoardData; state: GameState }) {
  const name = (pos: number) => board.tiles.find((t) => t.position === pos)?.name ?? `#${pos}`;
  const player = (id: string) => state.players.find((p) => p.id === id);
  const side = (props: number[], cash: number) =>
    [...props.map(name), cash ? money(cash) : ''].filter(Boolean).join(', ') || 'nada';
  const trades = [...state.trades].reverse();

  return (
    <div className="card p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Tradeos <span className="text-slate-500">· {state.trades.length}</span>
      </h3>
      {trades.length === 0 ? (
        <p className="text-[12px] text-slate-600">Aún no hay tratos.</p>
      ) : (
        <ul className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
          {trades.map((t) => {
            const from = player(t.fromPlayerId);
            const to = player(t.toPlayerId);
            const st = STATUS[t.status] ?? { label: t.status, cls: 'text-slate-400' };
            return (
              <li key={t.id} className="rounded-lg bg-base-900/40 px-2 py-1.5 text-[12px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1 truncate">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: from?.color }} />
                    <b className="truncate">{from?.nickname}</b>
                    <span className="text-slate-500">→</span>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: to?.color }} />
                    <b className="truncate">{to?.nickname}</b>
                  </span>
                  <span className={`shrink-0 text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">Da: {side(t.offerProperties, t.offerMoney)}</p>
                <p className="text-[11px] text-slate-400">Pide: {side(t.requestProperties, t.requestMoney)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
