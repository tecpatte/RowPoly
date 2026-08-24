import { useState } from 'react';
import { useGame } from '../store/gameStore';

export function Chat() {
  const chat = useGame((s) => s.chat);
  const send = useGame((s) => s.sendChat);
  const [text, setText] = useState('');

  return (
    <div className="card flex h-40 flex-col p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Chat</h3>
      <div className="mb-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 text-[12px]">
        {chat.map((m, i) => (
          <p key={i}><span className="font-semibold text-gold-400">{m.nickname}:</span> <span className="text-slate-300">{m.text}</span></p>
        ))}
        {chat.length === 0 && <p className="text-slate-600">Saluda a la mesa 👋</p>}
      </div>
      <form
        className="flex gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
          setText('');
        }}
      >
        <input className="input py-1 text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe…" maxLength={300} />
        <button className="btn-emerald px-3 py-1 text-sm" aria-label="Enviar mensaje">➤</button>
      </form>
    </div>
  );
}
