import type { BoardData, GameState } from '../lib/types';
import { Tile } from './Tile';
import { Dice } from './Dice';
import { TokenLayer } from './TokenLayer';
import { FxLayer } from './FxLayer';

export function Board({ board, state, onSelect }: { board: BoardData; state: GameState | null; onSelect?: (pos: number) => void }) {
  return (
    <div className="mx-auto aspect-square w-full max-w-[min(94vh,1120px)]">
      <div
        className="relative grid h-full w-full gap-[2px] rounded-2xl border border-black/40 bg-gradient-to-br from-base-700 to-base-900 p-[3px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]"
        style={{ gridTemplateColumns: 'repeat(11,1fr)', gridTemplateRows: 'repeat(11,1fr)' }}
      >
        {board.tiles.map((t) => (
          <Tile key={t.position} tile={t} state={state} onSelect={onSelect} />
        ))}

        {/* Centre plate */}
        <div
          className="relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br from-base-800 to-base-900"
          style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#f4c430 0 2px,transparent 2px 22px)' }} />
          <div className="relative rotate-[-6deg] text-center">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-transparent sm:text-5xl" style={{ backgroundImage: 'linear-gradient(90deg,#f4c430,#fff0b8,#2e9e5b)', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>
              ROWPOLY
            </h1>
            <p className="-mt-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-emerald-500 sm:text-xs">Monopoly Colombia</p>
          </div>
          <Dice state={state} />
        </div>

        {/* Event pulses (purchase / build / rent) + animated player tokens */}
        {state && <FxLayer />}
        {state && <TokenLayer players={state.players} />}
      </div>
    </div>
  );
}
