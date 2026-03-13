import { TraitStrategy, registerTrait } from './trait-registry';

// Panayot's cross-player trigger is handled inline in handleZaptieEncounter
// and the PANAYOT_PICK_CARD/PANAYOT_SKIP action handlers.
const panayotTrait: TraitStrategy = {
  id: 'panayot',

  getEndGameBonusPoints(_player, effectiveStats, allEffectiveStats) {
    const maxDeynost = Math.max(...allEffectiveStats.map(s => s.deynost));
    if (effectiveStats.deynost === maxDeynost) {
      return { points: 4, label: 'Панайот Хитов: +4 (водещ по Дейност)' };
    }
    return null;
  },
};

registerTrait(panayotTrait);
