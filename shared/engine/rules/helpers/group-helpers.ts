import { GameState, PendingGroupContext } from '../../../types/state';
import { Card, ContributionType, DeyetsTraitId } from '../../../types/card';
import { Player } from '../../../types/player';
import { canFormGroupByContribution, canFormGroupByColor, getGroupStrength, getGroupContributions } from '../../../utils/groups';
import { getUpgradeCost, getNextStatValue, getMaxReachableStatValue } from '../../../utils/stats';
import { getTraitGroupBonusFromTable, getTraitRaiseBonusFromTable } from '../../rule-tables';
import { replenishFieldEffects } from './field-helpers';
import { continueDefeatResolutionEffects } from './defeat-helpers';
import { applyEffects } from '../../effects/apply-effect';
import { emitEvent } from '../../event-collector';
import type { Effect } from '../../effects/types';

// ── Deyets card ID → trait ID mapping ──

const DEYETS_TRAIT_MAP: Record<string, DeyetsTraitId> = {
  dey_hristo: 'hristo_botev',
  dey_vasil: 'vasil_levski',
  dey_sofroniy: 'sofroniy',
  dey_rakowski: 'rakowski',
  dey_evlogi: 'evlogi',
  dey_petko_voy: 'petko_voy',
  dey_lyuben: 'lyuben',
  dey_rayna: 'rayna',
  dey_benkovski: 'benkovski',
  dey_pop: 'pop_hariton',
  dey_hadzhi: 'hadzhi',
  dey_dyado: 'dyado_ilyo',
  dey_filip: 'filip_totyu',
  dey_panayot: 'panayot',
  dey_stefan: 'stefan_karadzha',
};

export function getDeyetsTraitId(cardId: string): DeyetsTraitId | null {
  return DEYETS_TRAIT_MAP[cardId] ?? null;
}

// ── Validation ──

export interface GroupValidationResult {
  valid: boolean;
  hayduti: Card[];
  baseStrength: number;
  traitBonus: number;
  effectiveStrength: number;
  byContribution: ContributionType | null;
  byColor: string | null;
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
  const traitBonus = getTraitGroupBonusFromTable(player, hayduti, statType);
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
  const traitBonus = getTraitRaiseBonusFromTable(player, hayduti);
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

// ── Rakowski auto-keep logic ──

function resolveGroupDiscard(
  player: Player,
  hayduti: Card[],
  selectedCardIds: string[],
  targetCardId?: string
): { newHand: Card[]; discardedIds: string[] } {
  // Rakowski: unrevealed player keeps the strongest haydut
  if (player.traits.includes('rakowski') && !player.isRevealed) {
    const sortedHayduti = [...hayduti].sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));
    const keptCard = sortedHayduti[0];
    const discardedIds = hayduti.filter(c => c.id !== keptCard.id).map(c => c.id);
    let newHand = player.hand.filter(c => !discardedIds.includes(c.id));
    if (targetCardId) {
      newHand = newHand.filter(c => c.id !== targetCardId);
    }
    return { newHand, discardedIds };
  }

  // Default: discard all selected hayduti
  const discardedIds = hayduti.map(c => c.id);
  let newHand = player.hand.filter(c => {
    if (selectedCardIds.includes(c.id) && c.type === 'haydut') return false;
    if (targetCardId && c.id === targetCardId) return false;
    return true;
  });
  return { newHand, discardedIds };
}

// ── Finalize group (used by resolve-decision paths) ──

