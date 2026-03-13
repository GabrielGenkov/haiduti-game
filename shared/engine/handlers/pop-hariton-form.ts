import { registerAction } from '../action-registry';
import { ContributionType } from '../../types/card';
import { getGroupStrength } from '../../utils/groups';
import { canFormGroupByContribution, canFormGroupByColor } from '../../utils/groups';
import { getMaxReachableStatValue } from '../../utils/stats';
import { getTraitGroupBonus } from '../../traits/trait-registry';
import { continueDefeatResolution } from '../helpers/defeat-resolution';

registerAction('POP_HARITON_FORM_GROUP', (state, action) => {
  if (!state.popHaritonForming) return state;
  const statType = (action as unknown as { statType: ContributionType }).statType;
  const player = state.players[state.currentPlayerIndex];
  const selectedHand = player.hand.filter(c => state.selectedCards.includes(c.id));
  const hayduti = selectedHand.filter(c => c.type === 'haydut');
  if (hayduti.length === 0) return state;

  const baseStrength = getGroupStrength(hayduti);
  const traitBonus = getTraitGroupBonus(player, hayduti, statType);
  const effectiveStrength = baseStrength + traitBonus;
  const currentStatValue = player.stats[statType];
  const targetValue = getMaxReachableStatValue(currentStatValue, effectiveStrength);

  if (!targetValue) {
    return { ...state, message: `Недостатъчна сила за подобрение.` };
  }

  const byContribution = canFormGroupByContribution(hayduti);
  const byColor = canFormGroupByColor(hayduti);
  if (!byContribution && !byColor) {
    return { ...state, message: 'Невалидна група!' };
  }

  const newStats = { ...player.stats, [statType]: targetValue };
  const players = state.players.map((p, i) =>
    i === state.currentPlayerIndex
      ? { ...p, stats: newStats, hand: [] }
      : p
  );

  return continueDefeatResolution({
    ...state,
    players,
    selectedCards: [],
    popHaritonForming: false,
    turnStep: 'selection',
    canFormGroup: false,
    message: `Поп Харитон: подобрен "${statType}" до ${targetValue}. Комитетът е изчистен.`,
  });
});

registerAction('POP_HARITON_SKIP', (state) => {
  if (!state.popHaritonForming) return state;
  return continueDefeatResolution({
    ...state,
    turnStep: 'selection',
    canFormGroup: false,
    selectedCards: [],
    popHaritonForming: false,
  });
});
