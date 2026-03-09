import { TraitStrategy, registerTrait } from './trait-registry';

const raynaTrait: TraitStrategy = {
  id: 'rayna',

  getGroupBonus(_player, hayduti) {
    return hayduti.length >= 3 ? 1 : 0;
  },

  getRaiseBonus(_player, hayduti) {
    return hayduti.length >= 3 ? 1 : 0;
  },
};

registerTrait(raynaTrait);
