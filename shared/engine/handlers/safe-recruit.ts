import { registerAction } from '../action-registry';
import { TurnStep } from '../../types/state';
import { replenishField } from '../helpers/replenish-field';

registerAction('SAFE_RECRUIT', (state, action) => {
  if (state.turnStep !== 'recruiting' || state.actionsRemaining <= 0) return state;
  const { fieldIndex } = action as { type: 'SAFE_RECRUIT'; fieldIndex: number };
  if (!state.fieldFaceUp[fieldIndex]) return state;

  const player = state.players[state.currentPlayerIndex];
  const card = state.field[fieldIndex];
  if (card.type === 'zaptie') return state;

  const newField = state.field.filter((_, i) => i !== fieldIndex);
  const newFieldFaceUp = state.fieldFaceUp.filter((_, i) => i !== fieldIndex);
  const newHand = [...player.hand, card];

  const players = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
  );

  const newActionsRemaining = state.actionsRemaining - 1;
  const newActionsUsed = state.actionsUsed + 1;
  const newTurnStep: TurnStep = newActionsRemaining <= 0 ? 'selection' : 'recruiting';

  return replenishField({
    ...state,
    field: newField,
    fieldFaceUp: newFieldFaceUp,
    players,
    actionsRemaining: newActionsRemaining,
    actionsUsed: newActionsUsed,
    turnStep: newTurnStep,
    message: `Сигурно вербуване: взета карта "${card.name}"`,
  });
});
