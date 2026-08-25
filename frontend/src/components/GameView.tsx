import { useState } from 'react';
import type { BoardData } from '../lib/types';
import { useGame } from '../store/gameStore';
import { Board } from './Board';
import { PlayerPanel } from './PlayerPanel';
import { MyProperties } from './MyProperties';
import { ActionBar } from './ActionBar';
import { EventLog } from './EventLog';
import { Chat } from './Chat';
import { BuildModal } from './BuildModal';
import { TradeModal, TradeBanner } from './TradeModal';
import { PropertyInspector } from './PropertyInspector';
import { WinCelebration } from './WinCelebration';

export function GameView({ board }: { board: BoardData }) {
  const { state, user, events, leaveRoom } = useGame();
  const [modal, setModal] = useState<null | 'build' | 'trade'>(null);
  const [inspect, setInspect] = useState<number | null>(null);
  if (!state || !user) return null;
  const me = state.players.find((p) => p.userId === user.id);
  const meId = me?.id ?? '';

  return (
    <div className="mx-auto max-w-[1600px] p-2 lg:p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-xl font-bold text-gold-400">ROWPOLY</h1>
          <span className="text-xs text-slate-400">Sala {state.code}</span>
        </div>
        <button className="btn-ghost py-1 text-sm" onClick={leaveRoom}>Salir</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <Board
            board={board}
            state={state}
            onSelect={setInspect}
            center={
              <>
                <ActionBar board={board} state={state} meUserId={user.id} onOpenBuild={() => setModal('build')} onOpenTrade={() => setModal('trade')} />
                <EventLog events={events.length ? events : state.log} />
              </>
            }
          />
          <TradeBanner board={board} state={state} meId={meId} />
        </div>

        <div className="flex flex-col gap-3 lg:h-[88vh]">
          <PlayerPanel state={state} meUserId={user.id} />
          <MyProperties board={board} state={state} meId={meId} />
          <Chat />
        </div>
      </div>

      {modal === 'build' && <BuildModal board={board} state={state} meId={meId} onClose={() => setModal(null)} />}
      {modal === 'trade' && <TradeModal board={board} state={state} meId={meId} onClose={() => setModal(null)} />}
      {inspect != null && <PropertyInspector board={board} state={state} position={inspect} onClose={() => setInspect(null)} />}
      {state.phase === 'ENDED' && <WinCelebration state={state} />}
    </div>
  );
}
