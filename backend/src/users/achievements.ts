// Data-driven achievements computed from a user's aggregate stats. Pure and
// testable — no DB, no framework.
export interface UserStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  bankruptcies: number;
  moneyEarned: number;
  propsAcquired: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
}

const DEFS: Array<{ id: string; title: string; description: string; test: (s: UserStats) => boolean }> = [
  { id: 'first_game', title: 'Primer parche', description: 'Juega tu primera partida.', test: (s) => s.gamesPlayed >= 1 },
  { id: 'first_win', title: '¡Ganó el barrio!', description: 'Gana tu primera partida.', test: (s) => s.wins >= 1 },
  { id: 'champion', title: 'Duro pa\' esto', description: 'Gana 5 partidas.', test: (s) => s.wins >= 5 },
  { id: 'veteran', title: 'Veterano', description: 'Juega 10 partidas.', test: (s) => s.gamesPlayed >= 10 },
  { id: 'magnate', title: 'Magnate', description: 'Acumula $10.000 en ganancias.', test: (s) => s.moneyEarned >= 10000 },
  { id: 'tycoon', title: 'Rey de la finca raíz', description: 'Adquiere 50 propiedades en total.', test: (s) => s.propsAcquired >= 50 },
  { id: 'phoenix', title: 'Ave fénix', description: 'Gana una partida tras haber quebrado antes.', test: (s) => s.wins >= 1 && s.bankruptcies >= 1 },
];

export function computeAchievements(stats: UserStats): Achievement[] {
  return DEFS.map(({ test, ...rest }) => ({ ...rest, unlocked: test(stats) }));
}
