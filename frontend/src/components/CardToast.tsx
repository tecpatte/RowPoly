import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { GameEvent } from '../lib/types';
import { money } from '../lib/api';

type CardData = { deck: string; title: string; description: string; action?: string; amount?: number };

// Money value (+premio / -castigo) a card pays or charges, with a suffix when
// it scales per property or per player. Returns null for non-money cards.
function cardMoney(card: CardData): { sign: number; label: string } | null {
  if (!card.amount) return null;
  const suffix: Record<string, string> = {
    PAY_PER_PROPERTY: ' / propiedad', RECEIVE_PER_PROPERTY: ' / propiedad',
    PAY_PLAYERS: ' / jugador', RECEIVE_FROM_PLAYERS: ' / jugador',
  };
  const gain = ['RECEIVE_MONEY', 'RECEIVE_PER_PROPERTY', 'RECEIVE_FROM_PLAYERS', 'EVERYONE_RECEIVES'];
  const lose = ['PAY_MONEY', 'PAY_PER_PROPERTY', 'PAY_PLAYERS', 'EVERYONE_PAYS'];
  const sign = gain.includes(card.action ?? '') ? 1 : lose.includes(card.action ?? '') ? -1 : 0;
  if (sign === 0) return null;
  return { sign, label: `${sign > 0 ? '+' : '-'}${money(card.amount)}${suffix[card.action ?? ''] ?? ''}` };
}

// Surfaces the most recent drawn card with a GSAP flip-in.
export function CardToast({ events }: { events: GameEvent[] }) {
  const [card, setCard] = useState<CardData | null>(null);
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
    setCard((last.data as any).card as CardData);
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
  const cash = cardMoney(card);
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center" style={{ perspective: 1000 }}>
      <div ref={ref} className={`w-72 rounded-2xl border-2 bg-gradient-to-b from-base-700 to-base-900 p-5 text-center shadow-2xl ${isQmp ? 'border-gold-400' : 'border-emerald-500'}`}>
        <p className={`mb-2 text-[10px] font-bold uppercase tracking-widest ${isQmp ? 'text-gold-400' : 'text-emerald-500'}`}>
          {isQmp ? '🎴 ¿Qué más pues?' : '🎴 La Vuelta'}
        </p>
        <p className="font-display text-lg font-bold text-white">{card.title}</p>
        <p className="mt-1 text-sm text-slate-300">{card.description}</p>
        {cash && (
          <p className={`mt-3 font-display text-2xl font-black ${cash.sign > 0 ? 'text-emerald-400' : 'text-coral'}`}>
            {cash.label}
          </p>
        )}
      </div>
    </div>
  );
}
