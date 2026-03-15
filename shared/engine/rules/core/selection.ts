import { registerRule } from '../rule-registry';
import { advanceTurnEffects } from '../helpers/turn-helpers';
import { applyEffects } from '../../effects/apply-effect';
import { emitEvent } from '../../event-collector';
import type { Effect } from '../../effects/types';

registerRule({
  id: 'discard-card',
  priority: 80,
  when: ({ state, action }) => action.type === 'DISCARD_CARD' && state.turnStep === 'selection',
  execute: ({ state, action }) => {
    const { cardId } = action as { type: 'DISCARD_CARD'; cardId: string };
    const player = state.players[state.currentPlayerIndex];
    const discarded = player.hand.find(c => c.id === cardId);
    if (!discarded) return [];
    emitEvent({ type: 'CARD_DISCARDED', cardId: discarded.id, cardName: discarded.name });
    return [
      { type: 'MOVE_CARDS', cardIds: [cardId], from: { zone: 'hand', playerIndex: state.currentPlayerIndex }, to: { zone: 'usedCards' } },
      { type: 'SET_MESSAGE', message: `Изчистена карта: "${discarded.name}"` },
    ];
  },
});

registerRule({
  id: 'proceed-to-forming',
  priority: 50,
  when: ({ state, action }) => action.type === 'PROCEED_TO_FORMING' && state.turnStep === 'selection',
  execute: ({ state }) => {
    if (!state.canFormGroup) {
      const preEffects: Effect[] = [
        { type: 'SET_TURN_FLOW', updates: { turnStep: 'end' as const } },
      ];
      const intermediate = applyEffects(state, preEffects);
      return [...preEffects, ...advanceTurnEffects(intermediate)];
    }
    emitEvent({ type: 'FORMING_STARTED' });
    return [
      { type: 'SET_TURN_FLOW', updates: { turnStep: 'forming' as const } },
      { type: 'SET_MESSAGE', message: 'Сформиране на групи' },
    ];
  },
});
