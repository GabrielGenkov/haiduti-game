import { TraitStrategy, registerTrait } from './trait-registry';

// Sofroniy's active ability is handled by the USE_SOFRONIY_ABILITY action handler.
// This trait has no passive hooks.
const sofroniyTrait: TraitStrategy = {
  id: 'sofroniy',
};

registerTrait(sofroniyTrait);
