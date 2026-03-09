import { TraitStrategy, registerTrait } from './trait-registry';

const benkovskiTrait: TraitStrategy = {
  id: 'benkovski',

  // Turn-start bonus (+2 actions) is handled by advanceTurn helper
  // since it modifies actionsRemaining before the player's turn begins.

  getEndGameBonusPoints(player) {
    if (player.raisedVoyvodas.length === 0) return null;
    const bonus = player.raisedVoyvodas.length * 2;
    return { points: bonus, label: `Бенковски: +${bonus} (${player.raisedVoyvodas.length} Войводи)` };
  },
};

registerTrait(benkovskiTrait);
