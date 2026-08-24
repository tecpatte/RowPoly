import { useState } from 'react';
import { api } from '../lib/api';
import { useGame } from '../store/gameStore';

export function Auth() {
  const setAuth = useGame((s) => s.setAuth);
  const [mode, setMode] = useState<'login' | 'register' | 'guest'>('guest');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res =
        mode === 'login' ? await api.login(email, password)
        : mode === 'register' ? await api.register(email, nickname, password)
        : await api.guest(nickname);
      setAuth(res.accessToken, res.refreshToken, res.user);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm rp-pop">
        <div className="mb-6 text-center">
          <h1 className="font-display text-5xl font-extrabold text-gold-400">ROWPOLY</h1>
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-500">Monopoly Colombia</p>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-1 rounded-lg bg-base-900 p-1 text-sm">
          {(['guest', 'login', 'register'] as const).map((m) => (
            <button
              key={m}
              className={`rounded-md py-1.5 font-semibold transition ${mode === m ? 'bg-gold-400 text-base-900' : 'text-slate-300'}`}
              onClick={() => setMode(m)}
            >
              {m === 'guest' ? 'Invitado' : m === 'login' ? 'Entrar' : 'Registro'}
            </button>
          ))}
        </div>

        <form className="space-y-3" onSubmit={submit}>
          {mode !== 'login' && (
            <input className="input" placeholder="Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} required minLength={3} maxLength={20} />
          )}
          {mode !== 'guest' && (
            <>
              <input className="input" type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input className="input" type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </>
          )}
          {err && <p className="text-sm text-coral">{err}</p>}
          <button className="btn-gold w-full" disabled={busy}>
            {busy ? '…' : mode === 'guest' ? '¡Vamos pues!' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}
