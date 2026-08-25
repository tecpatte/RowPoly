import type { GameState, Tile as TileT } from '../lib/types';
import { gridCell, tileSide } from '../lib/board';
import { RegionArt, sceneFor } from '../lib/regionArt';

const CORNER_ICON: Record<string, string> = { GO: '🏁', JAIL: '🔒', FREE_PARKING: '🏖️', GO_TO_JAIL: '🚔' };
const SPECIAL_ICON: Record<string, string> = { TRANSPORT: '🚆', UTILITY: '💡', TAX: '🧾', CARD: '🎴' };

export function Tile({ tile, state, onSelect }: { tile: TileT; state: GameState | null; onSelect?: (pos: number) => void }) {
  const cell = gridCell(tile.position);
  const side = tileSide(tile.position);
  const isCorner = ['GO', 'JAIL', 'FREE_PARKING', 'GO_TO_JAIL'].includes(tile.type);
  const own = state?.ownerships?.[tile.position];
  const ownerColor = own ? state?.players.find((p) => p.id === own.ownerId)?.color : undefined;
  const hasArt = sceneFor(tile.position) !== null;

  const bar =
    side === 'bottom' ? 'top-0 left-0 right-0 h-[8px]'
    : side === 'top' ? 'bottom-0 left-0 right-0 h-[8px]'
    : side === 'left' ? 'top-0 right-0 bottom-0 w-[8px]'
    : 'top-0 left-0 bottom-0 w-[8px]';

  const pad = side === 'bottom' ? 'pt-[8px]' : side === 'top' ? 'pb-[8px]' : side === 'left' ? 'pr-[8px]' : 'pl-[8px]';

  return (
    <div
      style={{ gridRow: cell.row, gridColumn: cell.col }}
      onClick={() => onSelect?.(tile.position)}
      onKeyDown={(e) => { if (onSelect && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(tile.position); } }}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={`${tile.name}${tile.price ? `, ${tile.price}` : ''}`}
      className={`group relative flex flex-col items-center justify-center overflow-hidden rounded-[4px] border border-black/30 bg-base-800 text-center outline-none transition focus-visible:ring-2 focus-visible:ring-gold-400 ${onSelect ? 'cursor-pointer hover:z-10 hover:ring-2 hover:ring-gold-400/70' : ''}`}
    >
      {hasArt && <RegionArt position={tile.position} className="absolute inset-0 [&>svg]:h-full [&>svg]:w-full opacity-90 transition group-hover:scale-105" />}
      {hasArt && <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5" />}

      {tile.color && <div className={`absolute z-10 ${bar}`} style={{ background: tile.color, boxShadow: `0 0 6px ${tile.color}` }} />}
      {ownerColor && (
        <div className="absolute right-0 top-0 z-10 h-0 w-0 border-l-[15px] border-t-[15px] border-l-transparent" style={{ borderTopColor: ownerColor }} />
      )}

      <div className={`relative z-10 flex h-full w-full flex-col items-center justify-center gap-0.5 px-0.5 ${pad}`}>
        {isCorner ? (
          <span className="text-[clamp(18px,3vw,34px)] leading-none drop-shadow">{CORNER_ICON[tile.type]}</span>
        ) : (
          SPECIAL_ICON[tile.type] && <span className="text-[clamp(13px,2vw,22px)] leading-none drop-shadow">{SPECIAL_ICON[tile.type]}</span>
        )}
        <span className={`font-display font-bold leading-[1.08] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] ${isCorner ? 'text-[clamp(9px,1.4vw,15px)]' : 'text-[clamp(8.5px,1.3vw,14px)]'} line-clamp-2`}>
          {tile.name}
        </span>
        {tile.price != null && (
          <span className="rounded bg-black/55 px-1 text-[clamp(8px,1.15vw,12px)] font-bold text-gold-400">${tile.price}</span>
        )}
        {own && (own.hotel || own.houses > 0) && (
          <span className="text-[clamp(9px,1.5vw,15px)] leading-none drop-shadow">{own.hotel ? '🏨' : '🏠'.repeat(own.houses)}</span>
        )}
        {own?.mortgaged && <span className="text-[clamp(7px,1vw,11px)] font-bold text-coral">HIP.</span>}
      </div>
    </div>
  );
}
