import { registerAction } from '../action-registry';

registerAction('DISMISS_MESSAGE', (state) => {
  return { ...state, message: '' };
});
