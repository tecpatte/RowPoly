import { describe, expect, it } from 'vitest';
import { computeAchievements } from './achievements';

const base = { gamesPlayed: 0, wins: 0, losses: 0, bankruptcies: 0, moneyEarned: 0, propsAcquired: 0 };
const unlocked = (s: Parameters<typeof computeAchievements>[0]) =>
  computeAchievements(s).filter((a) => a.unlocked).map((a) => a.id);

describe('achievements', () => {
  it('un jugador nuevo no tiene logros', () => {
    expect(unlocked(base)).toEqual([]);
  });

  it('primera partida y primera victoria', () => {
    expect(unlocked({ ...base, gamesPlayed: 1, wins: 1 })).toContain('first_game');
    expect(unlocked({ ...base, gamesPlayed: 1, wins: 1 })).toContain('first_win');
  });

  it('ave fénix requiere ganar tras quebrar', () => {
    expect(unlocked({ ...base, wins: 1, bankruptcies: 1, gamesPlayed: 2 })).toContain('phoenix');
    expect(unlocked({ ...base, wins: 1, bankruptcies: 0, gamesPlayed: 1 })).not.toContain('phoenix');
  });

  it('magnate y campeón por umbrales', () => {
    const ids = unlocked({ ...base, gamesPlayed: 10, wins: 5, moneyEarned: 10000, propsAcquired: 50 });
    expect(ids).toEqual(expect.arrayContaining(['champion', 'veteran', 'magnate', 'tycoon']));
  });
});
