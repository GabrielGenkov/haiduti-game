import { registerRule } from '../rule-registry';
import { advanceTurnEffects } from '../helpers/turn-helpers';
import { continueDefeatResolutionEffects } from '../helpers/defeat-helpers';
import { applyEffects } from '../../effects/apply-effect';
import { emitEvent } from '../../event-collector';
import type { Effect } from '../../effects/types';

registerRule({
  id: 'skip-actions',
  priority: 50,
  when: ({ state, action }) =>
    action.type === 'SKIP_ACTIONS' && state.turnStep === 'recruiting' && state.actionsUsed > 0,
  execute: ({ state }) => {
    emitEvent({ type: 'ACTIONS_SKIPPED', actionsUsed: state.actionsUsed });
    return [
      { type: 'SET_TURN_FLOW', updates: { turnStep: 'selection' as const, actionsRemaining: 0 } },
      { type: 'SET_MESSAGE', message: 'Подбор на революционери' },
    ];
  },
});

registerRule({
  id: 'end-turn',
  priority: 50,
  when: ({ state, action }) => {
    if (action.type !== 'END_TURN') return false;
    // During defeat with Pop Hariton forming
    if (state.turnStep === 'forming' && state.defeatContext) return true;
    return state.turnStep === 'forming' || state.turnStep === 'end';
  },
  execute: ({ state }) => {
    // During defeat with Pop Hariton forming, END_TURN continues defeat resolution
    if (state.turnStep === 'forming' && state.defeatContext) {
      const preEffects: Effect[] = [
        { type: 'SET_TURN_FLOW', updates: { turnStep: 'selection' as const, canFormGroup: false, selectedCards: [] as string[], popHaritonForming: false } },
      ];
      const intermediate = applyEffects(state, preEffects);
      return [...preEffects, ...continueDefeatResolutionEffects(intermediate)];
    }

    const effects: Effect[] = [];
    const player = state.players[state.currentPlayerIndex];

    // If hand is empty and revealed, hide the player
    if (player.hand.length === 0 && player.isRevealed) {
      effects.push({ type: 'UPDATE_PLAYER', playerIndex: state.currentPlayerIndex, updates: { isRevealed: false } });
    }

    effects.push({ type: 'SET_TURN_FLOW', updates: { turnStep: 'end' as const } });
    const intermediate = applyEffects(state, effects);
    effects.push(...advanceTurnEffects(intermediate));

    return effects;
  },
});
