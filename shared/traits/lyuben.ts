import { TraitStrategy, registerTrait } from './trait-registry';

const lyubenTrait: TraitStrategy = {
  id: 'lyuben',

  getGroupBonus() {
    return 1;
  },

  getRaiseBonus() {
    return 1;
  },

  modifyEndGameStats(stats, player) {
    if (!player.lyubenStatChoice) return stats;
    return {
      ...stats,
      [player.lyubenStatChoice]: Math.min(stats[player.lyubenStatChoice] + 1, 10),
    };
  },

  getScoringLabel(player) {
    if (!player.lyubenStatChoice) return null;
    return `Любен Каравелов: +1 ${player.lyubenStatChoice}`;
  },
};

registerTrait(lyubenTrait);
