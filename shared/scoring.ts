import { Player } from './types/player';
import { PlayerScore } from './types/scoring';
import { getActiveTraits } from './traits/trait-registry';

// Ensure all traits are registered
import './traits/index';

export function calculateScores(players: Player[]): PlayerScore[] {
  // Step 1: Apply end-of-game stat boosts from traits
  const effectiveStatsList = players.map(player => {
    let stats = { ...player.stats };
    for (const trait of getActiveTraits(player)) {
      if (trait.modifyEndGameStats) {
        stats = trait.modifyEndGameStats(stats, player);
      }
    }
    return stats;
  });

  // Step 2: Find leaders using effective stats
  const maxNabor = Math.max(...effectiveStatsList.map(s => s.nabor));
  const maxDeynost = Math.max(...effectiveStatsList.map(s => s.deynost));
  const maxBoyna = Math.max(...effectiveStatsList.map(s => s.boyna));

  return players.map((player, idx) => {
    const effectiveStats = effectiveStatsList[idx];
    const statTotal = effectiveStats.nabor + effectiveStats.deynost + effectiveStats.boyna;

    // Standard leadership bonus (5 pts per stat where player leads)
    let leadershipBonus = 0;
    if (effectiveStats.nabor === maxNabor) leadershipBonus += 5;
    if (effectiveStats.deynost === maxDeynost) leadershipBonus += 5;
    if (effectiveStats.boyna === maxBoyna) leadershipBonus += 5;

    const voyvodaPoints = player.raisedVoyvodas.reduce((sum, c) => sum + (c.chetaPoints ?? 0), 0);
    const deyetsPoints = player.raisedDeytsi.reduce((sum, c) => sum + (c.chetaPoints ?? 0), 0);

    // Step 3: Extra trait bonus points
    let traitBonusPoints = 0;
    const traitBonusBreakdown: string[] = [];

    for (const trait of getActiveTraits(player)) {
      if (trait.getEndGameBonusPoints) {
        const result = trait.getEndGameBonusPoints(player, effectiveStats, effectiveStatsList);
        if (result) {
          traitBonusPoints += result.points;
          traitBonusBreakdown.push(result.label);
        }
      }
    }

    // Stat boost breakdown labels
    for (const trait of getActiveTraits(player)) {
      if (trait.getScoringLabel) {
        const label = trait.getScoringLabel(player);
        if (label) traitBonusBreakdown.push(label);
      }
    }

    return {
      playerId: player.id,
      playerName: player.name,
      effectiveStats,
      statTotal,
      leadershipBonus,
      voyvodaPoints,
      deyetsPoints,
      traitBonusPoints,
      traitBonusBreakdown,
      total: statTotal + leadershipBonus + voyvodaPoints + deyetsPoints + traitBonusPoints,
    };
  });
}
