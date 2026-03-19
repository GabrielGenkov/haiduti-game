import { registerRule } from '../rule-registry';
import { GameAction } from '../../../types/action';
import { getTraitGroupBonusFromTable } from '../../rule-tables';
import { getGroupStrength } from '../../../utils/groups';
import { replenishFieldEffects } from '../helpers/field-helpers';
import { lyubenEndOfGameEffects } from '../../helpers/replenish-field';
import { continueDefeatResolutionEffects } from '../helpers/defeat-helpers';
import { finalizeGroupEffects, getDeyetsTraitId } from '../helpers/group-helpers';
import { buildZaptieEncounterEffects } from '../helpers/zaptie-helpers';
import { applyEffects } from '../../effects/apply-effect';
import { emitEvent } from '../../event-collector';
import type { Effect } from '../../effects/types';

// All resolve-decision rules share the same action type but dispatch on decision.kind + purpose

registerRule({
  id: 'resolve-trait-choice',
  priority: 30,
  when: ({ state, action }) =>
    action.type === 'RESOLVE_DECISION' && state.pendingDecision?.kind === 'trait_choice',
  execute: ({ state, action }) => {
    const { decisionId, traitId } = action as Extract<GameAction, { type: 'RESOLVE_DECISION' }>;
    const decision = state.pendingDecision!;
    if (decision.id !== decisionId) return [];
    if (!traitId) return [];

    emitEvent({ type: 'DECISION_RESOLVED', decisionKind: decision.kind, decisionId: decision.id });

    const zaptie =
      state.field.find(card => card !== null && card.id === decision.context?.encounteredCardId) ??
      state.sideField.find(card => card !== null && card.id === decision.context?.encounteredCardId);
    if (!zaptie || zaptie.type !== 'zaptie') return [];

    // Clear decision, then apply the chosen trait's zaptie interception effects
    const clearEffects: Effect[] = [{ type: 'SET_DECISION', decision: undefined }];
    const intermediate = applyEffects(state, clearEffects);

    // Build effects for the chosen trait
    // The trait intercept logic is inlined in zaptie-helpers via buildZaptieEncounterEffects,
    // but for trait choice resolution, we need to simulate what the specific trait would do.
    // The original code called getTrait(traitId).onZaptieEncounter(...).
    // We inline the two possible traits here: vasil_levski and dyado_ilyo.
    let interceptEffects: Effect[] = [];

    if (traitId === 'vasil_levski') {
      const player = intermediate.players[intermediate.currentPlayerIndex];
      if (!player.zaptieTurnIgnored) {
        interceptEffects = [
          { type: 'UPDATE_PLAYER', playerIndex: intermediate.currentPlayerIndex, updates: { zaptieTurnIgnored: true } },
          { type: 'SET_TURN_FLOW', updates: { turnStep: intermediate.actionsRemaining > 0 ? 'recruiting' as const : 'selection' as const } },
          { type: 'SET_MESSAGE', message: `Васил Левски: Заптието (сила ${zaptie.strength}) е игнорирано! Продължаваш хода.` },
        ];
      }
    } else if (traitId === 'dyado_ilyo') {
      const player = intermediate.players[intermediate.currentPlayerIndex];
      if (!player.isRevealed) {
        interceptEffects = [
          { type: 'MOVE_CARDS', cardIds: [zaptie.id], from: { zone: 'field' }, to: { zone: 'usedCards' } },
          { type: 'UPDATE_PLAYER', playerIndex: intermediate.currentPlayerIndex, updates: { isRevealed: true, dyadoIlyoActive: true } },
          { type: 'SET_TURN_FLOW', updates: { actionsRemaining: 0, canFormGroup: false } },
          { type: 'SET_ZAPTIE_TRIGGER', zaptieTrigger: { wasSecret: true, isDefeated: false, zaptieCards: [zaptie], dyadoIlyoTriggered: true } },
          { type: 'SET_MESSAGE', message: `Дядо Ильо: Заптието е отстранено! Комитетът е разкрит, но можеш да задържиш 2 карти повече.` },
        ];
      }
    }

    if (interceptEffects.length === 0) return clearEffects;

    const afterIntercept = applyEffects(intermediate, interceptEffects);
    return [...clearEffects, ...interceptEffects, ...replenishFieldEffects(afterIntercept)];
  },
});

