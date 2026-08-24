import type { BoardData, GameState } from '../lib/types';
import { money } from '../lib/api';
import { useGame } from '../store/gameStore';

// Full property management: build / sell / mortgage / unmortgage.
export function BuildModal({ board, state, meId, onClose }: { board: BoardData; state: GameState; meId: string; onClose: () => void }) {
  const command = useGame((s) => s.command);
  const tileAt = (pos: number) => board.tiles.find((t) => t.position === pos)!;
  const ownsGroup = (group?: string) =>
    !!group && board.tiles.filter((t) => t.type === 'PROPERTY' && t.group === group).every((t) => state.ownerships[t.position]?.ownerId === meId);

  const mine = Object.values(state.ownerships)
    .filter((o) => o.ownerId === meId)
    .map((o) => ({ o, tile: tileAt(o.position) }))
    .sort((a, b) => a.tile.position - b.tile.position);

  return (
    <Modal title="Mis propiedades" onClose={onClose}>
      {mine.length === 0 && <p className="text-sm text-slate-400">Todavía no tienes propiedades.</p>}
      <ul className="space-y-2">
        {mine.map(({ o, tile }) => {
          const canBuild = tile.type === 'PROPERTY' && ownsGroup(tile.group) && !o.mortgaged;
          return (
            <li key={o.position} className="rounded-lg bg-base-900/50 p-2">
              <div className="flex items-center gap-2">
                <span className="h-4 w-1.5 rounded" style={{ background: tile.color ?? '#64748b' }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{tile.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {o.mortgaged ? '🔴 Hipotecada' : o.hotel ? '🏨 Hotel' : o.houses ? '🏠'.repeat(o.houses) : 'Sin construir'}
                    {tile.price ? ` · ${money(tile.price)}` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {canBuild && !o.hotel && o.houses < 4 && (
                  <button className="btn-emerald px-2 py-1 text-xs" onClick={() => command('BUILD_HOUSE', { position: o.position })}>+ Casa {money(tile.houseCost ?? 0)}</button>
                )}
                {canBuild && !o.hotel && o.houses === 4 && (
                  <button className="btn-gold px-2 py-1 text-xs" onClick={() => command('BUILD_HOTEL', { position: o.position })}>+ Hotel {money(tile.hotelCost ?? 0)}</button>
                )}
                {(o.houses > 0 || o.hotel) && (
                  <button className="btn-ghost px-2 py-1 text-xs" onClick={() => command('SELL_BUILDING', { position: o.position })}>Vender</button>
                )}
                {tile.type !== 'PROPERTY' || (o.houses === 0 && !o.hotel) ? (
                  o.mortgaged ? (
                    <button className="btn-ghost px-2 py-1 text-xs" onClick={() => command('UNMORTGAGE', { position: o.position })}>Levantar hipoteca {money(Math.ceil((tile.price ?? 0) / 2 * 1.1))}</button>
                  ) : (
                    <button className="btn-ghost px-2 py-1 text-xs" onClick={() => command('MORTGAGE', { position: o.position })}>Hipotecar +{money(Math.floor((tile.price ?? 0) / 2))}</button>
                  )
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="card rp-pop max-h-[82vh] w-full max-w-md overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-gold-400">{title}</h2>
          <button className="text-slate-400 hover:text-white" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
