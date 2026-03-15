import { Player, PlayerStats } from './types/player';
import { PlayerScore } from './types/scoring';
import { SCORE_RULES } from './engine/rule-tables';

function getEffectiveStats(player: Player): PlayerStats {
  let stats = { ...player.stats };
  for (const rule of SCORE_RULES) {
    if (player.traits.includes(rule.id) && rule.applyStats) {
      stats = rule.applyStats(stats, player);
    }
  }
  return stats;
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

    for (const rule of SCORE_RULES) {
      if (!player.traits.includes(rule.id)) continue;
      if (rule.getPoints) {
        const points = rule.getPoints(player, effectiveStats, effectiveStatsList);
        if (points > 0) {
          traitBonusPoints += points;
        }
      }
      if (rule.getLabel) {
        const label = rule.getLabel(player, effectiveStats, effectiveStatsList);
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
