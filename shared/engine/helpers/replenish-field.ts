import { GameState } from '../../types/state';
import { ALL_CARDS } from '../../constants/cards';
import { shuffle } from '../../utils/shuffle';

export function replenishField(state: GameState): GameState {
  let { field, fieldFaceUp, deck, usedCards, deckRotations } = state;

  const needed = 16 - field.length;
  if (needed <= 0) return state;

  const toAdd = Math.min(needed, deck.length);
  const newCards = deck.slice(0, toAdd);
  const newDeck = deck.slice(toAdd);

  field = [...field, ...newCards];
  fieldFaceUp = [...fieldFaceUp, ...new Array(toAdd).fill(false)];
  deck = newDeck;

  if (field.length < 16 && deck.length === 0) {
    deckRotations += 1;

    if (deckRotations >= state.maxRotations) {
      return {
        ...state,
        field,
        fieldFaceUp,
        deck,
        usedCards,
        deckRotations,
        phase: 'scoring',
        message: 'Играта приключи! Изчисляване на точките...',
      };
    }

    let silverCards = deckRotations === 1
      ? ALL_CARDS.filter(c => c.silverDiamond && !c.goldDiamond)
      : [];
    let goldCards = deckRotations >= 2
      ? ALL_CARDS.filter(c => c.goldDiamond)
      : [];

    const newDeckCards = shuffle([...usedCards, ...silverCards, ...goldCards]);
    usedCards = [];

    const stillNeeded = 16 - field.length;
    const fromNewDeck = newDeckCards.slice(0, stillNeeded);
    const remainingDeck = newDeckCards.slice(stillNeeded);

    field = [...field, ...fromNewDeck];
    fieldFaceUp = [...fieldFaceUp, ...new Array(fromNewDeck.length).fill(false)];
    deck = remainingDeck;
  }

  return { ...state, field, fieldFaceUp, deck, usedCards, deckRotations };
}
