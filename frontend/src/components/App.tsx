import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { BoardData } from '../lib/types';
import { useGame } from '../store/gameStore';
import { Auth } from './Auth';
import { Menu } from './Menu';
import { Lobby } from './Lobby';
import { GameView } from './GameView';
import { CardToast } from './CardToast';

export function App() {
  const { view, toast, clearToast, hydrate, events } = useGame();
  const [board, setBoard] = useState<BoardData | null>(null);

  useEffect(() => {
    hydrate();
    api.board().then(setBoard).catch(() => {});
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(clearToast, 3500);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <>
      {view === 'auth' && <Auth />}
      {view === 'menu' && <Menu />}
      {view === 'lobby' && <Lobby />}
      {view === 'game' && (board ? <GameView board={board} /> : <Loading />)}

      {view === 'game' && <CardToast events={events} />}

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}

function Loading() {
  return <div className="flex min-h-screen items-center justify-center text-gold-400">Cargando el tablero…</div>;
}
