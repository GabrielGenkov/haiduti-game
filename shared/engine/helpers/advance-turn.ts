import { GameState } from '../../types/state';
import { getTotalZaptieBoyna } from '../../utils/field';
import { replenishFieldEffects } from './replenish-field';
import { applyEffects } from '../effects/apply-effect';
import { emitEvent } from '../event-collector';
import type { Effect } from '../effects/types';

export function advanceTurnEffects(state: GameState): Effect[] {
  const replenishEffs = replenishFieldEffects(state);
  const afterReplenish = applyEffects(state, replenishEffs);

  if (afterReplenish.phase === 'scoring') return replenishEffs;

  const nextIndex = (afterReplenish.currentPlayerIndex + 1) % afterReplenish.players.length;
  const nextPlayer = afterReplenish.players[nextIndex];

  const effects: Effect[] = [...replenishEffs];

  // Inline resetTurnState: vasil_levski resets zaptieTurnIgnored, dyado_ilyo resets dyadoIlyoActive
  const resets: Record<string, any> = {};
  if (nextPlayer.traits.includes('vasil_levski')) resets.zaptieTurnIgnored = false;
  if (nextPlayer.traits.includes('dyado_ilyo')) resets.dyadoIlyoActive = false;
  if (Object.keys(resets).length > 0) {
    effects.push({ type: 'UPDATE_PLAYER', playerIndex: nextIndex, updates: resets });
  }

  // Benkovski: +2 actions if Zaptie power >= 3
  const benkovskiBonus = nextPlayer.traits.includes('benkovski')
    ? getTotalZaptieBoyna(afterReplenish.field, afterReplenish.fieldFaceUp) >= 3 ? 2 : 0
    : 0;

  const baseActions = nextPlayer.stats.deynost + benkovskiBonus;

  emitEvent({ type: 'TURN_ENDED', nextPlayerIndex: nextIndex, benkovskiBonus });

  effects.push(
    {
      type: 'SET_TURN_FLOW',
      updates: {
        currentPlayerIndex: nextIndex,
        turnStep: 'recruiting',
        actionsRemaining: baseActions,
        actionsUsed: 0,
        canFormGroup: true,
        selectedCards: [],
        sofroniyAbilityUsed: false,
        hadzhiAbilityUsed: false,
        benkovskiApplied: benkovskiBonus > 0,
        popHaritonForming: false,
      },
    },
    { type: 'SET_ZAPTIE_TRIGGER', zaptieTrigger: undefined },
    { type: 'SET_PANAYOT_TRIGGER', panayotTrigger: undefined },
    {
      type: 'SET_MESSAGE',
      message: benkovskiBonus > 0
        ? `Ход на ${nextPlayer.name} — Бенковски: +2 действия (Заптие на масата ≥3)!`
        : `Ход на ${nextPlayer.name}`,
    },
  );

  return effects;
}

/**
 * Legacy wrapper — applies advanceTurnEffects and returns new state.
 */
export function advanceTurn(state: GameState): GameState {
  return applyEffects(state, advanceTurnEffects(state));
}
