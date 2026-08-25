import { useEffect, useState } from 'react';
import { api, displayName } from '../lib/api';
import type { RoomSummary } from '../lib/types';
import { useGame } from '../store/gameStore';
import { Profile } from './Profile';

export function Menu() {
  const { token, user, logout, joinRoom } = useGame();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [code, setCode] = useState('');
  const [board, setBoard] = useState<{ startingMoney: number; maxPlayers: number; isPrivate: boolean }>({ startingMoney: 1500, maxPlayers: 6, isPrivate: false });
  const [err, setErr] = useState('');
  const [leaders, setLeaders] = useState<Array<{ nickname: string; wins: number }>>([]);
  const [showProfile, setShowProfile] = useState(false);

  const quickPlay = async () => {
    if (!token) return;
    setErr('');
    try {
      const { code } = await api.quickPlay();
      joinRoom(code);
    } catch (e) { setErr((e as Error).message); }
  };

  const refresh = async () => {
    if (!token) return;
    try { setRooms(await api.listRooms()); } catch {}
  };
  useEffect(() => {
    refresh();
    api.leaderboard().then(setLeaders).catch(() => {});
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [token]);

  const create = async () => {
    if (!token) return;
    setErr('');
    try {
      const { code } = await api.createRoom(board);
      joinRoom(code);
    } catch (e) { setErr((e as Error).message); }
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-extrabold text-gold-400">ROWPOLY</h1>
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-500">Monopoly Colombia</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <button className="btn-ghost py-1" onClick={() => setShowProfile(true)}>👤 {displayName(user?.nickname)}</button>
          <button className="btn-ghost py-1" onClick={logout}>Salir</button>
        </div>
      </header>

      <button className="btn-gold rp-sheen relative mb-6 w-full overflow-hidden py-3 text-lg" onClick={quickPlay}>⚡ Jugar ya (emparejamiento rápido)</button>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card space-y-4 rp-rise">
          <h2 className="font-display text-xl font-bold">Crear partida</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="space-y-1">
              <span className="text-slate-400">Dinero inicial por jugador</span>
              <input
                type="number"
                className="input"
                value={board.startingMoney}
                min={500}
                max={20000}
                step={100}
                onChange={(e) => setBoard({ ...board, startingMoney: +e.target.value })}
                onBlur={(e) => setBoard({ ...board, startingMoney: Math.min(20000, Math.max(500, Math.round((+e.target.value || 1500) / 100) * 100)) })}
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {[1500, 2500, 5000, 10000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${board.startingMoney === v ? 'border-gold-400 bg-gold-400/20 text-gold-400' : 'border-base-600 text-slate-300 hover:bg-base-700'}`}
                    onClick={() => setBoard({ ...board, startingMoney: v })}
                  >
                    ${v.toLocaleString('es-CO')}
                  </button>
                ))}
              </div>
            </label>
            <label className="space-y-1">
              <span className="text-slate-400">Máx. jugadores</span>
              <input type="number" className="input" value={board.maxPlayers} min={2} max={8} onChange={(e) => setBoard({ ...board, maxPlayers: +e.target.value })} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={board.isPrivate} onChange={(e) => setBoard({ ...board, isPrivate: e.target.checked })} />
            Sala privada (solo con código)
          </label>
          <button className="btn-gold w-full" onClick={create}>Crear y entrar</button>
          {err && <p className="text-sm text-coral">{err}</p>}

          <div className="border-t border-base-600 pt-4">
            <h3 className="mb-2 text-sm font-semibold">Unirse con código</h3>
            <div className="flex gap-2">
              <input className="input uppercase" placeholder="ABCDE" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
              <button className="btn-emerald" disabled={code.length < 4} onClick={() => joinRoom(code)}>Unirse</button>
            </div>
          </div>
        </section>

        <section className="space-y-6 rp-rise rp-delay-2">
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Salas públicas</h2>
              <button className="text-xs text-emerald-500 hover:underline" onClick={refresh}>↻ Actualizar</button>
            </div>
            <ul className="space-y-2">
              {rooms.length === 0 && <li className="text-sm text-slate-500">No hay salas abiertas. ¡Crea una!</li>}
              {rooms.map((r) => (
                <li key={r.code} className="flex items-center justify-between rounded-lg bg-base-900/50 px-3 py-2">
                  <div>
                    <p className="font-semibold">Sala {r.code}</p>
                    <p className="text-[11px] text-slate-400">{r.members.length}/{r.maxPlayers} jugadores</p>
                  </div>
                  <button className="btn-emerald py-1 text-sm" disabled={r.members.length >= r.maxPlayers} onClick={() => joinRoom(r.code)}>Entrar</button>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2 className="mb-3 font-display text-xl font-bold">🏆 Clasificación</h2>
            <ol className="space-y-1 text-sm">
              {leaders.length === 0 && <li className="text-slate-500">Todavía sin campeones.</li>}
              {leaders.slice(0, 5).map((l, i) => (
                <li key={i} className="flex justify-between">
                  <span>{i + 1}. {l.nickname}</span>
                  <span className="text-gold-400">{l.wins} victorias</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      {showProfile && <Profile onClose={() => setShowProfile(false)} />}
    </div>
  );
}
