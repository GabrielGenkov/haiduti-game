import { TraitStrategy, registerTrait } from './trait-registry';

const popHaritonTrait: TraitStrategy = {
  id: 'pop_hariton',

  onDefeat() {
    return { allowFormGroup: true };
  },
};

registerTrait(popHaritonTrait);
