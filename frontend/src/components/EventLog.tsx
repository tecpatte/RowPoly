import { useEffect, useRef } from 'react';
import type { GameEvent } from '../lib/types';

const ICON: Record<string, string> = {
  DICE_ROLLED: '🎲', PROPERTY_PURCHASED: '🏷️', RENT_PAID: '💸', PASSED_GO: '🏁',
  CARD_DRAWN: '🎴', SENT_TO_JAIL: '🚔', JAIL_RELEASED: '🔓', PROPERTY_BUILT: '🏠',
  PLAYER_BANKRUPT: '💥', GAME_FINISHED: '🏆', TRADE_ACCEPTED: '🤝', TURN_STARTED: '▶️',
};

export function EventLog({ events }: { events: GameEvent[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [events.length]);

  const shown = events.filter((e) => e.message && e.type !== 'PLAYER_MOVED' && e.type !== 'TURN_STARTED');

  return (
    <div className="card flex min-h-0 flex-1 flex-col p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Registro</h3>
      <div ref={ref} className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 text-[12px] leading-snug">
        {shown.slice(-40).map((e, i) => (
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
