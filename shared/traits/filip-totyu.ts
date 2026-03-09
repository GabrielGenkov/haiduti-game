import { TraitStrategy, registerTrait } from './trait-registry';

const filipTotyuTrait: TraitStrategy = {
  id: 'filip_totyu',

  getGroupBonus(_player, _hayduti, statType) {
    return statType === 'deynost' ? 2 : 0;
  },

  modifyEndGameStats(stats) {
    return { ...stats, deynost: Math.min(stats.deynost + 1, 10) };
  },

  getScoringLabel() {
    return 'Филип Тотю: +1 Дейност';
  },
};

registerTrait(filipTotyuTrait);
