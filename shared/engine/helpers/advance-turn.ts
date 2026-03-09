import { GameState } from '../../types/state';
import { getActiveTraits } from '../../traits/trait-registry';
import { getTotalZaptieBoyna } from '../../utils/field';
import { replenishField } from './replenish-field';

export function advanceTurn(state: GameState): GameState {
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  const nextPlayer = state.players[nextIndex];

  let newState = replenishField(state);

  if (newState.phase === 'scoring') return newState;

  // Reset per-turn trait state for the next player
  const players = newState.players.map((p, i) => {
    if (i !== nextIndex) return p;
    let updated = { ...p };
    for (const trait of getActiveTraits(p)) {
      if (trait.resetTurnState) {
        Object.assign(updated, trait.resetTurnState(p));
      }
    }
    return updated;
  });

  // Benkovski: +2 actions if Zaptie power >= 3
  const benkovskiBonus = players[nextIndex].traits.includes('benkovski')
    ? getTotalZaptieBoyna(newState.field, newState.fieldFaceUp) >= 3 ? 2 : 0
    : 0;

  const baseActions = nextPlayer.stats.deynost + benkovskiBonus;

  return {
    ...newState,
    players,
    currentPlayerIndex: nextIndex,
    turnStep: 'recruiting',
    actionsRemaining: baseActions,
    actionsUsed: 0,
    canFormGroup: true,
    selectedCards: [],
    message: benkovskiBonus > 0
      ? `Ход на ${nextPlayer.name} — Бенковски: +2 действия (Заптие на масата ≥3)!`
      : `Ход на ${nextPlayer.name}`,
    zaptieTrigger: undefined,
    sofroniyAbilityUsed: false,
    hadzhiAbilityUsed: false,
    benkovskiApplied: benkovskiBonus > 0,
    panayotTrigger: undefined,
    popHaritonForming: false,
  };
}
