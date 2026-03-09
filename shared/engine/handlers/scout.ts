import { registerAction } from '../action-registry';
import { TurnStep } from '../../types/state';
import { handleZaptieEncounter } from '../helpers/zaptie-encounter';
import { getTotalZaptieBoyna } from '../../utils/field';

registerAction('SCOUT', (state, action) => {
  if (state.turnStep !== 'recruiting' || state.actionsRemaining <= 0) return state;
  const { fieldIndex } = action as { type: 'SCOUT'; fieldIndex: number };
  if (state.fieldFaceUp[fieldIndex]) return state;

  const player = state.players[state.currentPlayerIndex];
  const card = state.field[fieldIndex];
  const newFieldFaceUp = [...state.fieldFaceUp];
  newFieldFaceUp[fieldIndex] = true;

  const scoutActionsRemaining = state.actionsRemaining - 1;
  const scoutActionsUsed = state.actionsUsed + 1;
  const scoutNextStep: TurnStep = scoutActionsRemaining <= 0 ? 'selection' : 'recruiting';

  const scoutState = {
    ...state,
    fieldFaceUp: newFieldFaceUp,
    actionsRemaining: scoutActionsRemaining,
    actionsUsed: scoutActionsUsed,
    turnStep: scoutNextStep,
    message: card.type === 'zaptie'
      ? `Проучване: открито Заптие (сила ${card.strength})!`
      : `Проучване: открита карта "${card.name}"`,
  };

  if (card.type === 'zaptie') {
    if (!player.isRevealed) {
      return handleZaptieEncounter(scoutState, card);
    } else {
      const totalZaptieBoyna = getTotalZaptieBoyna(scoutState.field, scoutState.fieldFaceUp);
      if (totalZaptieBoyna > player.stats.boyna) {
        return handleZaptieEncounter(scoutState, card);
      }
    }
  }

  return scoutState;
});
