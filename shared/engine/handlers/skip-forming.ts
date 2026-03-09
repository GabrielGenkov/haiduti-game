import { registerAction } from '../action-registry';

registerAction('SKIP_FORMING', (state) => {
  return {
    ...state,
    turnStep: 'end',
    selectedCards: [],
    message: 'Край на хода',
  };
});
