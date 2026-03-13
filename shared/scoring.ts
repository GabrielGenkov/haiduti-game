import { Player } from './types/player';
import { PlayerScore } from './types/scoring';
import { getActiveTraits } from './traits';

function getEffectiveStats(player: Player) {
  const traits = getActiveTraits(player);
  return traits.reduce((stats, trait) => {
    if (trait.modifyEndGameStats) return trait.modifyEndGameStats(stats, player);
    return stats;
  }, { ...player.stats });
}

export function calculateScores(players: Player[]): PlayerScore[] {
  const effectiveStatsList = players.map(getEffectiveStats);
  const maxNabor = Math.max(...effectiveStatsList.map(stats => stats.nabor));
  const maxDeynost = Math.max(...effectiveStatsList.map(stats => stats.deynost));
  const maxBoyna = Math.max(...effectiveStatsList.map(stats => stats.boyna));

  return players.map((player, index) => {
    const effectiveStats = effectiveStatsList[index];
    const statTotal = effectiveStats.nabor + effectiveStats.deynost + effectiveStats.boyna;

    let leadershipBonus = 0;
    if (effectiveStats.nabor === maxNabor) leadershipBonus += 5;
    if (effectiveStats.deynost === maxDeynost) leadershipBonus += 5;
    if (effectiveStats.boyna === maxBoyna) leadershipBonus += 5;

    const voyvodaPoints = player.raisedVoyvodas.reduce(
      (sum, card) => sum + (card.chetaPoints ?? 0),
      0
    );

    let traitBonusPoints = 0;
    const traitBonusBreakdown: string[] = [];

    for (const trait of getActiveTraits(player)) {
      if (trait.getEndGameBonusPoints) {
        const result = trait.getEndGameBonusPoints(player, effectiveStats, effectiveStatsList);
        if (result && result.points > 0) {
          traitBonusPoints += result.points;
          traitBonusBreakdown.push(result.label);
        }
      }
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
      deyetsPoints: 0,
      traitBonusPoints,
      traitBonusBreakdown,
      total: statTotal + leadershipBonus + voyvodaPoints + traitBonusPoints,
    };
  });
}
