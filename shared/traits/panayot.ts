import { TraitStrategy, registerTrait } from './trait-registry';

// Panayot's cross-player trigger is handled inline in handleZaptieEncounter
// and the PANAYOT_PICK_CARD/PANAYOT_SKIP action handlers.
// This trait has no passive hooks.
const panayotTrait: TraitStrategy = {
  id: 'panayot',
};

registerTrait(panayotTrait);
