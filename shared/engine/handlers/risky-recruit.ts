import { registerAction } from '../action-registry';
import { TurnStep } from '../../types/state';
import { handleZaptieEncounter } from '../helpers/zaptie-encounter';

registerAction('RISKY_RECRUIT', (state) => {
  if (state.turnStep !== 'recruiting' || state.actionsRemaining <= 0) return state;
  if (state.deck.length === 0) {
    return { ...state, message: 'Тестето е изчерпано! Не може рисковано вербуване.' };
  }

  const player = state.players[state.currentPlayerIndex];
  const card = state.deck[0];
  const newDeck = state.deck.slice(1);

  if (card.type === 'zaptie') {
    const newField = [...state.field, card];
    const newFieldFaceUp = [...state.fieldFaceUp, true];
    const riskyZaptieActionsRemaining = state.actionsRemaining - 1;
    const newState = {
      ...state,
      deck: newDeck,
      field: newField,
      fieldFaceUp: newFieldFaceUp,
      actionsUsed: state.actionsUsed + 1,
      actionsRemaining: riskyZaptieActionsRemaining,
    };
    const riskyResult = handleZaptieEncounter(newState, card);
    if (riskyResult.zaptieTrigger) {
      return { ...riskyResult, zaptieTrigger: { ...riskyResult.zaptieTrigger, fromRiskyRecruit: true } };
    }
    return riskyResult;
  }

  const newHand = [...player.hand, card];
  const players = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
  );

  const riskyActionsRemaining = state.actionsRemaining - 1;
  const riskyNextStep: TurnStep = riskyActionsRemaining <= 0 ? 'selection' : 'recruiting';
  return {
    ...state,
    deck: newDeck,
    players,
    actionsRemaining: riskyActionsRemaining,
    actionsUsed: state.actionsUsed + 1,
    turnStep: riskyNextStep,
    message: `Рисковано вербуване: взета карта "${card.name}"`,
  };
});
