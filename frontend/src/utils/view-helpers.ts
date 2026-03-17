import type { GameState } from '@shared/gameData';
import type { PlayerViewState, PlayerView, HiddenHand, MaskedFieldCard } from '@shared/gameData';
import type { Player } from '@shared/gameData';
import type { Card } from '@shared/gameData';

/** Union type for state that can be full or masked. */
export type AnyGameState = GameState | PlayerViewState;

function isPlayerView(state: AnyGameState): state is PlayerViewState {
  return 'deckCount' in state;
}

/** Normalize field to MaskedFieldCard[] for both full and masked state. */
export function getMaskedField(state: AnyGameState): MaskedFieldCard[] {
  if (isPlayerView(state)) return state.field;
  return state.field.map((card, i) => {
    if (card === null) return 'empty';
    return state.fieldFaceUp[i] ? card : null;
  });
}

/** Normalize sideField to MaskedFieldCard[] for both full and masked state. */
export function getMaskedSideField(state: AnyGameState): MaskedFieldCard[] {
  if (isPlayerView(state)) return state.sideField;
  return state.sideField.map((card, i) => {
    if (card === null) return 'empty';
    return state.sideFieldFaceUp[i] ? card : null;
  });
}

export function getDeckCount(state: AnyGameState): number {
  return 'deckCount' in state ? state.deckCount : (state as GameState).deck.length;
}

export function getUsedCardsCount(state: AnyGameState): number {
  return 'usedCardsCount' in state ? state.usedCardsCount : (state as GameState).usedCards.length;
}

export function getPlayerHand(player: Player | PlayerView): Card[] {
  return Array.isArray(player.hand) ? player.hand : [];
}

export function getPlayerHandCount(player: Player | PlayerView): number {
  return Array.isArray(player.hand) ? player.hand.length : (player.hand as HiddenHand).count;
}
