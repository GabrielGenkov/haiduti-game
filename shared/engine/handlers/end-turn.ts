import { registerAction } from '../action-registry';
import { advanceTurn } from '../helpers/advance-turn';
import { continueDefeatResolution } from '../helpers/defeat-resolution';

registerAction('END_TURN', (state) => {
  // During defeat with Pop Hariton forming, END_TURN continues defeat resolution
  if (state.turnStep === 'forming' && state.defeatContext) {
    return continueDefeatResolution({
      ...state,
      turnStep: 'selection',
      canFormGroup: false,
      selectedCards: [],
      popHaritonForming: false,
    });
  }

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
