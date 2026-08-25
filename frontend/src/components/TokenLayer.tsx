import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import type { PlayerState } from '../lib/types';
import { forwardPath, tileCenterPct } from '../lib/board';

// Absolute overlay that renders one token per player and animates it tile-by-tile
// with GSAP whenever the server reports a new position. The board itself only
// draws static squares; all motion lives here.
//
// DOM per token: an outer node carries the board position (x/y translate); an
// inner ".hop" node carries the vertical arc + squash so each step reads as a
// real bounce; a ".ring" node is the landing pulse.
export function TokenLayer({ players }: { players: PlayerState[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const nodes = useRef<Map<string, HTMLDivElement>>(new Map());
  const hops = useRef<Map<string, HTMLDivElement>>(new Map());
  const rings = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevPos = useRef<Map<string, number>>(new Map());
  const size = useRef({ w: 0, h: 0 });
  const latest = useRef(players);
  latest.current = players; // always the freshest list for the resize handler

  const measure = () => {
    const r = wrap.current?.getBoundingClientRect();
    if (r) size.current = { w: r.width, h: r.height };
  };

  // Fan tokens that share a tile out on a small ring so they never fully overlap.
  const slot = (playerId: string, position: number) => {
    const sameTile = players.filter((p) => !p.bankrupt && p.position === position).map((p) => p.id);
    if (sameTile.length <= 1) return { dx: 0, dy: 0 };
    const idx = Math.max(0, sameTile.indexOf(playerId));
    const r = Math.max(6, Math.min(size.current.w, size.current.h) / 11 * 0.24);
    const ang = (idx / sameTile.length) * Math.PI * 2 - Math.PI / 2;
    return { dx: Math.cos(ang) * r, dy: Math.sin(ang) * r };
  };

  const place = (playerId: string, position: number, animate: boolean) => {
    const el = nodes.current.get(playerId);
    const hop = hops.current.get(playerId);
    if (!el) return;
    const { w, h } = size.current;
    const toPx = (pos: number) => {
      const c = tileCenterPct(pos);
      const s = slot(playerId, pos);
      return { x: (c.x / 100) * w + s.dx, y: (c.y / 100) * h + s.dy };
    };
    const prev = prevPos.current.get(playerId);
    // Snap (no animation) on first placement, when the tab is hidden (rAF is
    // paused, so a tween would never finish and the token would get stuck), or
    // when the user prefers reduced motion.
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!animate || prev == null || (typeof document !== 'undefined' && document.hidden) || reduce) {
      const p = toPx(position);
      gsap.set(el, { x: p.x, y: p.y, xPercent: -50, yPercent: -50 });
      if (hop) gsap.set(hop, { y: 0, scaleX: 1, scaleY: 1 });
      return;
    }
    const steps = (position - prev + 40) % 40;
    // Normal-ish forward move (dice / short card): hop through each tile.
    // Big jump / teleport / backward: glide straight to the target.
    const walk = steps >= 1 && steps <= 12;
    const path = walk ? forwardPath(prev, position) : [position];
    const passesGo = walk && path.includes(0) && position !== 0;
    const tl = gsap.timeline();
    gsap.set(el, { zIndex: 40 });
    path.forEach((pos, i) => {
      const p = toPx(pos);
      const last = i === path.length - 1;
      tl.to(el, {
        x: p.x, y: p.y,
        duration: walk ? 0.19 : 0.55,
        ease: walk ? 'power1.inOut' : 'power2.inOut',
      });
      if (hop && walk && !last) {
        // parabolic lift + squash for each intermediate step
        tl.to(hop, { y: -9, duration: 0.095, ease: 'power2.out' }, '<')
          .to(hop, { y: 0, duration: 0.095, ease: 'power2.in' }, '>');
      }
    });
    // Settle: a springy squash-and-stretch when the token lands.
    if (hop) {
      tl.to(hop, { y: -6, scaleX: 0.9, scaleY: 1.12, duration: 0.1, ease: 'power2.out' })
        .to(hop, { y: 0, scaleX: 1.12, scaleY: 0.9, duration: 0.12, ease: 'power2.in' })
        .to(hop, { scaleX: 1, scaleY: 1, duration: 0.35, ease: 'elastic.out(1, 0.45)' });
    }
    // Landing pulse ring.
    const ring = rings.current.get(playerId);
    if (ring) {
      tl.fromTo(ring, { scale: 0.4, opacity: 0.65 }, { scale: 2.1, opacity: 0, duration: 0.5, ease: 'power2.out' }, '-=0.4');
    }
    // Passing GO flourish: a quick gold flash on the token.
    if (passesGo && hop) {
      const flash = hop.querySelector<HTMLElement>('.go-flash');
      if (flash) tl.fromTo(flash, { opacity: 0.9, scale: 0.6 }, { opacity: 0, scale: 2.4, duration: 0.6, ease: 'power2.out' }, '<');
    }
    tl.set(el, { zIndex: 20 });
  };

  useLayoutEffect(() => {
    measure();
    for (const p of players) place(p.id, p.position, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onResize = () => { measure(); for (const p of latest.current) place(p.id, p.position, false); };
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize);
    if (wrap.current) ro.observe(wrap.current);
    return () => { window.removeEventListener('resize', onResize); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    measure();
    for (const p of players) {
      const prev = prevPos.current.get(p.id);
      place(p.id, p.position, prev != null && prev !== p.position);
      prevPos.current.set(p.id, p.position);
    }
  }, [players.map((p) => `${p.id}:${p.position}:${p.bankrupt}`).join('|')]);

  return (
    <div ref={wrap} className="pointer-events-none absolute inset-0 z-30">
      {players.map((p) => (
        <div
          key={p.id}
          ref={(el) => { if (el) nodes.current.set(p.id, el); }}
          className="absolute left-0 top-0 h-[3.8%] w-[3.8%] min-h-[20px] min-w-[20px]"
        >
          {/* Landing pulse ring (behind the token) */}
          <div
            ref={(el) => { if (el) rings.current.set(p.id, el); }}
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: `0 0 0 2px ${p.color}`, opacity: 0 }}
          />
          <div
            ref={(el) => { if (el) hops.current.set(p.id, el); }}
            className={`relative flex h-full w-full items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white shadow-[0_3px_8px_rgba(0,0,0,0.6)] ${p.bankrupt ? 'opacity-25 grayscale' : ''}`}
            style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5), transparent 55%), ${p.color}` }}
            title={p.nickname}
          >
            <span className="go-flash pointer-events-none absolute inset-0 rounded-full" style={{ boxShadow: '0 0 6px 3px #f4c430', opacity: 0 }} />
            {p.nickname.slice(0, 1).toUpperCase()}
          </div>
        </div>
      ))}
    </div>
  );
}