export function finalizeGroupEffects(
  state: GameState,
  context: PendingGroupContext,
  keptCardIds: string[] = []
): Effect[] {
  const player = state.players[state.currentPlayerIndex];
  const haydutSet = new Set(context.haydutCardIds);
  const keptSet = new Set(keptCardIds);

  // Cards to discard
  const discardedIds = player.hand
    .filter(c => haydutSet.has(c.id) && !keptSet.has(c.id))
    .map(c => c.id);

  const effects: Effect[] = [];

  // Clear decision and pending group
  effects.push(
    { type: 'SET_DECISION', decision: undefined },
    { type: 'SET_PENDING_GROUP', pendingGroup: undefined },
    { type: 'SET_TURN_FLOW', updates: { selectedCards: [] as string[] } },
  );

  // Discard hayduti
  if (discardedIds.length > 0) {
    effects.push({
      type: 'MOVE_CARDS',
      cardIds: discardedIds,
      from: { zone: 'hand', playerIndex: state.currentPlayerIndex },
      to: { zone: 'usedCards' },
    });
  }

  if (context.purpose === 'improve_stat' && context.statType && context.targetValue) {
    emitEvent({
      type: 'STAT_IMPROVED', statType: context.statType,
      previousValue: player.stats[context.statType], newValue: context.targetValue,
      groupCardIds: context.selectedCardIds, effectiveStrength: context.effectiveStrength,
      traitBonus: context.traitBonus,
    });
    effects.push({
      type: 'SET_STAT',
      playerIndex: state.currentPlayerIndex,
      stat: context.statType,
      value: context.targetValue,
    });
  } else if (context.purpose === 'raise_card' && context.targetCardId) {
    const target =
      player.hand.find(c => c.id === context.targetCardId) ??
      state.field.find(c => c !== null && c.id === context.targetCardId) ??
      state.sideField.find(c => c !== null && c.id === context.targetCardId);

    if (target) {
      const traitId = target.type === 'deyets' ? getDeyetsTraitId(target.id) : null;
      emitEvent({
        type: 'CARD_RAISED', targetCardId: target.id, targetCardName: target.name,
        targetCardType: target.type as 'voyvoda' | 'deyets',
        groupCardIds: context.selectedCardIds, effectiveStrength: context.effectiveStrength,
        traitAcquired: traitId ?? undefined,
      });

      // Move target card from hand/field to raised zone
      const isVoyvoda = target.type === 'voyvoda';
      const raisedZone = isVoyvoda ? 'raisedVoyvodas' : 'raisedDeytsi';
      const targetInHand = player.hand.some(c => c.id === context.targetCardId);
      const targetInField = state.field.some(c => c !== null && c.id === context.targetCardId);
      const targetInSideField = state.sideField.some(c => c !== null && c.id === context.targetCardId);

      if (targetInHand) {
        effects.push({
          type: 'MOVE_CARDS',
          cardIds: [context.targetCardId],
          from: { zone: 'hand', playerIndex: state.currentPlayerIndex },
          to: { zone: raisedZone, playerIndex: state.currentPlayerIndex },
        });
      } else if (targetInField) {
        effects.push({
          type: 'MOVE_CARDS',
          cardIds: [context.targetCardId],
          from: { zone: 'field' },
          to: { zone: raisedZone, playerIndex: state.currentPlayerIndex },
        });
      } else if (targetInSideField) {
        effects.push({
          type: 'MOVE_CARDS',
          cardIds: [context.targetCardId],
          from: { zone: 'sideField' },
          to: { zone: raisedZone, playerIndex: state.currentPlayerIndex },
        });
      }

      // Add trait
      if (traitId) {
        effects.push({ type: 'ADD_TRAITS', playerIndex: state.currentPlayerIndex, traitIds: [traitId] });
      }
    }
  }

  effects.push({ type: 'SET_TURN_FLOW', updates: { canFormGroup: false } });

  // Replenish field if a card was raised from field
  if (context.purpose === 'raise_card' && context.targetCardId) {
    const wasInField = state.field.some(c => c !== null && c.id === context.targetCardId);
    if (wasInField) {
      const intermediate = applyEffects(state, effects);
      effects.push(...replenishFieldEffects(intermediate));
    }
  }

  // Check if Lyuben was raised and needs stat choice
  if (
    context.purpose === 'raise_card' &&
    context.targetCardId === 'dey_lyuben'
  ) {
    const intermediate = applyEffects(state, effects);
    const updatedPlayer = intermediate.players[state.currentPlayerIndex];
    if (!updatedPlayer.lyubenStatChoice) {
      effects.push(
        {
          type: 'SET_DECISION',
          decision: {
            id: `lyuben-${Date.now()}`,
            kind: 'stat_choice',
            ownerPlayerIndex: state.currentPlayerIndex,
            prompt: 'Избери показателя за края на играта на Любен Каравелов.',
            selectableStats: ['nabor', 'deynost', 'boyna'],
            context: {},
          },
        },
        { type: 'PUSH_NOTIFICATION', text: 'Любен Каравелов: избери показател за крайния бонус.', kind: 'info' },
        { type: 'SET_MESSAGE', message: 'Любен Каравелов: избери показател за крайния бонус.' },
      );
      return effects;
    }
  }

  effects.push(
    {
      type: 'PUSH_NOTIFICATION',
      text: context.purpose === 'improve_stat'
        ? `Подобрен е показателят "${context.statType}" до ${context.targetValue}.`
        : 'Издигнат е водач.',
      kind: 'success',
    },
    {
      type: 'SET_MESSAGE',
      message: context.purpose === 'improve_stat'
        ? `Подобрен е показателят "${context.statType}" до ${context.targetValue}.`
        : 'Издигнат е водач.',
    },
  );

  // If in defeat context, continue resolution
  if (state.defeatContext) {
    const intermediate = applyEffects(state, effects);
    effects.push(...continueDefeatResolutionEffects(intermediate));
  }

  return effects;
}

