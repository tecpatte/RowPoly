import { useState } from 'react';
import type { BoardData, GameState } from '../lib/types';
import { money } from '../lib/api';
import { useGame } from '../store/gameStore';
import { Modal } from './BuildModal';

export function TradeModal({ board, state, meId, onClose }: { board: BoardData; state: GameState; meId: string; onClose: () => void }) {
  const command = useGame((s) => s.command);
  const others = state.players.filter((p) => p.id !== meId && !p.bankrupt);
  const [target, setTarget] = useState(others[0]?.id ?? '');
  const [offer, setOffer] = useState<number[]>([]);
  const [request, setRequest] = useState<number[]>([]);
  const [offerMoney, setOfferMoney] = useState(0);
  const [requestMoney, setRequestMoney] = useState(0);

  const name = (pos: number) => board.tiles.find((t) => t.position === pos)?.name ?? `#${pos}`;
  const myProps = Object.values(state.ownerships).filter((o) => o.ownerId === meId && !o.hotel && o.houses === 0);
  const theirProps = Object.values(state.ownerships).filter((o) => o.ownerId === target && !o.hotel && o.houses === 0);
  const toggle = (arr: number[], set: (v: number[]) => void, pos: number) =>
    set(arr.includes(pos) ? arr.filter((p) => p !== pos) : [...arr, pos]);

  const propose = () => {
    command('PROPOSE_TRADE', {
      toPlayerId: target,
      offer: { money: offerMoney, properties: offer },
      request: { money: requestMoney, properties: request },
    });
    onClose();
  };

  const List = ({ items, sel, set }: { items: typeof myProps; sel: number[]; set: (v: number[]) => void }) => (
    <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg bg-base-900/50 p-2">
      {items.length === 0 && <p className="text-[11px] text-slate-500">Sin propiedades negociables</p>}
      {items.map((o) => (
        <label key={o.position} className="flex cursor-pointer items-center gap-2 text-xs">
          <input type="checkbox" checked={sel.includes(o.position)} onChange={() => toggle(sel, set, o.position)} />
          {name(o.position)}
        </label>
      ))}
    </div>
  );

  return (
    <Modal title="Proponer trato" onClose={onClose}>
      {others.length === 0 ? (
        <p className="text-sm text-slate-400">No hay con quién negociar.</p>
      ) : (
        <div className="space-y-3 text-sm">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Con</label>
            <select className="input" value={target} onChange={(e) => { setTarget(e.target.value); setRequest([]); }}>
              {others.map((p) => <option key={p.id} value={p.id}>{p.nickname}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold text-emerald-500">Ofreces</p>
              <List items={myProps} sel={offer} set={setOffer} />
              <input type="number" min={0} className="input mt-1 py-1" value={offerMoney} onChange={(e) => setOfferMoney(Math.max(0, +e.target.value))} placeholder="Dinero" />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-gold-400">Pides</p>
              <List items={theirProps} sel={request} set={setRequest} />
              <input type="number" min={0} className="input mt-1 py-1" value={requestMoney} onChange={(e) => setRequestMoney(Math.max(0, +e.target.value))} placeholder="Dinero" />
            </div>
          </div>
          <button className="btn-gold w-full" onClick={propose}>Enviar propuesta</button>
        </div>
      )}
    </Modal>
  );
}

export function TradeBanner({ board, state, meId }: { board: BoardData; state: GameState; meId: string }) {
  const command = useGame((s) => s.command);
  const name = (pos: number) => board.tiles.find((t) => t.position === pos)?.name ?? `#${pos}`;
  const incoming = state.trades.filter((t) => t.toPlayerId === meId && t.status === 'PENDING');
  if (incoming.length === 0) return null;
  const from = (id: string) => state.players.find((p) => p.id === id)?.nickname ?? '';

  return (
    <div className="space-y-2">
      {incoming.map((t) => (
        <div key={t.id} className="card border-gold-400 p-3 text-sm">
          <p className="mb-1 font-semibold text-gold-400">{from(t.fromPlayerId)} te propone:</p>
          <p className="text-[12px] text-slate-300">Te da: {[...t.offerProperties.map(name), t.offerMoney ? money(t.offerMoney) : ''].filter(Boolean).join(', ') || 'nada'}</p>
          <p className="text-[12px] text-slate-300">Pide: {[...t.requestProperties.map(name), t.requestMoney ? money(t.requestMoney) : ''].filter(Boolean).join(', ') || 'nada'}</p>
          <div className="mt-2 flex gap-2">
            <button className="btn-emerald flex-1 py-1 text-xs" onClick={() => command('RESPOND_TRADE', { tradeId: t.id, accept: true })}>Aceptar</button>
            <button className="btn-ghost flex-1 py-1 text-xs" onClick={() => command('RESPOND_TRADE', { tradeId: t.id, accept: false })}>Rechazar</button>
          </div>
        </div>
      ))}
    </div>
  );
}
