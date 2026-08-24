import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { GameEvent } from '../lib/types';

// Surfaces the most recent drawn card with a GSAP flip-in.
export function CardToast({ events }: { events: GameEvent[] }) {
  const [card, setCard] = useState<{ deck: string; title: string; description: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  // Timestamp of the last CARD_DRAWN we already showed, so we only pop the toast
  // for a genuinely NEW draw — not on every move (which also grows `events`).
  const lastAt = useRef<number | null>(null);

  // Detect a genuinely NEW card draw (don't reshow on every move).
  useEffect(() => {
    const last = [...events].reverse().find((e) => e.type === 'CARD_DRAWN' && (e.data as any)?.card);
    const at = last?.at ?? -1;
    if (lastAt.current === null) { lastAt.current = at; return; } // skip backlog on mount/reconnect
    if (at === lastAt.current || !last) return; // nothing new
    lastAt.current = at;
    setCard((last.data as any).card as { deck: string; title: string; description: string });
  }, [events.length]);

  // Auto-hide + flip-in are keyed on the card itself, so the timer isn't
  // cancelled by unrelated event updates (which would leave the toast stuck).
  useEffect(() => {
    if (!card) return;
    if (ref.current && !(typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      gsap.fromTo(ref.current,
        { rotateY: 90, scale: 0.7, opacity: 0, y: -20 },
        { rotateY: -4, scale: 1, opacity: 1, y: 0, duration: 0.55, ease: 'back.out(1.6)' });
    }
    const id = setTimeout(() => setCard(null), 4200);
    return () => clearTimeout(id);
  }, [card]);

  if (!card) return null;
  const isQmp = card.deck === 'QUE_MAS_PUES';
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center" style={{ perspective: 1000 }}>
      <div ref={ref} className={`w-72 rounded-2xl border-2 bg-gradient-to-b from-base-700 to-base-900 p-5 text-center shadow-2xl ${isQmp ? 'border-gold-400' : 'border-emerald-500'}`}>
        <p className={`mb-2 text-[10px] font-bold uppercase tracking-widest ${isQmp ? 'text-gold-400' : 'text-emerald-500'}`}>
          {isQmp ? '🎴 ¿Qué más pues?' : '🎴 La Vuelta'}
        </p>
        <p className="font-display text-lg font-bold text-white">{card.title}</p>
        <p className="mt-1 text-sm text-slate-300">{card.description}</p>
      </div>
    </div>
  );
}