registerRule({
  id: 'resolve-rakowski-keep',
  priority: 30,
  when: ({ state, action }) =>
    action.type === 'RESOLVE_DECISION' &&
    state.pendingDecision?.kind === 'card_choice' &&
    (state.pendingDecision as any).purpose === 'rakowski_keep',
  execute: ({ state, action }) => {
    const { decisionId, cardIds } = action as Extract<GameAction, { type: 'RESOLVE_DECISION' }>;
    const decision = state.pendingDecision!;
    if (decision.id !== decisionId || !state.pendingGroup) return [];

    emitEvent({ type: 'DECISION_RESOLVED', decisionKind: decision.kind, decisionId: decision.id });

    const kept = (cardIds ?? [])
      .filter(cardId => (decision as any).selectableCardIds.includes(cardId))
      .slice(0, 1);

    return finalizeGroupEffects(
      { ...state, pendingDecision: undefined },
      state.pendingGroup,
      kept
    );
  },
});

registerRule({
  id: 'resolve-petko-keep',
  priority: 30,
  when: ({ state, action }) =>
    action.type === 'RESOLVE_DECISION' &&
    state.pendingDecision?.kind === 'card_choice' &&
    (state.pendingDecision as any).purpose === 'petko_keep' &&
    !!state.defeatContext,
  execute: ({ state, action }) => {
    const { decisionId, cardIds } = action as Extract<GameAction, { type: 'RESOLVE_DECISION' }>;
    const decision = state.pendingDecision!;
    if (decision.id !== decisionId) return [];

    emitEvent({ type: 'DECISION_RESOLVED', decisionKind: decision.kind, decisionId: decision.id });

    const keepIds = new Set(
      (cardIds ?? [])
        .filter(cardId => (decision as any).selectableCardIds.includes(cardId))
        .slice(0, (decision as any).maxChoices)
    );

    const player = state.players[state.currentPlayerIndex];
    const keptHand = player.hand.filter(card => keepIds.has(card.id));
    const discardedIds = player.hand
      .filter(card => !keepIds.has(card.id))
      .map(card => card.id);
    const remainingCardIds = player.hand
      .filter(card => !keepIds.has(card.id))
      .map(card => card.id);

    const effects: Effect[] = [
      { type: 'SET_DECISION', decision: undefined },
      { type: 'SET_PANAYOT_TRIGGER', panayotTrigger: undefined },
      { type: 'SET_DEFEAT_CONTEXT', defeatContext: { ...state.defeatContext!, remainingCardIds } },
      { type: 'UPDATE_PLAYER', playerIndex: state.currentPlayerIndex, updates: { hand: keptHand, isRevealed: false } },
    ];

    const intermediate = applyEffects(state, effects);
    effects.push(...continueDefeatResolutionEffects(intermediate));

    return effects;
  },
});

registerRule({
  id: 'resolve-panayot-take',
  priority: 30,
  when: ({ state, action }) =>
    action.type === 'RESOLVE_DECISION' &&
    state.pendingDecision?.kind === 'card_choice' &&
    (state.pendingDecision as any).purpose === 'panayot_take' &&
    !!state.defeatContext,
  execute: ({ state, action }) => {
    const { decisionId, cardIds } = action as Extract<GameAction, { type: 'RESOLVE_DECISION' }>;
    const decision = state.pendingDecision!;
    if (decision.id !== decisionId) return [];

    emitEvent({ type: 'DECISION_RESOLVED', decisionKind: decision.kind, decisionId: decision.id });

    const selected = new Set(
      (cardIds ?? [])
        .filter(cardId => (decision as any).selectableCardIds.includes(cardId))
        .slice(0, (decision as any).maxChoices)
    );

    const defeated = state.players[state.currentPlayerIndex];
    const stolenCards = defeated.hand.filter(card => selected.has(card.id));
    const remainingCardIds = defeated.hand
      .filter(card => !selected.has(card.id))
      .map(card => card.id);
    const newDefeatedHand = defeated.hand.filter(card => !selected.has(card.id));
    const newBeneficiaryHand = [...state.players[decision.ownerPlayerIndex].hand, ...stolenCards];

    const effects: Effect[] = [
      { type: 'SET_DECISION', decision: undefined },
      { type: 'SET_PANAYOT_TRIGGER', panayotTrigger: undefined },
      { type: 'UPDATE_PLAYER', playerIndex: state.currentPlayerIndex, updates: { hand: newDefeatedHand } },
      { type: 'UPDATE_PLAYER', playerIndex: decision.ownerPlayerIndex, updates: { hand: newBeneficiaryHand } },
      { type: 'SET_DEFEAT_CONTEXT', defeatContext: { ...state.defeatContext!, remainingCardIds } },
    ];

    const intermediate = applyEffects(state, effects);
    effects.push(...continueDefeatResolutionEffects(intermediate));

    return effects;
  },
});

