import { registerRule } from '../rule-registry';
import { ContributionType } from '../../../types/card';
import { emitEvent } from '../../event-collector';
import { formGroupImproveEffects, formGroupRaiseEffects } from '../helpers/group-helpers';

registerRule({
  id: 'toggle-select',
  priority: 80,
  when: ({ state, action }) => action.type === 'TOGGLE_SELECT_CARD' && state.turnStep === 'forming',
  execute: ({ state, action }) => {
    const { cardId } = action as { type: 'TOGGLE_SELECT_CARD'; cardId: string };
    const isSelected = state.selectedCards.includes(cardId);
    const selectedCards = isSelected
      ? state.selectedCards.filter(id => id !== cardId)
      : [...state.selectedCards, cardId];
    return [{ type: 'SET_TURN_FLOW', updates: { selectedCards } }];
  },
});

registerRule({
  id: 'skip-forming',
  priority: 50,
  when: ({ action }) => action.type === 'SKIP_FORMING',
  execute: () => {
    emitEvent({ type: 'FORMING_SKIPPED' });
    return [
      { type: 'SET_TURN_FLOW', updates: { turnStep: 'end' as const, selectedCards: [] } },
      { type: 'SET_MESSAGE', message: 'Край на хода' },
    ];
  },
});

registerRule({
  id: 'form-group-improve',
  priority: 40,
  when: ({ state, action }) => action.type === 'FORM_GROUP_IMPROVE_STAT' && state.turnStep === 'forming',
  execute: ({ state, action }) => {
    const { statType } = action as { type: 'FORM_GROUP_IMPROVE_STAT'; statType: ContributionType };
    return formGroupImproveEffects(state, statType);
  },
});

registerRule({
  id: 'form-group-raise',
  priority: 40,
  when: ({ state, action }) => action.type === 'FORM_GROUP_RAISE_CARD' && state.turnStep === 'forming',
  execute: ({ state, action }) => {
    const { targetCardId } = action as { type: 'FORM_GROUP_RAISE_CARD'; targetCardId: string };
    return formGroupRaiseEffects(state, targetCardId);
  },
});
