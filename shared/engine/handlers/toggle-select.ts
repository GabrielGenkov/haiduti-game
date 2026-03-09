import { registerAction } from '../action-registry';

registerAction('TOGGLE_SELECT_CARD', (state, action) => {
  if (state.turnStep !== 'forming') return state;
  const { cardId } = action as { type: 'TOGGLE_SELECT_CARD'; cardId: string };
  const isSelected = state.selectedCards.includes(cardId);
  const selectedCards = isSelected
    ? state.selectedCards.filter(id => id !== cardId)
    : [...state.selectedCards, cardId];
  return { ...state, selectedCards };
});
