import { registerAction } from '../action-registry';
import { advanceTurn } from '../helpers/advance-turn';

registerAction('END_TURN', (state) => {
  if (state.turnStep !== 'forming' && state.turnStep !== 'end') return state;
  const player = state.players[state.currentPlayerIndex];
  let players = state.players;
  if (player.hand.length === 0 && player.isRevealed) {
    players = players.map((p, i) =>
      i === state.currentPlayerIndex ? { ...p, isRevealed: false } : p
    );
  }
  return advanceTurn({ ...state, players, turnStep: 'end' });
});