registerRule({
  id: 'resolve-contribution',
  priority: 30,
  when: ({ state, action }) =>
    action.type === 'RESOLVE_DECISION' && state.pendingDecision?.kind === 'contribution_choice',
  execute: ({ state, action }) => {
    const { decisionId, contribution } = action as Extract<GameAction, { type: 'RESOLVE_DECISION' }>;
    const decision = state.pendingDecision!;
    if (decision.id !== decisionId || !state.pendingGroup || !contribution) return [];

    emitEvent({ type: 'DECISION_RESOLVED', decisionKind: decision.kind, decisionId: decision.id });

    const player = state.players[state.currentPlayerIndex];
    const hayduti = player.hand.filter(
      card => state.pendingGroup!.selectedCardIds.includes(card.id) && card.type === 'haydut'
    );
    const traitBonus = getTraitGroupBonusFromTable(player, hayduti, contribution);

    return finalizeGroupEffects(
      { ...state, pendingDecision: undefined },
      {
        ...state.pendingGroup,
        chosenContribution: contribution,
        traitBonus,
        effectiveStrength: getGroupStrength(hayduti) + traitBonus,
      }
    );
  },
});

registerRule({
  id: 'resolve-stat-choice',
  priority: 30,
  when: ({ state, action }) =>
    action.type === 'RESOLVE_DECISION' && state.pendingDecision?.kind === 'stat_choice',
  execute: ({ state, action }) => {
    const { decisionId, statType } = action as Extract<GameAction, { type: 'RESOLVE_DECISION' }>;
    const decision = state.pendingDecision!;
    if (decision.id !== decisionId) return [];
    if (!statType || !(decision as any).selectableStats.includes(statType)) return [];

    emitEvent({ type: 'DECISION_RESOLVED', decisionKind: decision.kind, decisionId: decision.id });

    const ownerIndex = decision.ownerPlayerIndex;
    const effects: Effect[] = [
      { type: 'SET_DECISION', decision: undefined },
      { type: 'UPDATE_PLAYER', playerIndex: ownerIndex, updates: { lyubenStatChoice: statType } },
      { type: 'PUSH_NOTIFICATION', text: `Любен Каравелов ще повиши ${statType} в края на играта.`, kind: 'success' as const },
      { type: 'SET_MESSAGE', message: `Любен Каравелов: +1 ${statType}.` },
    ];

    // If in scoring phase, check for more players needing Lyuben choice
    if (state.phase === 'scoring') {
      const intermediate = applyEffects(state, effects);
      effects.push(...lyubenEndOfGameEffects(intermediate));
    }

    return effects;
  },
});

registerRule({
  id: 'resolve-acknowledge',
  priority: 30,
  when: ({ state, action }) =>
    action.type === 'RESOLVE_DECISION' && state.pendingDecision?.kind === 'acknowledge',
  execute: ({ state, action }) => {
    const { decisionId } = action as Extract<GameAction, { type: 'RESOLVE_DECISION' }>;
    const decision = state.pendingDecision!;
    if (decision.id !== decisionId) return [];

    emitEvent({ type: 'DECISION_RESOLVED', decisionKind: decision.kind, decisionId: decision.id });

    return [{ type: 'SET_DECISION', decision: undefined }];
  },
});
