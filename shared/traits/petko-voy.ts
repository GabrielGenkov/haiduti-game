import { TraitStrategy, registerTrait } from './trait-registry';

const petkoVoyTrait: TraitStrategy = {
  id: 'petko_voy',

  onDefeat() {
    return { keepCards: 2 };
  },

  getEndGameBonusPoints(player) {
    if (player.raisedDeytsi.length === 0) return null;
    const bonus = player.raisedDeytsi.length * 2;
    return { points: bonus, label: `Петко Войвода: +${bonus} (${player.raisedDeytsi.length} Дейци)` };
  },
};

registerTrait(petkoVoyTrait);
