import { TraitStrategy, registerTrait } from './trait-registry';

const rakowskiTrait: TraitStrategy = {
  id: 'rakowski',

  onGroupFormed(player, hayduti, selectedCardIds) {
    if (player.isRevealed) return null;

    // Keep the strongest haydut from the group
    const sortedHayduti = [...hayduti].sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));
    const keptCard = sortedHayduti[0];
    const discarded = hayduti.filter(c => c.id !== keptCard.id);
    const newHand = player.hand.filter(c => !discarded.some(d => d.id === c.id));
    return { newHand, discarded };
  },
};

registerTrait(rakowskiTrait);
