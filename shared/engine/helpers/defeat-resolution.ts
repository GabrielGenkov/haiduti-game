import { GameState, DefeatContext } from '../../types/state';
import { currentPlayer, withCurrentPlayer, pushNotification } from './state-utils';

export function clearVisibleCardsForDefeat(state: GameState): GameState {
  const discardedMain = state.field.filter((_, index) => state.fieldFaceUp[index]);
  const hiddenMain = state.field.filter((_, index) => !state.fieldFaceUp[index]);
  const hiddenFaceUp = state.fieldFaceUp.filter(faceUp => !faceUp);
  const discardedSide = state.sideField.filter((_, index) => state.sideFieldFaceUp[index]);

  return {
    ...state,
    usedCards: [...state.usedCards, ...discardedMain, ...discardedSide],
    field: hiddenMain,
    fieldFaceUp: hiddenFaceUp,
    sideField: [],
    sideFieldFaceUp: [],
  };
}

export function createDefeatContext(state: GameState, source: 'scout' | 'risky_recruit'): DefeatContext {
  const player = currentPlayer(state);
  const beneficiaryIndex = state.players.findIndex(
    (candidate, index) =>
      index !== state.currentPlayerIndex && candidate.traits.includes('panayot')
  );

  return {
    source,
    defeatedPlayerIndex: state.currentPlayerIndex,
    popAvailable: source !== 'risky_recruit' && player.traits.includes('pop_hariton') && player.hand.length > 0,
    petkoAvailable: player.traits.includes('petko_voy') && player.hand.length > 0,
    panayotBeneficiaryIndex: beneficiaryIndex >= 0 ? beneficiaryIndex : undefined,
    remainingCardIds: player.hand.map(card => card.id),
  };
}

export function applyDefeat(state: GameState, source: 'scout' | 'risky_recruit'): GameState {
  let nextState = clearVisibleCardsForDefeat(state);
  nextState = {
    ...nextState,
    actionsRemaining: 0,
    canFormGroup: false,
    turnStep: 'selection',
    defeatContext: createDefeatContext(nextState, source),
  };

  return pushNotification(nextState, 'Комитетът е разбит!', 'warning');
}

export function continueDefeatResolution(state: GameState): GameState {
  const context = state.defeatContext;
  if (!context) return state;
  const player = currentPlayer(state);
  const remainingCards = player.hand.filter(card => context.remainingCardIds.includes(card.id));

  if (context.popAvailable && state.turnStep !== 'forming') {
    return pushNotification(
      {
        ...state,
        turnStep: 'forming',
        canFormGroup: true,
        selectedCards: [],
        popHaritonForming: true,
        defeatContext: { ...context, popAvailable: false },
      },
      'Поп Харитон: можеш да сформираш една последна група преди чистенето.',
      'info'
    );
  }

  if (context.petkoAvailable && remainingCards.length > 0) {
    return pushNotification(
      {
        ...state,
        pendingDecision: {
          id: `petko-${Date.now()}`,
          kind: 'card_choice',
          ownerPlayerIndex: state.currentPlayerIndex,
          prompt: 'Петко Войвода: избери до 2 карти, които да запазиш.',
          purpose: 'petko_keep',
          selectableCardIds: remainingCards.map(card => card.id),
          minChoices: 0,
          maxChoices: Math.min(2, remainingCards.length),
          context: {},
        },
        popHaritonForming: false,
        defeatContext: { ...context, petkoAvailable: false },
      },
      'Петко Войвода: запази до 2 карти.'
    );
  }

  if (context.panayotBeneficiaryIndex !== undefined && remainingCards.length > 0) {
    return pushNotification(
      {
        ...state,
        pendingDecision: {
          id: `panayot-${Date.now()}`,
          kind: 'card_choice',
          ownerPlayerIndex: context.panayotBeneficiaryIndex,
          prompt: 'Панайот Хитов: избери до 2 карти от разбития комитет.',
          purpose: 'panayot_take',
          selectableCardIds: remainingCards.map(card => card.id),
          minChoices: 0,
          maxChoices: Math.min(2, remainingCards.length),
          context: {},
        },
        panayotTrigger: {
          beneficiaryPlayerIndex: context.panayotBeneficiaryIndex,
          defeatedPlayerIndex: state.currentPlayerIndex,
          availableCards: remainingCards,
        },
        defeatContext: { ...context, panayotBeneficiaryIndex: undefined },
      },
      `Панайот Хитов: ${state.players[context.panayotBeneficiaryIndex].name} избира карти от разбития комитет.`
    );
  }

  // Final cleanup: discard remaining cards, hide player
  const discarded = player.hand.filter(card => context.remainingCardIds.includes(card.id));
  const nextPlayers = state.players.map((candidate, index) =>
    index === state.currentPlayerIndex
      ? {
          ...candidate,
          hand: candidate.hand.filter(card => !context.remainingCardIds.includes(card.id)),
          isRevealed: false,
        }
      : candidate
  );

  return pushNotification(
    {
      ...state,
      players: nextPlayers,
      usedCards: [...state.usedCards, ...discarded],
      defeatContext: undefined,
      pendingDecision: undefined,
      panayotTrigger: undefined,
      popHaritonForming: false,
      selectedCards: [],
      canFormGroup: false,
      turnStep: 'end',
    },
    'Разбитият комитет се скрива отново. Ходът приключва.',
    'info'
  );
}
