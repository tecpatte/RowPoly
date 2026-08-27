import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGame } from '../store/gameStore';
import { tileCenterPct } from '../lib/board';
import { money } from '../lib/api';

// Reads the event stream and pops a short pulse at the relevant tile: green for
// a purchase/build, coral for rent. Sits over the board, same coordinate space
// as TokenLayer. Skips when hidden / reduced-motion (rAF-driven).
const COLOR: Record<string, string> = {
  PROPERTY_PURCHASED: '#2e9e5b',
  PROPERTY_BUILT: '#f4c430',
  RENT_PAID: '#ef5b5b',
};

// Events that move money: the amount floats up over the tile, so every
// transaction shows its value explicitly. Sign tints it green (in) / coral (out).
const MONEY: Record<string, number> = {
  PROPERTY_PURCHASED: -1, RENT_PAID: -1, TAX_PAID: -1,
  PASSED_GO: +1,
};

export function FxLayer() {
  const events = useGame((s) => s.events);
  const wrap = useRef<HTMLDivElement>(null);
  const seen = useRef(-1);

  useEffect(() => {
    if (!wrap.current) return;
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Skip the initial backlog (e.g. a reconnect snapshot) — only pulse new events.
    if (seen.current < 0) { seen.current = events.length; return; }
    const fresh = events.slice(seen.current);
    seen.current = events.length;
    if (reduce || (typeof document !== 'undefined' && document.hidden)) return;
    const host = wrap.current;
    const rect = host.getBoundingClientRect();
    for (const e of fresh) {
      const data = e.data as any;
      const color = COLOR[e.type];
      const pos = data?.position;
      if (color && typeof pos === 'number') {
        const c = tileCenterPct(pos);
        const d = document.createElement('div');
        d.style.cssText = `position:absolute;left:${c.x}%;top:${c.y}%;width:${rect.width * 0.09}px;height:${rect.width * 0.09}px;transform:translate(-50%,-50%);border-radius:50%;box-shadow:0 0 0 3px ${color};pointer-events:none;`;
        host.appendChild(d);
        gsap.fromTo(d, { scale: 0.3, opacity: 0.85 }, { scale: 2.4, opacity: 0, duration: 0.7, ease: 'power2.out', onComplete: () => d.remove() });
      }
      // Float the explicit amount over the tile for any money-moving event.
      const sign = MONEY[e.type];
      const amount = data?.amount ?? data?.price;
      if (sign && typeof amount === 'number' && amount > 0) {
        const c = tileCenterPct(typeof pos === 'number' ? pos : 0); // PASSED_GO → Salida
        const t = document.createElement('div');
        t.textContent = `${sign > 0 ? '+' : '-'}${money(amount)}`;
        t.style.cssText = `position:absolute;left:${c.x}%;top:${c.y}%;transform:translate(-50%,-50%);font-weight:900;font-size:${Math.max(12, rect.width * 0.028)}px;color:${sign > 0 ? '#34d399' : '#ef5b5b'};text-shadow:0 1px 3px rgba(0,0,0,.9);pointer-events:none;white-space:nowrap;z-index:30;`;
        host.appendChild(t);
        gsap.fromTo(t, { y: 0, opacity: 0, scale: 0.6 }, { y: -rect.width * 0.09, opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)',
          onComplete: () => gsap.to(t, { y: `-=${rect.width * 0.06}`, opacity: 0, duration: 0.8, delay: 0.5, onComplete: () => t.remove() }) });
      }
    }
  }, [events.length]);

  return <div ref={wrap} className="pointer-events-none absolute inset-0 z-20" aria-hidden />;
}
