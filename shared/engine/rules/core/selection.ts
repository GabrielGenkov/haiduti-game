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
  id: 'confirm-discards',
  priority: 80,
  when: ({ state, action }) => action.type === 'CONFIRM_DISCARDS' && state.turnStep === 'selection',
  execute: ({ state, action }) => {
    const { cardIds } = action as { type: 'CONFIRM_DISCARDS'; cardIds: string[] };
    const player = state.players[state.currentPlayerIndex];

    // Validate all cardIds are in hand
    const validIds = cardIds.filter(id => player.hand.some(c => c.id === id));

    // Validate remaining hand ≤ effective nabor
    const effectiveNabor = player.stats.nabor + (player.dyadoIlyoActive ? 2 : 0);
    const remainingCount = player.hand.length - validIds.length;
    if (remainingCount > effectiveNabor) {
      return [{ type: 'SET_MESSAGE', message: `Трябва да изчистиш поне ${player.hand.length - effectiveNabor} карти.` }];
    }

    // Emit events for each discarded card
    for (const id of validIds) {
      const card = player.hand.find(c => c.id === id);
      if (card) emitEvent({ type: 'CARD_DISCARDED', cardId: card.id, cardName: card.name });
    }

    const effects: Effect[] = [];

    if (validIds.length > 0) {
      effects.push({
        type: 'MOVE_CARDS',
        cardIds: validIds,
        from: { zone: 'hand', playerIndex: state.currentPlayerIndex },
        to: { zone: 'usedCards' },
      });
    }

    // Auto-transition: if canFormGroup, go to forming; else advance turn
    if (state.canFormGroup) {
      effects.push({ type: 'SET_TURN_FLOW', updates: { turnStep: 'forming' as const } });
      effects.push({ type: 'SET_MESSAGE', message: 'Изчистени карти. Сформирай група или пропусни.' });
    } else {
      const preEffects: Effect[] = [
        ...effects,
        { type: 'SET_TURN_FLOW', updates: { turnStep: 'end' as const } },
      ];
      const intermediate = applyEffects(state, preEffects);
      effects.push({ type: 'SET_TURN_FLOW', updates: { turnStep: 'end' as const } });
      effects.push(...advanceTurnEffects(intermediate));
    }

    return effects;
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
