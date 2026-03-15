import { ContributionType } from '../types/card';
import { PlayerStats } from '../types/player';
import { STAT_TRACK, STAT_UPGRADE_COSTS } from '../constants/stats';

export function getStatValue(stats: PlayerStats, type: ContributionType): number {
  switch (type) {
    case 'nabor': return stats.nabor;
    case 'deynost': return stats.deynost;
    case 'boyna': return stats.boyna;
  }
}

export function getNextStatValue(current: number): number | null {
  const idx = STAT_TRACK.indexOf(current);
  if (idx === -1 || idx === STAT_TRACK.length - 1) return null;
  return STAT_TRACK[idx + 1];
}

export function getUpgradeCost(targetValue: number): number {
  return STAT_UPGRADE_COSTS[targetValue] ?? 999;
}

export function getMaxReachableStatValue(current: number, groupStrength: number): number | null {
  let max: number | null = null;
  for (const level of STAT_TRACK) {
    if (level > current && getUpgradeCost(level) <= groupStrength) {
      max = level;
    }
  }
  return max;
}

export function getMaxRotations(gameLength: 'short' | 'medium' | 'long'): number {
  switch (gameLength) {
    case 'short': return 2;
    case 'medium': return 3;
    case 'long': return 4;
  }
}
