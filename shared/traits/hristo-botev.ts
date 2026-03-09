import { TraitStrategy, registerTrait } from './trait-registry';

const hristoBotevTrait: TraitStrategy = {
  id: 'hristo_botev',

  getGroupBonus() {
    return 2;
  },

  getRaiseBonus() {
    return 2;
  },

  modifyEndGameStats(stats) {
    return {
      nabor: Math.min(stats.nabor + 1, 10),
      deynost: Math.min(stats.deynost + 1, 10),
      boyna: Math.min(stats.boyna + 1, 10),
    };
  },

  getScoringLabel() {
    return 'Христо Ботев: +1 на всички показатели';
  },
};

registerTrait(hristoBotevTrait);
