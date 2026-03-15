import { registerRule } from '../rule-registry';
import { ContributionType } from '../../../types/card';
import { emitEvent } from '../../event-collector';

registerRule({
  id: 'dismiss-message',
  priority: 80,
  when: ({ action }) => action.type === 'DISMISS_MESSAGE',
  execute: () => [{ type: 'SET_MESSAGE', message: '' }],
});

registerRule({
  id: 'lyuben-choose',
  priority: 70,
  when: ({ state, action }) => {
    if (action.type !== 'LYUBEN_CHOOSE_STAT') return false;
    const player = state.players[state.currentPlayerIndex];
    return player.traits.includes('lyuben');
  },
  execute: ({ state, action }) => {
    const { statType } = action as { type: 'LYUBEN_CHOOSE_STAT'; statType: ContributionType };
    emitEvent({ type: 'LYUBEN_STAT_CHOSEN', statType });
    return [
      { type: 'UPDATE_PLAYER', playerIndex: state.currentPlayerIndex, updates: { lyubenStatChoice: statType } },
      { type: 'SET_MESSAGE', message: `Любен Каравелов: в края на играта ще се повиши показател "${statType}".` },
    ];
  },
});
