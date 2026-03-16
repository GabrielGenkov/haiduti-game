import { GameState } from '../types/state';
import type { PlayerView, PlayerViewState, MaskedFieldCard, MaskedPendingDecision } from '../types/player-view';

/**
 * Build a masked view of the game state for a specific player.
 * Hides: other players' hands, deck contents, face-down cards, seed, internal contexts.
 */
export function buildPlayerView(state: GameState, viewerIndex: number): PlayerViewState {
  // Mask players
  const players: PlayerView[] = state.players.map((player, i) => ({
    id: player.id,
    name: player.name,
    stats: player.stats,
    isRevealed: player.isRevealed,
    hand: i === viewerIndex ? player.hand : { count: player.hand.length },
    raisedVoyvodas: player.raisedVoyvodas,
    raisedDeytsi: player.raisedDeytsi,
    traits: player.traits,
    lyubenStatChoice: player.lyubenStatChoice,
    // zaptieTurnIgnored, dyadoIlyoActive: intentionally stripped
  }));

  // Mask field cards: null slot → 'empty', face-down card → null, face-up → card
  const field: MaskedFieldCard[] = state.field.map((card, i) => {
    if (card === null) return 'empty';
    return state.fieldFaceUp[i] ? card : null;
  });
  const sideField: MaskedFieldCard[] = state.sideField.map((card, i) => {
    if (card === null) return 'empty';
    return state.sideFieldFaceUp[i] ? card : null;
  });

  // Mask pending decision for non-owners
  let pendingDecision: PlayerViewState['pendingDecision'];
  if (state.pendingDecision) {
    if (state.pendingDecision.ownerPlayerIndex === viewerIndex) {
      pendingDecision = state.pendingDecision;
    } else {
      const masked: MaskedPendingDecision = {
        id: state.pendingDecision.id,
        kind: state.pendingDecision.kind,
        ownerPlayerIndex: state.pendingDecision.ownerPlayerIndex,
        prompt: state.pendingDecision.prompt,
      };
      pendingDecision = masked;
    }
  }

  return {
    phase: state.phase,
    ruleset: state.ruleset,
    revision: state.revision,

    players,
    currentPlayerIndex: state.currentPlayerIndex,

    deckCount: state.deck.length,
    field,
    fieldFaceUp: state.fieldFaceUp,
    sideField,
    sideFieldFaceUp: state.sideFieldFaceUp,
    usedCardsCount: state.usedCards.length,

    deckRotations: state.deckRotations,
    maxRotations: state.maxRotations,
    gameLength: state.gameLength,
    turnStep: state.turnStep,
    actionsRemaining: state.actionsRemaining,
    actionsUsed: state.actionsUsed,
    canFormGroup: state.canFormGroup,
    selectedCards: state.selectedCards,
    message: state.message,
    notifications: state.notifications,

    pendingDecision,
    zaptieTrigger: state.zaptieTrigger,
    panayotTrigger: state.panayotTrigger,

    popHaritonForming: state.popHaritonForming,
    sofroniyAbilityUsed: state.sofroniyAbilityUsed,
    hadzhiAbilityUsed: state.hadzhiAbilityUsed,
    benkovskiApplied: state.benkovskiApplied,
    deckExhausted: state.deckExhausted,
    gameEndsAfterTurn: state.gameEndsAfterTurn,
  };
}
