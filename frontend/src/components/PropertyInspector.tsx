import type { BoardData, GameState } from '../lib/types';
import { money } from '../lib/api';
import { GROUP_LABEL } from '../lib/board';
import { RegionArt, sceneFor } from '../lib/regionArt';
import { Modal, PropertyActions } from './BuildModal';

export function PropertyInspector({ board, state, position, meId, onClose }: { board: BoardData; state: GameState; position: number; meId: string; onClose: () => void }) {
  const tile = board.tiles.find((t) => t.position === position)!;
  const own = state.ownerships[position];
  const owner = own ? state.players.find((p) => p.id === own.ownerId) : null;
  const isProp = tile.type === 'PROPERTY';
  const isMine = own?.ownerId === meId;

  const rows: Array<[string, string]> = [];
  if (isProp) {
    rows.push(['Renta base', money(tile.baseRent ?? 0)]);
    rows.push(['Grupo completo', money(tile.setRent ?? 0)]);
    tile.houseRent?.forEach((r, i) => rows.push([`${i + 1} casa${i ? 's' : ''}`, money(r)]));
    rows.push(['Hotel', money(tile.hotelRent ?? 0)]);
  }

  return (
    <Modal title={tile.name} onClose={onClose}>
      {sceneFor(position) !== null && (
        <div className="relative mb-3 h-28 w-full overflow-hidden rounded-xl">
          <RegionArt position={position} className="absolute inset-0 [&>svg]:h-full [&>svg]:w-full" />
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/70 to-transparent" />
          {tile.region && <span className="absolute bottom-1.5 left-2 text-xs font-semibold text-white drop-shadow">📍 {tile.region}</span>}
        </div>
      )}
      {tile.color && <div className="mb-3 h-2 w-full rounded" style={{ background: tile.color }} />}
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="text-slate-400">{tile.region ?? tile.type}</span>
        {tile.group && <span className="rounded-full bg-base-900 px-2 py-0.5 text-gold-400">{GROUP_LABEL[tile.group] ?? tile.group}</span>}
      </div>
      {tile.description && <p className="mb-3 text-sm italic text-slate-300">“{tile.description}”</p>}

      {tile.price != null && (
        <p className="mb-2 text-sm">Precio: <span className="font-bold text-gold-400">{money(tile.price)}</span>
          {tile.houseCost != null && <span className="text-slate-400"> · Casa {money(tile.houseCost)}</span>}
        </p>
      )}

      {owner && (
        <p className="mb-3 flex items-center gap-2 text-sm">
          <span className="h-3 w-3 rounded-full" style={{ background: owner.color }} /> Dueño: <b>{owner.nickname}</b>
          {own?.mortgaged && <span className="text-coral">(hipotecada)</span>}
        </p>
      )}

      {rows.length > 0 && (
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-t border-base-700">
                <td className="py-1 text-slate-400">{k}</td>
                <td className="py-1 text-right font-semibold text-slate-100">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isMine && (
        <div className="mt-2 border-t border-base-700 pt-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-500">Tu propiedad</p>
          <PropertyActions board={board} state={state} meId={meId} position={position} />
        </div>
      )}

      {tile.type === 'TRANSPORT' && (
        <p className="text-sm text-slate-300">Renta según transportes que poseas: {board.config.transportRent.map((r) => money(r)).join(' · ')}</p>
      )}
      {tile.type === 'UTILITY' && (
        <p className="text-sm text-slate-300">Renta = dados × {board.config.utilityMultiplier.join(' o ×')} (según servicios que poseas).</p>
      )}
    </Modal>
  );
}
