import { GameState } from '../../../types/state';
import { emitEvent } from '../../event-collector';
import type { Effect } from '../../effects/types';

export function clearVisibleCardsEffects(state: GameState): Effect[] {
  const effects: Effect[] = [];

  // Move face-up field cards to usedCards
  const faceUpFieldIds = state.field
    .filter((_, i) => state.fieldFaceUp[i])
    .map(c => c.id);
  if (faceUpFieldIds.length > 0) {
    effects.push({ type: 'MOVE_CARDS', cardIds: faceUpFieldIds, from: { zone: 'field' }, to: { zone: 'usedCards' } });
  }

  // Move all sideField cards to usedCards
  if (state.sideField.length > 0) {
    const sideFieldIds = state.sideField
      .filter((_, i) => state.sideFieldFaceUp[i])
      .map(c => c.id);
    if (sideFieldIds.length > 0) {
      effects.push({ type: 'MOVE_CARDS', cardIds: sideFieldIds, from: { zone: 'sideField' }, to: { zone: 'usedCards' } });
    }
  }

  return effects;
}

export function buildDefeatEffects(state: GameState, source: 'scout' | 'risky_recruit'): Effect[] {
  const player = state.players[state.currentPlayerIndex];
  const effects = clearVisibleCardsEffects(state);

  const beneficiaryIndex = state.players.findIndex(
    (p, i) => i !== state.currentPlayerIndex && p.traits.includes('panayot')
  );

  effects.push(
    {
      type: 'SET_TURN_FLOW',
      updates: { actionsRemaining: 0, canFormGroup: false, turnStep: 'selection' as const },
    },
    {
      type: 'SET_DEFEAT_CONTEXT',
      defeatContext: {
        source,
        defeatedPlayerIndex: state.currentPlayerIndex,
        popAvailable: source !== 'risky_recruit' && player.traits.includes('pop_hariton') && player.hand.length > 0,
        petkoAvailable: player.traits.includes('petko_voy') && player.hand.length > 0,
        panayotBeneficiaryIndex: beneficiaryIndex >= 0 ? beneficiaryIndex : undefined,
        remainingCardIds: player.hand.map(c => c.id),
      },
    },
    { type: 'PUSH_NOTIFICATION', text: 'Комитетът е разбит!', kind: 'warning' },
    { type: 'SET_MESSAGE', message: 'Комитетът е разбит!' },
  );

  return effects;
}

