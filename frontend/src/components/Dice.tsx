import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { GameState } from '../lib/types';

const PIPS: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

function Die({ value }: { value: number }) {
  return (
    <div className="grid h-11 w-11 grid-cols-3 grid-rows-3 gap-0.5 rounded-xl bg-gradient-to-br from-white to-slate-200 p-1.5 shadow-lg sm:h-14 sm:w-14">
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={`m-auto h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${PIPS[value]?.includes(i) ? 'bg-base-900' : 'bg-transparent'}`} />
      ))}
    </div>
  );
}

export function Dice({ state }: { state: GameState | null }) {
  const dice = state?.dice;
  const ref = useRef<HTMLDivElement>(null);
  const key = dice ? `${dice[0]}-${dice[1]}` : 'none';

  useEffect(() => {
    if (!dice || !ref.current) return;
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dies = ref.current.querySelectorAll('[data-die]');
    gsap.fromTo(dies,
      { rotate: -180, scale: 0.4, y: -16, opacity: 0 },
      { rotate: 0, scale: 1, y: 0, opacity: 1, duration: 0.5, ease: 'back.out(2)', stagger: 0.08 });
  }, [key]);

  if (!dice) return <p className="text-xs text-slate-500">Esperando la jugada…</p>;
  return (
    <div ref={ref} className="flex items-center gap-3">
      <div data-die><Die value={dice[0]} /></div>
      <div data-die><Die value={dice[1]} /></div>
      <span className="ml-1 rounded-lg bg-gold-400 px-2.5 py-1 font-display text-xl font-extrabold text-base-900 shadow">{dice[0] + dice[1]}</span>
    </div>
  );
}
