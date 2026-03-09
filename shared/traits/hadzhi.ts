import { TraitStrategy, registerTrait } from './trait-registry';

// Hadzhi's active ability (remove Zaptie from field) is handled by
// the USE_HADZHI_ABILITY action handler. This trait only has scoring hooks.
const hadzhiTrait: TraitStrategy = {
  id: 'hadzhi',

  getEndGameBonusPoints(_player, effectiveStats, allEffectiveStats) {
    const maxBoyna = Math.max(...allEffectiveStats.map(s => s.boyna));
    if (effectiveStats.boyna === maxBoyna) {
      return { points: 4, label: 'Хаджи Димитър: +4 (водещ по Бойна мощ)' };
    }
    return null;
  },
};

registerTrait(hadzhiTrait);
