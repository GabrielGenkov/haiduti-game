import { TraitStrategy, registerTrait } from './trait-registry';

const evlogiTrait: TraitStrategy = {
  id: 'evlogi',

  getGroupBonus(_player, _hayduti, statType) {
    return statType === 'nabor' ? 2 : 0;
  },

  modifyEndGameStats(stats) {
    return { ...stats, nabor: Math.min(stats.nabor + 1, 10) };
  },

  getScoringLabel() {
    return 'Евлоги: +1 Набор';
  },
};

registerTrait(evlogiTrait);
