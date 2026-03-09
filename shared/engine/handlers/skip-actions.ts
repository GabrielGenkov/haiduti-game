import { registerAction } from '../action-registry';

registerAction('SKIP_ACTIONS', (state) => {
  if (state.turnStep !== 'recruiting') return state;
  if (state.actionsUsed === 0) return state;
  return {
    ...state,
    turnStep: 'selection',
    actionsRemaining: 0,
    message: 'Подбор на революционери',
  };
});
