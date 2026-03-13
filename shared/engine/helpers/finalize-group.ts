import { GameState, PendingGroupContext } from '../../types/state';
import { currentPlayer, withCurrentPlayer, pushNotification, getDeyetsTraitId } from './state-utils';
import { continueDefeatResolution } from './defeat-resolution';
import { replenishField } from './replenish-field';

export function finalizeGroup(state: GameState, context: PendingGroupContext, keptCardIds: string[] = []): GameState {
  const player = currentPlayer(state);
  const haydutSet = new Set(context.haydutCardIds);
  const keptSet = new Set(keptCardIds);
  const discardedHayduti = player.hand.filter(
    card => haydutSet.has(card.id) && !keptSet.has(card.id)
  );
  const nextHand = player.hand.filter(card => {
    if (haydutSet.has(card.id) && !keptSet.has(card.id)) return false;
    if (context.purpose === 'raise_card' && card.id === context.targetCardId) return false;
    return true;
  });

  let nextState = withCurrentPlayer(
    {
      ...state,
      pendingDecision: undefined,
      pendingGroup: undefined,
      selectedCards: [],
      usedCards: [...state.usedCards, ...discardedHayduti],
    },
    playerState => {
      if (context.purpose === 'improve_stat' && context.statType && context.targetValue) {
        return {
          ...playerState,
          hand: nextHand,
          stats: { ...playerState.stats, [context.statType]: context.targetValue },
        };
      }

      const targetCard =
        playerState.hand.find(card => card.id === context.targetCardId) ??
        state.field.find(card => card.id === context.targetCardId) ??
        state.sideField.find(card => card.id === context.targetCardId);

      if (!targetCard) return { ...playerState, hand: nextHand };

      const nextTraits =
        targetCard.type === 'deyets'
          ? Array.from(
              new Set([
                ...playerState.traits,
                ...(getDeyetsTraitId(targetCard.id) ? [getDeyetsTraitId(targetCard.id)!] : []),
              ])
            )
          : playerState.traits;

      return {
        ...playerState,
        hand: nextHand,
        raisedVoyvodas:
          targetCard.type === 'voyvoda'
            ? [...playerState.raisedVoyvodas, targetCard]
            : playerState.raisedVoyvodas,
        raisedDeytsi:
          targetCard.type === 'deyets'
            ? [...playerState.raisedDeytsi, targetCard]
            : playerState.raisedDeytsi,
        traits: nextTraits,
      };
    }
  );

  // Remove raised card from field
  if (context.purpose === 'raise_card' && context.targetCardId) {
    const mainIndex = nextState.field.findIndex(card => card.id === context.targetCardId);
    if (mainIndex >= 0) {
      nextState = {
        ...nextState,
        field: nextState.field.filter((_, index) => index !== mainIndex),
        fieldFaceUp: nextState.fieldFaceUp.filter((_, index) => index !== mainIndex),
      };
      nextState = replenishField(nextState);
    }
    const sideIndex = nextState.sideField.findIndex(card => card.id === context.targetCardId);
    if (sideIndex >= 0) {
      nextState = {
        ...nextState,
        sideField: nextState.sideField.filter((_, index) => index !== sideIndex),
        sideFieldFaceUp: nextState.sideFieldFaceUp.filter((_, index) => index !== sideIndex),
      };
    }
  }

  // Check if Lyuben was just raised and needs stat choice
  if (
    context.purpose === 'raise_card' &&
    context.targetCardId === 'dey_lyuben' &&
    !currentPlayer(nextState).lyubenStatChoice
  ) {
    return pushNotification(
      {
        ...nextState,
        pendingDecision: {
          id: `lyuben-${Date.now()}`,
          kind: 'stat_choice',
          ownerPlayerIndex: nextState.currentPlayerIndex,
          prompt: 'Избери показателя за края на играта на Любен Каравелов.',
          selectableStats: ['nabor', 'deynost', 'boyna'],
          context: {},
        },
      },
      'Любен Каравелов: избери показател за крайния бонус.'
    );
  }

  nextState = pushNotification(
    {
      ...nextState,
      canFormGroup: false,
    },
    context.purpose === 'improve_stat'
      ? `Подобрен е показателят "${context.statType}" до ${context.targetValue}.`
      : 'Издигнат е водач.',
    'success'
  );

  if (nextState.defeatContext) {
    return continueDefeatResolution(nextState);
  }

  return nextState;
}
