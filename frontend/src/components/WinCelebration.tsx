import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { money } from '../lib/api';
import type { GameState } from '../lib/types';

const COLORS = ['#f4c430', '#2e9e5b', '#1e88e5', '#ef5b5b', '#8e24aa', '#fff0b8'];

// Full-screen victory flourish shown when the game ends: a GSAP confetti burst
// plus the winner card. Honours reduced motion (skips the confetti).
export function WinCelebration({ state }: { state: GameState }) {
  const layer = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const winner = state.players.find((p) => p.id === state.winnerId);

  useEffect(() => {
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (cardRef.current && !reduce) {
      gsap.fromTo(cardRef.current, { scale: 0.7, y: 30, opacity: 0 }, { scale: 1, y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' });
    }
    if (!layer.current || reduce || typeof document !== 'undefined' && document.hidden) return;
    const host = layer.current;
    const pieces: HTMLDivElement[] = [];
    for (let i = 0; i < 90; i++) {
      const d = document.createElement('div');
      const s = 6 + Math.random() * 8;
      d.style.cssText = `position:absolute;top:-20px;left:${Math.random() * 100}%;width:${s}px;height:${s * 0.6}px;background:${COLORS[i % COLORS.length]};border-radius:2px;`;
      host.appendChild(d);
      pieces.push(d);
      gsap.to(d, {
        y: window.innerHeight + 40,
        x: (Math.random() - 0.5) * 260,
        rotation: Math.random() * 720 - 360,
        opacity: 0,
        duration: 2.2 + Math.random() * 1.8,
        delay: Math.random() * 0.8,
        ease: 'power1.in',
      });
    }
    const t = setTimeout(() => pieces.forEach((p) => p.remove()), 5000);
    return () => { clearTimeout(t); pieces.forEach((p) => p.remove()); };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center">
      <div ref={layer} className="absolute inset-0 overflow-hidden" aria-hidden />
      <div ref={cardRef} className="relative rounded-2xl border-2 border-gold-400 bg-gradient-to-b from-base-700 to-base-900 px-8 py-6 text-center shadow-2xl">
        <p className="text-5xl">🏆</p>
        <p className="mt-2 font-display text-3xl font-extrabold text-gold-400">¡{winner?.nickname ?? '—'} ganó!</p>
        {winner && <p className="mt-1 text-sm text-slate-300">Fortuna final: {money(winner.money)}</p>}
      </div>
    </div>
  );
}
