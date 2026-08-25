import { useEffect, useRef } from 'react';
import type { GameEvent } from '../lib/types';

const ICON: Record<string, string> = {
  DICE_ROLLED: '🎲', PROPERTY_PURCHASED: '🏷️', RENT_PAID: '💸', PASSED_GO: '🏁',
  CARD_DRAWN: '🎴', SENT_TO_JAIL: '🚔', JAIL_RELEASED: '🔓', PROPERTY_BUILT: '🏠',
  PLAYER_BANKRUPT: '💥', GAME_FINISHED: '🏆', TRADE_ACCEPTED: '🤝', TURN_STARTED: '▶️',
};

// Keep the log short: roughly the last 5-6 turns' worth of lines so it never
// grows tall enough to overflow the board centre it lives in.
const MAX_LINES = 14;

export function EventLog({ events }: { events: GameEvent[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [events.length]);

  const shown = events
    .filter((e) => e.message && e.type !== 'PLAYER_MOVED' && e.type !== 'TURN_STARTED')
    .slice(-MAX_LINES);

  return (
    <div className="flex w-full max-w-[min(92%,420px)] flex-col rounded-xl border border-white/10 bg-base-900/70 p-2 backdrop-blur">
      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Registro</h3>
      <div ref={ref} className="h-20 space-y-1 overflow-y-auto pr-1 text-[11px] leading-snug sm:h-28">
        {shown.map((e, i) => (
          <p key={i} className="text-slate-300">
            <span className="mr-1">{ICON[e.type] ?? '•'}</span>
            {e.message}
          </p>
        ))}
        {shown.length === 0 && <p className="text-slate-600">Aún no hay jugadas.</p>}
      </div>
    </div>
  );
}
