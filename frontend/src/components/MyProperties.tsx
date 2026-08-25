import type { BoardData, GameState } from '../lib/types';
import { money } from '../lib/api';

export function MyProperties({ board, state, meId }: { board: BoardData; state: GameState; meId: string }) {
  const tile = (pos: number) => board.tiles.find((t) => t.position === pos);
  const mine = Object.values(state.ownerships)
    .filter((o) => o.ownerId === meId)
    .sort((a, b) => a.position - b.position);

  return (
    <div className="card p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Mis propiedades <span className="text-slate-500">· {mine.length}</span>
      </h3>
      {mine.length === 0 ? (
        <p className="text-[12px] text-slate-600">Aún no tienes propiedades.</p>
      ) : (
        <ul className="max-h-40 space-y-1 overflow-y-auto pr-1">
          {mine.map((o) => {
            const t = tile(o.position);
            return (
              <li key={o.position} className="flex items-center gap-2 rounded-lg bg-base-900/40 px-2 py-1 text-[12px]">
                <span className="h-3 w-1.5 shrink-0 rounded-full" style={{ background: t?.color ?? '#64748b' }} />
                <span className="min-w-0 flex-1 truncate text-slate-200">{t?.name ?? `#${o.position}`}</span>
                {o.mortgaged && <span className="shrink-0 text-[10px] font-bold text-coral">HIP.</span>}
                {(o.hotel || o.houses > 0) && <span className="shrink-0">{o.hotel ? '🏨' : '🏠'.repeat(o.houses)}</span>}
                {t?.price != null && <span className="shrink-0 font-semibold text-gold-400">{money(t.price)}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
