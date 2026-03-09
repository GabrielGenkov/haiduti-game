import { registerAction } from '../action-registry';
import { ContributionType } from '../../types/card';
import { getMaxReachableStatValue } from '../../utils/stats';
import { validateGroupForStat, resolveGroupDiscard } from '../helpers/group-validation';

registerAction('FORM_GROUP_IMPROVE_STAT', (state, action) => {
  if (state.turnStep !== 'forming') return state;
  const { statType } = action as { type: 'FORM_GROUP_IMPROVE_STAT'; statType: ContributionType };
  const player = state.players[state.currentPlayerIndex];

  const validation = validateGroupForStat(state.selectedCards, player, statType);
  if (!validation.valid) {
    return { ...state, message: validation.errorMessage! };
  }

  const targetValue = getMaxReachableStatValue(player.stats[statType], validation.effectiveStrength)!;
  const { newHand, discarded } = resolveGroupDiscard(player, validation.hayduti, state.selectedCards);

  const newStats = { ...player.stats, [statType]: targetValue };
  const players = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, stats: newStats, hand: newHand } : p
  );

  const bonusMsg = validation.traitBonus > 0 ? ` (бонус +${validation.traitBonus} от Дейци)` : '';
  const rakowskiMsg = player.traits.includes('rakowski') && !player.isRevealed ? ' Раковски: запазена 1 карта.' : '';

  return {
    ...state,
    players,
    usedCards: [...state.usedCards, ...discarded],
    selectedCards: [],
    canFormGroup: false,
    message: `Подобрен показател "${statType}" до ${targetValue}!${bonusMsg}${rakowskiMsg}`,
  };
});
