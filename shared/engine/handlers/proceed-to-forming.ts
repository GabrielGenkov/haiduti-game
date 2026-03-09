import { registerAction } from '../action-registry';
import { advanceTurn } from '../helpers/advance-turn';

registerAction('PROCEED_TO_FORMING', (state) => {
  if (state.turnStep !== 'selection') return state;
  if (!state.canFormGroup) {
    return advanceTurn({ ...state, turnStep: 'end' });
  }
  return {
    ...state,
    turnStep: 'forming',
    message: 'Сформиране на групи',
  };
});
