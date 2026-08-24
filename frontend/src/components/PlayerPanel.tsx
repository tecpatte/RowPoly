import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { GameState } from '../lib/types';
import { money } from '../lib/api';

function Floater({ amount }: { amount: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) gsap.fromTo(ref.current, { y: 0, opacity: 1 }, { y: -22, opacity: 0, duration: 1.1, ease: 'power1.out' });
  }, []);
  return (
    <span ref={ref} className={`pointer-events-none absolute right-2 top-1 text-xs font-bold ${amount > 0 ? 'text-emerald-400' : 'text-coral'}`}>
      {amount > 0 ? '+' : ''}{money(amount)}
    </span>
  );
}

export function PlayerPanel({ state, meUserId }: { state: GameState; meUserId: string }) {
  const current = state.players[state.currentTurnIndex];
  const prev = useRef<Map<string, number>>(new Map());
  const [deltas, setDeltas] = useState<Record<string, { amount: number; key: number }>>({});

  useEffect(() => {
    const next: Record<string, { amount: number; key: number }> = {};
    for (const p of state.players) {
      const before = prev.current.get(p.id);
      if (before != null && before !== p.money) next[p.id] = { amount: p.money - before, key: Date.now() + Math.random() };
      prev.current.set(p.id, p.money);
    }
    if (Object.keys(next).length) {
      setDeltas((d) => ({ ...d, ...next }));
      const ids = Object.keys(next);
      const t = setTimeout(() => setDeltas((d) => { const c = { ...d }; ids.forEach((i) => delete c[i]); return c; }), 1200);
      return () => clearTimeout(t);
    }
  }, [state.players.map((p) => `${p.id}:${p.money}`).join('|')]);

  return (
    <div className="card p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Jugadores</h3>
      <ul className="space-y-1.5">
        {state.players.map((p) => {
          const props = Object.values(state.ownerships).filter((o) => o.ownerId === p.id).length;
          const isTurn = p.id === current?.id && state.phase !== 'ENDED';
          const d = deltas[p.id];
          return (
            <li
              key={p.id}
              className={`relative flex items-center gap-2 overflow-visible rounded-lg px-2 py-1.5 transition ${isTurn ? 'bg-emerald-500/15 ring-1 ring-emerald-500' : 'bg-base-900/40'} ${p.bankrupt ? 'opacity-40' : ''}`}
            >
              <span className="h-3 w-3 shrink-0 rounded-full border border-black/40" style={{ background: p.color }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 truncate text-sm font-semibold">
                  {p.nickname}
                  {p.userId === meUserId && <span className="text-[10px] text-gold-400">(tú)</span>}
                  {!p.connected && <span title="Desconectado">📴</span>}
                  {p.inJail && <span title="En el Calabozo">🔒</span>}
                </div>
                <div className="text-[11px] text-slate-400">{props} propiedades{p.bankrupt && ' · en quiebra'}</div>
              </div>
              <span className="shrink-0 font-display text-sm font-bold text-gold-400">{money(p.money)}</span>
              {d && <Floater key={d.key} amount={d.amount} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
