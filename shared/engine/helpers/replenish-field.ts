import { GameState } from '../../types/state';
import { ALL_CARDS } from '../../constants/cards';
import { shuffle } from '../../utils/shuffle';
import { emitEvent } from '../event-collector';
import { applyEffects } from '../effects/apply-effect';
import type { Effect } from '../effects/types';

export function replenishFieldEffects(state: GameState): Effect[] {
  const effects: Effect[] = [];
  let { field, fieldFaceUp, deck, usedCards, deckRotations } = state;

  const needed = 16 - field.length;
  if (needed <= 0) return [];

  const toAdd = Math.min(needed, deck.length);
  if (toAdd > 0) {
    const cardIds = deck.slice(0, toAdd).map(c => c.id);
    effects.push({ type: 'MOVE_CARDS', cardIds, from: { zone: 'deck' }, to: { zone: 'field' } });
    emitEvent({ type: 'FIELD_REPLENISHED', cardsAdded: toAdd, deckRemaining: deck.length - toAdd });

    // Update local tracking
    field = [...field, ...deck.slice(0, toAdd)];
    fieldFaceUp = [...fieldFaceUp, ...new Array(toAdd).fill(false)];
    deck = deck.slice(toAdd);
  }

  if (field.length < 16 && deck.length === 0) {
    deckRotations += 1;

    if (deckRotations >= state.maxRotations) {
      emitEvent({ type: 'GAME_ENDED', reason: 'max_rotations', finalRotation: deckRotations });
      effects.push(
        { type: 'SET_TURN_FLOW', updates: { deckRotations, phase: 'scoring' } },
        { type: 'SET_MESSAGE', message: 'Играта приключи! Изчисляване на точките...' },
      );
      return effects;
    }

    const silverCards = deckRotations === 1
      ? ALL_CARDS.filter(c => c.silverDiamond && !c.goldDiamond)
      : [];
    const goldCards = deckRotations >= 2
      ? ALL_CARDS.filter(c => c.goldDiamond)
      : [];

    emitEvent({ type: 'DECK_ROTATED', rotationNumber: deckRotations, includesSilver: deckRotations === 1, includesGold: deckRotations >= 2 });

    const newDeckCards = shuffle([...usedCards, ...silverCards, ...goldCards]);

    const stillNeeded = 16 - field.length;
    const fromNewDeck = newDeckCards.slice(0, stillNeeded);

    // Replace deck with ALL shuffled cards, clear usedCards.
    // MOVE_CARDS below will then take the needed cards from the top.
    effects.push({ type: 'REPLACE_DECK', newDeck: newDeckCards, clearUsedCards: true });

    if (fromNewDeck.length > 0) {
      effects.push({
        type: 'MOVE_CARDS',
        cardIds: fromNewDeck.map(c => c.id),
        from: { zone: 'deck' },
        to: { zone: 'field' },
      });
    }

    effects.push({ type: 'SET_TURN_FLOW', updates: { deckRotations } });
  }

  return effects;
}

/**
 * Legacy wrapper — applies replenishFieldEffects and returns new state.
 */
export function replenishField(state: GameState): GameState {
  const effects = replenishFieldEffects(state);
  if (effects.length === 0) return state;
  return applyEffects(state, effects);
}
