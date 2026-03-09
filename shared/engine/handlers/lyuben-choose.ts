import { registerAction } from '../action-registry';
import { ContributionType } from '../../types/card';

registerAction('LYUBEN_CHOOSE_STAT', (state, action) => {
  const player = state.players[state.currentPlayerIndex];
  if (!player.traits.includes('lyuben')) return state;
  const { statType } = action as { type: 'LYUBEN_CHOOSE_STAT'; statType: ContributionType };
  const players = state.players.map((p, i) =>
    i === state.currentPlayerIndex
      ? { ...p, lyubenStatChoice: statType }
      : p
  );
  return {
    ...state,
    players,
    message: `Любен Каравелов: в края на играта ще се повиши показател "${statType}".`,
  };
});
