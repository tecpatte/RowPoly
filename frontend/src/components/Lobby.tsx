import { money } from '../lib/api';
import { useGame } from '../store/gameStore';

export function Lobby() {
  const { room, user, startGame, leaveRoom } = useGame();
  if (!room) return null;
  const isHost = room.hostUserId === user?.id;
  const canStart = room.members.length >= 2;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center p-6">
      <div className="card w-full rp-pop">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-widest text-slate-400">Sala</p>
          <p className="font-display text-5xl font-extrabold tracking-[0.2em] text-gold-400">{room.code}</p>
          <p className="mt-1 text-sm text-slate-400">Comparte este código para que entren tus panas</p>
        </div>

        <div className="mb-4 flex justify-between text-sm text-slate-400">
          <span>{room.members.length}/{room.maxPlayers} jugadores</span>
          <span>Inicio: {money(room.startingMoney)} · {room.isPrivate ? 'Privada' : 'Pública'}</span>
        </div>

        <ul className="mb-6 space-y-2">
          {room.members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 rounded-lg bg-base-900/50 px-3 py-2">
              <span className="h-4 w-4 rounded-full border border-black/40" style={{ background: m.color }} />
              <span className="flex-1 font-semibold">{m.nickname}</span>
              {m.userId === room.hostUserId && <span className="text-xs text-gold-400">👑 Anfitrión</span>}
              {!m.connected && <span title="Desconectado">📴</span>}
            </li>
          ))}
          {Array.from({ length: Math.max(0, room.maxPlayers - room.members.length) }).map((_, i) => (
            <li key={i} className="rounded-lg border border-dashed border-base-600 px-3 py-2 text-sm text-slate-600">Esperando jugador…</li>
          ))}
        </ul>

        <div className="flex gap-3">
          <button className="btn-ghost flex-1" onClick={leaveRoom}>Salir</button>
          {isHost ? (
            <button className="btn-gold flex-1" disabled={!canStart} onClick={startGame}>
              {canStart ? 'Iniciar partida' : 'Faltan jugadores'}
            </button>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Esperando al anfitrión…</div>
          )}
        </div>
      </div>
    </div>
  );
}