// ── Direct form-group-improve (non-decision path) ──

export function formGroupImproveEffects(state: GameState, statType: ContributionType): Effect[] {
  const player = state.players[state.currentPlayerIndex];
  const validation = validateGroupForStat(state.selectedCards, player, statType);
  if (!validation.valid) {
    return [{ type: 'SET_MESSAGE', message: validation.errorMessage! }];
  }

  const targetValue = getMaxReachableStatValue(player.stats[statType], validation.effectiveStrength)!;
  emitEvent({
    type: 'STAT_IMPROVED', statType, previousValue: player.stats[statType],
    newValue: targetValue, groupCardIds: state.selectedCards,
    effectiveStrength: validation.effectiveStrength, traitBonus: validation.traitBonus,
  });

  const { discardedIds } = resolveGroupDiscard(player, validation.hayduti, state.selectedCards);
  const effects: Effect[] = [];

  // During defeat (Pop Hariton forming): discard ALL remaining cards and continue resolution
  if (state.defeatContext) {
    // Discard group cards
    if (discardedIds.length > 0) {
      effects.push({
        type: 'MOVE_CARDS',
        cardIds: discardedIds,
        from: { zone: 'hand', playerIndex: state.currentPlayerIndex },
        to: { zone: 'usedCards' },
      });
    }
    // Discard remaining hand
    const remainingHandIds = player.hand
      .filter(c => !discardedIds.includes(c.id))
      .map(c => c.id);
    if (remainingHandIds.length > 0) {
      effects.push({
        type: 'MOVE_CARDS',
        cardIds: remainingHandIds,
        from: { zone: 'hand', playerIndex: state.currentPlayerIndex },
        to: { zone: 'usedCards' },
      });
    }
    effects.push(
      { type: 'SET_STAT', playerIndex: state.currentPlayerIndex, stat: statType, value: targetValue },
      { type: 'SET_TURN_FLOW', updates: { selectedCards: [] as string[], popHaritonForming: false, canFormGroup: false } },
      { type: 'SET_MESSAGE', message: `Поп Харитон: подобрен "${statType}" до ${targetValue}. Комитетът е изчистен.` },
    );
    const intermediate = applyEffects(state, effects);
    effects.push(...continueDefeatResolutionEffects(intermediate));
    return effects;
  }

  // Normal path
  if (discardedIds.length > 0) {
    effects.push({
      type: 'MOVE_CARDS',
      cardIds: discardedIds,
      from: { zone: 'hand', playerIndex: state.currentPlayerIndex },
      to: { zone: 'usedCards' },
    });
  }
  effects.push(
    { type: 'SET_STAT', playerIndex: state.currentPlayerIndex, stat: statType, value: targetValue },
    { type: 'SET_TURN_FLOW', updates: { selectedCards: [] as string[], canFormGroup: false } },
  );

  const bonusMsg = validation.traitBonus > 0 ? ` (бонус +${validation.traitBonus} от Дейци)` : '';
  const rakowskiMsg = player.traits.includes('rakowski') && !player.isRevealed ? ' Раковски: запазена 1 карта.' : '';
  effects.push({ type: 'SET_MESSAGE', message: `Подобрен показател "${statType}" до ${targetValue}!${bonusMsg}${rakowskiMsg}` });

  return effects;
}

