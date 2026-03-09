import { Card, ContributionType, CardColor } from '../../types/card';
import { Player } from '../../types/player';
import { canFormGroupByContribution, canFormGroupByColor, getGroupStrength, getGroupContributions } from '../../utils/groups';
import { getUpgradeCost, getNextStatValue, getMaxReachableStatValue } from '../../utils/stats';
import { getTraitGroupBonus, getTraitRaiseBonus, applyGroupFormedTraits } from '../../traits/trait-registry';

export interface GroupValidationResult {
  valid: boolean;
  hayduti: Card[];
  baseStrength: number;
  traitBonus: number;
  effectiveStrength: number;
  byContribution: ContributionType | null;
  byColor: CardColor | null;
  errorMessage?: string;
}

export function validateGroupForStat(
  selectedCards: string[],
  player: Player,
  statType: ContributionType
): GroupValidationResult {
  const selectedHand = player.hand.filter(c => selectedCards.includes(c.id));
  const hayduti = selectedHand.filter(c => c.type === 'haydut');

  if (hayduti.length === 0) {
    return { valid: false, hayduti: [], baseStrength: 0, traitBonus: 0, effectiveStrength: 0, byContribution: null, byColor: null, errorMessage: 'Няма избрани хайдути.' };
  }

  const baseStrength = getGroupStrength(hayduti);
  const traitBonus = getTraitGroupBonus(player, hayduti, statType);
  const effectiveStrength = baseStrength + traitBonus;

  const currentStatValue = player.stats[statType];
  if (getNextStatValue(currentStatValue) === null) {
    return { valid: false, hayduti, baseStrength, traitBonus, effectiveStrength, byContribution: null, byColor: null, errorMessage: 'Показателят е вече на максимум!' };
  }

  const targetValue = getMaxReachableStatValue(currentStatValue, effectiveStrength);
  if (!targetValue) {
    const minCost = getUpgradeCost(getNextStatValue(currentStatValue)!);
    return {
      valid: false, hayduti, baseStrength, traitBonus, effectiveStrength,
      byContribution: null, byColor: null,
      errorMessage: `Недостатъчна сила! Нужна: ${minCost}, имаш: ${effectiveStrength}${traitBonus > 0 ? ` (базова ${baseStrength} + бонус ${traitBonus})` : ''}`,
    };
  }

  const byContribution = canFormGroupByContribution(hayduti);
  const byColor = canFormGroupByColor(hayduti);

  if (!byContribution && !byColor) {
    return { valid: false, hayduti, baseStrength, traitBonus, effectiveStrength, byContribution, byColor, errorMessage: 'Невалидна група! Хайдутите трябва да са с еднакъв принос или цвят.' };
  }

  if (!byContribution && byColor) {
    const groupContributions = getGroupContributions(hayduti);
    if (!groupContributions.includes(statType)) {
      return { valid: false, hayduti, baseStrength, traitBonus, effectiveStrength, byContribution, byColor, errorMessage: 'Избраният показател не отговаря на принос на нито една карта в групата.' };
    }
  }

  return { valid: true, hayduti, baseStrength, traitBonus, effectiveStrength, byContribution, byColor };
}

export function validateGroupForRaise(
  selectedCards: string[],
  player: Player,
  targetCard: Card
): GroupValidationResult {
  const selectedHand = player.hand.filter(c => selectedCards.includes(c.id));
  const hayduti = selectedHand.filter(c => c.type === 'haydut');

  if (hayduti.length === 0) {
    return { valid: false, hayduti: [], baseStrength: 0, traitBonus: 0, effectiveStrength: 0, byContribution: null, byColor: null, errorMessage: 'Няма избрани хайдути.' };
  }

  const baseStrength = getGroupStrength(hayduti);
  const traitBonus = getTraitRaiseBonus(player, hayduti);
  const effectiveStrength = baseStrength + traitBonus;

  const cost = targetCard.cost ?? 999;
  if (effectiveStrength < cost) {
    return {
      valid: false, hayduti, baseStrength, traitBonus, effectiveStrength,
      byContribution: null, byColor: null,
      errorMessage: `Недостатъчна сила! Нужна: ${cost}, имаш: ${effectiveStrength}${traitBonus > 0 ? ` (базова ${baseStrength} + бонус ${traitBonus})` : ''}`,
    };
  }

  const byContribution = canFormGroupByContribution(hayduti);
  const byColor = canFormGroupByColor(hayduti);

  if (!byContribution && !byColor) {
    return { valid: false, hayduti, baseStrength, traitBonus, effectiveStrength, byContribution, byColor, errorMessage: 'Невалидна група!' };
  }

  return { valid: true, hayduti, baseStrength, traitBonus, effectiveStrength, byContribution, byColor };
}

/** Apply Rakowski-style trait effects on group formation, or use default discard logic */
export function resolveGroupDiscard(
  player: Player,
  hayduti: Card[],
  selectedCardIds: string[],
  targetCardId?: string
): { newHand: Card[]; discarded: Card[] } {
  const traitResult = applyGroupFormedTraits(player, hayduti, selectedCardIds);
  if (traitResult) {
    // If raising a card from hand, also remove it
    if (targetCardId) {
      return {
        newHand: traitResult.newHand.filter(c => c.id !== targetCardId),
        discarded: traitResult.discarded,
      };
    }
    return traitResult;
  }

  // Default: remove all selected hayduti (and target card if raising from hand)
  const newHand = player.hand.filter(c => {
    if (selectedCardIds.includes(c.id) && c.type === 'haydut') return false;
    if (targetCardId && c.id === targetCardId) return false;
    return true;
  });
  const discarded = player.hand.filter(c => selectedCardIds.includes(c.id) && c.type === 'haydut');
  return { newHand, discarded };
}
