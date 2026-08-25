import { useEffect, useState } from 'react';
import { api, displayName, money, type HistoryRow, type Profile as ProfileT } from '../lib/api';
import { useGame } from '../store/gameStore';
import { Modal } from './BuildModal';

export function Profile({ onClose }: { onClose: () => void }) {
  const token = useGame((s) => s.token);
  const [p, setP] = useState<ProfileT | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  useEffect(() => {
    if (!token) return;
    api.me().then(setP).catch(() => {});
    api.history().then(setHistory).catch(() => {});
  }, [token]);

  if (!p) return <Modal title="Perfil" onClose={onClose}><p className="text-sm text-slate-400">Cargando…</p></Modal>;

  const stats: Array<[string, string]> = [
    ['Partidas', String(p.gamesPlayed)],
    ['Victorias', String(p.wins)],
    ['Derrotas', String(p.losses)],
    ['Bancarrotas', String(p.bankruptcies)],
    ['Ganado', money(p.moneyEarned)],
    ['Gastado', money(p.moneyLost)],
    ['Propiedades', String(p.propsAcquired)],
    ['Tiempo', `${Math.round(p.timePlayedSec / 60)} min`],
  ];

  return (
    <Modal title={`👤 ${displayName(p.nickname)}`} onClose={onClose}>
      <div className="mb-4 grid grid-cols-4 gap-2 text-center">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-lg bg-base-900/50 p-2">
            <p className="font-display text-sm font-bold text-gold-400">{v}</p>
            <p className="text-[10px] text-slate-400">{k}</p>
          </div>
        ))}
      </div>

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Logros</h3>
      <div className="mb-4 grid grid-cols-1 gap-1.5">
        {p.achievements.map((a) => (
          <div key={a.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${a.unlocked ? 'bg-emerald-500/15' : 'bg-base-900/40 opacity-50'}`}>
            <span>{a.unlocked ? '🏅' : '🔒'}</span>
            <div>
              <p className="font-semibold">{a.title}</p>
              <p className="text-[11px] text-slate-400">{a.description}</p>
            </div>
          </div>
        ))}
      </div>

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Historial</h3>
      <ul className="space-y-1 text-sm">
        {history.length === 0 && <li className="text-slate-500">Aún no has terminado partidas.</li>}
        {history.map((h, i) => (
          <li key={i} className="flex justify-between rounded-lg bg-base-900/40 px-2 py-1">
            <span>{h.isWinner ? '🏆' : `#${h.placement}`} Sala {h.code}</span>
            <span className="text-gold-400">{money(h.finalMoney)}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
