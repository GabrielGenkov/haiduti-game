import { GameState } from "@shared/types";
import { ALL_CARDS } from "@shared/constants";
import { shuffle, createSeededRng } from '../../utils/shuffle';
import { emitEvent } from '../event-collector';
import { applyEffects } from "@shared/engine/effects";
import type { Effect } from '../effects/types';

/**
 * Find the first player with Lyuben trait but no stat choice, and create a decision.
 */
export function lyubenEndOfGameEffects(state: GameState): Effect[] {
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    if (p.traits.includes('lyuben') && !p.lyubenStatChoice) {
      return [
        {
          type: 'SET_DECISION',
          decision: {
            id: `lyuben-endgame-${i}`,
            kind: 'stat_choice' as const,
            ownerPlayerIndex: i,
            prompt: `${p.name}: Любен Каравелов — избери показател за +1 бонус.`,
            selectableStats: ['nabor', 'deynost', 'boyna'],
            context: {},
          },
        },
        { type: 'SET_MESSAGE', message: `${p.name}: Любен Каравелов — избери показател за крайния бонус.` },
      ];
    }
  }
  return [];
}

export function replenishFieldEffects(state: GameState): Effect[] {
  const effects: Effect[] = [];
  let field = [...state.field];
  let fieldFaceUp = [...state.fieldFaceUp];
  let deck = [...state.deck];
  let usedCards = state.usedCards;
  let deckRotations = state.deckRotations;

  const nullCount = field.filter(c => c === null).length;
  if (nullCount <= 0) return [];

  const toAdd = Math.min(nullCount, deck.length);
  if (toAdd > 0) {
    const cardIds = deck.slice(0, toAdd).map(c => c.id);
    effects.push({ type: 'MOVE_CARDS', cardIds, from: { zone: 'deck' }, to: { zone: 'field' } });
    emitEvent({ type: 'FIELD_REPLENISHED', cardsAdded: toAdd, deckRemaining: deck.length - toAdd });

    // Update local tracking — fill null slots
    const cardsToPlace = deck.slice(0, toAdd);
    let ci = 0;
    field = field.map(c => {
      if (c === null && ci < cardsToPlace.length) return cardsToPlace[ci++];
      return c;
    });
    deck = deck.slice(toAdd);
  }

  const stillNullCount = field.filter(c => c === null).length;
  if (stillNullCount > 0 && deck.length === 0) {
    deckRotations += 1;

    if (deckRotations >= state.maxRotations) {
      emitEvent({ type: 'GAME_ENDED', reason: 'max_rotations', finalRotation: deckRotations });
      effects.push(
        { type: 'SET_TURN_FLOW', updates: { deckRotations, phase: 'scoring' } },
        { type: 'SET_MESSAGE', message: 'Играта приключи! Изчисляване на точките...' },
      );

      // Check for pending Lyuben stat choices
      const intermediate = applyEffects(state, effects);
      effects.push(...lyubenEndOfGameEffects(intermediate));

      return effects;
    }

    const silverCards = deckRotations === 1
      ? ALL_CARDS.filter(c => c.silverDiamond && !c.goldDiamond)
      : [];
    const goldCards = deckRotations === 2
      ? ALL_CARDS.filter(c => c.goldDiamond)
      : [];

    emitEvent({ type: 'DECK_ROTATED', rotationNumber: deckRotations, includesSilver: deckRotations === 1, includesGold: deckRotations >= 2 });

    const rotationRng = createSeededRng(state.seed ^ (deckRotations * 0x9e3779b9));
    const newDeckCards = shuffle([...usedCards, ...silverCards, ...goldCards], rotationRng);

    const stillNeeded = field.filter(c => c === null).length;
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
