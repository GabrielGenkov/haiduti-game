import { TraitStrategy, registerTrait } from './trait-registry';

const stefanKarazhaTrait: TraitStrategy = {
  id: 'stefan_karadzha',

  getGroupBonus(_player, _hayduti, statType) {
    return statType === 'boyna' ? 2 : 0;
  },

  modifyEndGameStats(stats) {
    return { ...stats, boyna: Math.min(stats.boyna + 1, 10) };
  },

  getScoringLabel() {
    return 'Стефан Каража: +1 Бойна мощ';
  },
};

registerTrait(stefanKarazhaTrait);
