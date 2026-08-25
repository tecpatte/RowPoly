import type { ReactNode } from 'react';
import type { BoardData, GameState } from '../lib/types';
import { Tile } from './Tile';
import { Dice } from './Dice';
import { TokenLayer } from './TokenLayer';
import { FxLayer } from './FxLayer';

export function Board({ board, state, onSelect, center }: { board: BoardData; state: GameState | null; onSelect?: (pos: number) => void; center?: ReactNode }) {
  return (
    <div className="mx-auto aspect-square w-full max-w-[min(96vh,1320px)]">
      <div
        className="relative grid h-full w-full gap-[2px] rounded-2xl border border-black/40 bg-gradient-to-br from-base-700 to-base-900 p-[3px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]"
        style={{ gridTemplateColumns: 'repeat(11,1fr)', gridTemplateRows: 'repeat(11,1fr)' }}
      >
        {board.tiles.map((t) => (
          <Tile key={t.position} tile={t} state={state} onSelect={onSelect} />
        ))}

        {/* Centre plate: brand + dice + turn controls + log, all within reach */}
        <div
          className="relative overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br from-base-800 to-base-900"
          style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#f4c430 0 2px,transparent 2px 22px)' }} />
          {/* overflow-y-auto + m-auto: centres when it fits, scrolls cleanly when it doesn't (no clipped top). */}
          <div className="relative flex h-full w-full flex-col overflow-y-auto p-2 sm:p-4">
            <div className="m-auto flex w-full flex-col items-center gap-2 sm:gap-3">
              <div className="shrink-0 rotate-[-6deg] text-center">
                <h1 className="font-display text-xl font-extrabold tracking-tight text-transparent sm:text-4xl" style={{ backgroundImage: 'linear-gradient(90deg,#f4c430,#fff0b8,#2e9e5b)', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>
                  ROWPOLY
                </h1>
                <p className="-mt-1 text-[8px] font-semibold uppercase tracking-[0.4em] text-emerald-500 sm:text-xs">Monopoly Colombia</p>
              </div>
              <Dice state={state} />
              {center}
            </div>
          </div>
        </div>

        {/* Event pulses (purchase / build / rent) + animated player tokens */}
        {state && <FxLayer />}
        {state && <TokenLayer players={state.players} />}
      </div>
    </div>
  );
}