// ── Direct form-group-raise (non-decision path) ──

export function formGroupRaiseEffects(state: GameState, targetCardId: string): Effect[] {
  const player = state.players[state.currentPlayerIndex];

  const targetInField = state.field.find(c => c !== null && c.id === targetCardId);
  const targetInSideField = state.sideField.find(c => c !== null && c.id === targetCardId);
  const targetInHand = player.hand.find(c => c.id === targetCardId);
  const targetCard = targetInField || targetInSideField || targetInHand;

  if (!targetCard) return [];
  if (targetCard.type !== 'voyvoda' && targetCard.type !== 'deyets') return [];

  const validation = validateGroupForRaise(state.selectedCards, player, targetCard);
  if (!validation.valid) {
    return [{ type: 'SET_MESSAGE', message: validation.errorMessage! }];
  }

  const newTrait = targetCard.type === 'deyets' ? getDeyetsTraitId(targetCard.id) : null;
  emitEvent({
    type: 'CARD_RAISED', targetCardId: targetCard.id, targetCardName: targetCard.name,
    targetCardType: targetCard.type as 'voyvoda' | 'deyets', groupCardIds: state.selectedCards,
    effectiveStrength: validation.effectiveStrength, traitAcquired: newTrait ?? undefined,
  });

  const { discardedIds } = resolveGroupDiscard(player, validation.hayduti, state.selectedCards, targetCardId);
  const effects: Effect[] = [];

  // Discard hayduti
  if (discardedIds.length > 0) {
    effects.push({
      type: 'MOVE_CARDS',
      cardIds: discardedIds,
      from: { zone: 'hand', playerIndex: state.currentPlayerIndex },
      to: { zone: 'usedCards' },
    });
  }

  // Move target card to raised zone
  const isVoyvoda = targetCard.type === 'voyvoda';
  const raisedZone = isVoyvoda ? 'raisedVoyvodas' : 'raisedDeytsi';
  const wasInField = !!targetInField;
  const wasInSideField = !!targetInSideField;

  if (wasInField) {
    effects.push({
      type: 'MOVE_CARDS',
      cardIds: [targetCardId],
      from: { zone: 'field' },
      to: { zone: raisedZone, playerIndex: state.currentPlayerIndex },
    });
  } else if (wasInSideField) {
    effects.push({
      type: 'MOVE_CARDS',
      cardIds: [targetCardId],
      from: { zone: 'sideField' },
      to: { zone: raisedZone, playerIndex: state.currentPlayerIndex },
    });
  } else {
    effects.push({
      type: 'MOVE_CARDS',
      cardIds: [targetCardId],
      from: { zone: 'hand', playerIndex: state.currentPlayerIndex },
      to: { zone: raisedZone, playerIndex: state.currentPlayerIndex },
    });
  }

  // Add trait
  if (newTrait) {
    effects.push({ type: 'ADD_TRAITS', playerIndex: state.currentPlayerIndex, traitIds: [newTrait] });
  }

  effects.push(
    { type: 'SET_TURN_FLOW', updates: { selectedCards: [] as string[], canFormGroup: false } },
  );

  // Replenish field if taken from field
  if (wasInField) {
    const intermediate = applyEffects(state, effects);
    effects.push(...replenishFieldEffects(intermediate));
  }

  const traitMsg = newTrait ? ` Придобита черта: ${targetCard.name}!` : '';
  const rakowskiMsg = player.traits.includes('rakowski') && !player.isRevealed ? ' Раковски: запазена 1 карта.' : '';
  effects.push({ type: 'SET_MESSAGE', message: `Издигнат "${targetCard.name}"!${traitMsg}${rakowskiMsg}` });

  // If Lyuben was just raised, prompt for stat choice
  if (targetCardId === 'dey_lyuben') {
    const intermediate = applyEffects(state, effects);
    const updatedPlayer = intermediate.players[state.currentPlayerIndex];
    if (!updatedPlayer.lyubenStatChoice) {
      effects.push(
        {
          type: 'SET_DECISION',
          decision: {
            id: `lyuben-${Date.now()}`,
            kind: 'stat_choice',
            ownerPlayerIndex: state.currentPlayerIndex,
            prompt: 'Избери показателя за края на играта на Любен Каравелов.',
            selectableStats: ['nabor', 'deynost', 'boyna'],
            context: {},
          },
        },
        { type: 'SET_MESSAGE', message: 'Любен Каравелов: избери показател за крайния бонус.' },
      );
    }
  }

  return effects;
}

