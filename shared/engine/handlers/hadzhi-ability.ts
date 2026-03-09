import { registerAction } from '../action-registry';
import { replenishField } from '../helpers/replenish-field';

registerAction('USE_HADZHI_ABILITY', (state, action) => {
  if (state.turnStep !== 'recruiting') return state;
  if (state.hadzhiAbilityUsed) return { ...state, message: 'Способността на Хаджи Димитър вече е използвана.' };
  const player = state.players[state.currentPlayerIndex];
  if (!player.traits.includes('hadzhi')) return state;

  const { fieldIndex } = action as { type: 'USE_HADZHI_ABILITY'; fieldIndex: number };
  const targetCard = state.field[fieldIndex];
  if (!targetCard || targetCard.type !== 'zaptie') {
    return { ...state, message: 'Хаджи Димитър: изберете Заптие от масата.' };
  }

  const newField = state.field.filter((_, i) => i !== fieldIndex);
  const newFieldFaceUp = state.fieldFaceUp.filter((_, i) => i !== fieldIndex);

  return replenishField({
    ...state,
    field: newField,
    fieldFaceUp: newFieldFaceUp,
    hadzhiAbilityUsed: true,
    usedCards: [...state.usedCards, targetCard],
    message: `Хаджи Димитър: Заптие (сила ${targetCard.strength}) е премахнато от масата.`,
  });
});
