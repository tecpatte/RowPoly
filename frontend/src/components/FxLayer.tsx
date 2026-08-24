import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGame } from '../store/gameStore';
import { tileCenterPct } from '../lib/board';

// Reads the event stream and pops a short pulse at the relevant tile: green for
// a purchase/build, coral for rent. Sits over the board, same coordinate space
// as TokenLayer. Skips when hidden / reduced-motion (rAF-driven).
const COLOR: Record<string, string> = {
  PROPERTY_PURCHASED: '#2e9e5b',
  PROPERTY_BUILT: '#f4c430',
  RENT_PAID: '#ef5b5b',
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
      const color = COLOR[e.type];
      const pos = (e.data as any)?.position;
      if (!color || typeof pos !== 'number') continue;
      const c = tileCenterPct(pos);
      const d = document.createElement('div');
      d.style.cssText = `position:absolute;left:${c.x}%;top:${c.y}%;width:${rect.width * 0.09}px;height:${rect.width * 0.09}px;transform:translate(-50%,-50%);border-radius:50%;box-shadow:0 0 0 3px ${color};pointer-events:none;`;
      host.appendChild(d);
      gsap.fromTo(d, { scale: 0.3, opacity: 0.85 }, { scale: 2.4, opacity: 0, duration: 0.7, ease: 'power2.out', onComplete: () => d.remove() });
    }
  }, [events.length]);

  return <div ref={wrap} className="pointer-events-none absolute inset-0 z-20" aria-hidden />;
}