// ── Pop Hariton forming ──

export function popHaritonFormEffects(state: GameState, statType: ContributionType): Effect[] {
  const player = state.players[state.currentPlayerIndex];
  const selectedHand = player.hand.filter(c => state.selectedCards.includes(c.id));
  const hayduti = selectedHand.filter(c => c.type === 'haydut');
  if (hayduti.length === 0) return [];

  const baseStrength = getGroupStrength(hayduti);
  const traitBonus = getTraitGroupBonusFromTable(player, hayduti, statType);
  const effectiveStrength = baseStrength + traitBonus;
  const currentStatValue = player.stats[statType];
  const targetValue = getMaxReachableStatValue(currentStatValue, effectiveStrength);

  if (!targetValue) {
    return [{ type: 'SET_MESSAGE', message: 'Недостатъчна сила за подобрение.' }];
  }

  const byContribution = canFormGroupByContribution(hayduti);
  const byColor = canFormGroupByColor(hayduti);
  if (!byContribution && !byColor) {
    return [{ type: 'SET_MESSAGE', message: 'Невалидна група!' }];
  }

  emitEvent({ type: 'POP_HARITON_GROUP_FORMED', statType, newValue: targetValue, groupCardIds: state.selectedCards });

  const effects: Effect[] = [];

  // Discard entire hand
  if (player.hand.length > 0) {
    effects.push({
      type: 'MOVE_CARDS',
      cardIds: player.hand.map(c => c.id),
      from: { zone: 'hand', playerIndex: state.currentPlayerIndex },
      to: { zone: 'usedCards' },
    });
  }

  effects.push(
    { type: 'SET_STAT', playerIndex: state.currentPlayerIndex, stat: statType, value: targetValue },
    { type: 'SET_TURN_FLOW', updates: { selectedCards: [] as string[], popHaritonForming: false, turnStep: 'selection' as const, canFormGroup: false } },
    { type: 'SET_MESSAGE', message: `Поп Харитон: подобрен "${statType}" до ${targetValue}. Комитетът е изчистен.` },
  );

  const intermediate = applyEffects(state, effects);
  effects.push(...continueDefeatResolutionEffects(intermediate));

  return effects;
}

export function popHaritonSkipEffects(state: GameState): Effect[] {
  emitEvent({ type: 'POP_HARITON_SKIPPED' });
  const effects: Effect[] = [
    { type: 'SET_TURN_FLOW', updates: { turnStep: 'selection' as const, canFormGroup: false, selectedCards: [] as string[], popHaritonForming: false } },
  ];
  const intermediate = applyEffects(state, effects);
  effects.push(...continueDefeatResolutionEffects(intermediate));
  return effects;
}
