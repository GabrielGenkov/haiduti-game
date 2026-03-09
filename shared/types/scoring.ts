import { PlayerStats } from './player';

export interface PlayerScore {
  playerId: string;
  playerName: string;
  effectiveStats: PlayerStats;
  statTotal: number;
  leadershipBonus: number;
  voyvodaPoints: number;
  deyetsPoints: number;
  traitBonusPoints: number;
  traitBonusBreakdown: string[];
  total: number;
}
