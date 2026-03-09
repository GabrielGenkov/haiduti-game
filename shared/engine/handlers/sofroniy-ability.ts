import { registerAction } from '../action-registry';
import { replenishField } from '../helpers/replenish-field';

registerAction('USE_SOFRONIY_ABILITY', (state) => {
  if (state.turnStep !== 'recruiting') return state;
  if (state.sofroniyAbilityUsed) return { ...state, message: 'Способността на Софроний вече е използвана този ход.' };
  const player = state.players[state.currentPlayerIndex];
  if (!player.traits.includes('sofroniy')) return state;

  if (state.deck.length === 0) return { ...state, message: 'Тестето е изчерпано.' };

  const peekedCard = state.deck[0];
  const newDeck = state.deck.slice(1);

  if (peekedCard.type === 'zaptie') {
    const newField = [...state.field, peekedCard];
    const newFieldFaceUp = [...state.fieldFaceUp, true];
    return replenishField({
      ...state,
      deck: newDeck,
      field: newField,
      fieldFaceUp: newFieldFaceUp,
      sofroniyAbilityUsed: true,
      message: `Софроний: открито Заптие (сила ${peekedCard.strength}) — поставено на масата без последствия.`,
    });
  }

  const newField = [...state.field, peekedCard];
  const newFieldFaceUp = [...state.fieldFaceUp, true];
  return {
    ...state,
    deck: newDeck,
    field: newField,
    fieldFaceUp: newFieldFaceUp,
    sofroniyAbilityUsed: true,
    message: `Софроний: открита карта "${peekedCard.name}" — поставена с лице нагоре без разход на ход.`,
  };
});