export function continueDefeatResolutionEffects(state: GameState): Effect[] {
  const context = state.defeatContext;
  if (!context) return [];

  const player = state.players[state.currentPlayerIndex];
  const remainingCards = player.hand.filter(c => context.remainingCardIds.includes(c.id));

  // Pop Hariton: form one last group
  if (context.popAvailable && state.turnStep !== 'forming') {
    emitEvent({ type: 'DEFEAT_RESOLUTION_ADVANCED', step: 'pop_hariton', defeatedPlayerIndex: context.defeatedPlayerIndex });
    return [
      { type: 'SET_TURN_FLOW', updates: { turnStep: 'forming' as const, canFormGroup: true, selectedCards: [] as string[], popHaritonForming: true } },
      { type: 'SET_DEFEAT_CONTEXT', defeatContext: { ...context, popAvailable: false } },
      { type: 'PUSH_NOTIFICATION', text: 'Поп Харитон: можеш да сформираш една последна група преди чистенето.', kind: 'info' },
      { type: 'SET_MESSAGE', message: 'Поп Харитон: можеш да сформираш една последна група преди чистенето.' },
    ];
  }

  // Petko Voyvoda: keep 2 cards
  if (context.petkoAvailable && remainingCards.length > 0) {
    emitEvent({ type: 'DEFEAT_RESOLUTION_ADVANCED', step: 'petko_keep', defeatedPlayerIndex: context.defeatedPlayerIndex });
    return [
      {
        type: 'SET_DECISION',
        decision: {
          id: `petko-${Date.now()}`,
          kind: 'card_choice',
          ownerPlayerIndex: state.currentPlayerIndex,
          prompt: 'Петко Войвода: избери до 2 карти, които да запазиш.',
          purpose: 'petko_keep',
          selectableCardIds: remainingCards.map(c => c.id),
          minChoices: 0,
          maxChoices: Math.min(2, remainingCards.length),
          context: {},
        },
      },
      { type: 'SET_TURN_FLOW', updates: { popHaritonForming: false } },
      { type: 'SET_DEFEAT_CONTEXT', defeatContext: { ...context, petkoAvailable: false } },
      { type: 'PUSH_NOTIFICATION', text: 'Петко Войвода: запази до 2 карти.', kind: 'info' },
      { type: 'SET_MESSAGE', message: 'Петко Войвода: запази до 2 карти.' },
    ];
  }

  // Panayot: other player picks cards
  if (context.panayotBeneficiaryIndex !== undefined && remainingCards.length > 0) {
    emitEvent({ type: 'DEFEAT_RESOLUTION_ADVANCED', step: 'panayot_take', defeatedPlayerIndex: context.defeatedPlayerIndex });
    return [
      {
        type: 'SET_DECISION',
        decision: {
          id: `panayot-${Date.now()}`,
          kind: 'card_choice',
          ownerPlayerIndex: context.panayotBeneficiaryIndex,
          prompt: 'Панайот Хитов: избери до 2 карти от разбития комитет.',
          purpose: 'panayot_take',
          selectableCardIds: remainingCards.map(c => c.id),
          minChoices: 0,
          maxChoices: Math.min(2, remainingCards.length),
          context: {},
        },
      },
      {
        type: 'SET_PANAYOT_TRIGGER',
        panayotTrigger: {
          beneficiaryPlayerIndex: context.panayotBeneficiaryIndex,
          defeatedPlayerIndex: state.currentPlayerIndex,
          availableCards: remainingCards,
        },
      },
      { type: 'SET_DEFEAT_CONTEXT', defeatContext: { ...context, panayotBeneficiaryIndex: undefined } },
      { type: 'PUSH_NOTIFICATION', text: `Панайот Хитов: ${state.players[context.panayotBeneficiaryIndex].name} избира карти от разбития комитет.`, kind: 'info' },
      { type: 'SET_MESSAGE', message: `Панайот Хитов: ${state.players[context.panayotBeneficiaryIndex].name} избира карти от разбития комитет.` },
    ];
  }

  // Final cleanup: discard remaining, hide player
  emitEvent({ type: 'DEFEAT_RESOLUTION_ADVANCED', step: 'final_cleanup', defeatedPlayerIndex: context.defeatedPlayerIndex });
  const discardIds = player.hand
    .filter(c => context.remainingCardIds.includes(c.id))
    .map(c => c.id);

  const effects: Effect[] = [];

  if (discardIds.length > 0) {
    effects.push({
      type: 'MOVE_CARDS',
      cardIds: discardIds,
      from: { zone: 'hand', playerIndex: state.currentPlayerIndex },
      to: { zone: 'usedCards' },
    });
  }

  effects.push(
    { type: 'UPDATE_PLAYER', playerIndex: state.currentPlayerIndex, updates: { isRevealed: false } },
    { type: 'SET_DEFEAT_CONTEXT', defeatContext: undefined },
    { type: 'SET_DECISION', decision: undefined },
    { type: 'SET_PANAYOT_TRIGGER', panayotTrigger: undefined },
    { type: 'SET_TURN_FLOW', updates: { popHaritonForming: false, selectedCards: [] as string[], canFormGroup: false, turnStep: 'end' as const } },
    { type: 'PUSH_NOTIFICATION', text: 'Разбитият комитет се скрива отново. Ходът приключва.', kind: 'info' },
    { type: 'SET_MESSAGE', message: 'Разбитият комитет се скрива отново. Ходът приключва.' },
  );

  return effects;
}
