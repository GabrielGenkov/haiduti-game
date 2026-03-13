import { registerAction } from '../action-registry';

registerAction('USE_SOFRONIY_ABILITY', (state) => {
  if (state.turnStep !== 'recruiting') return state;
  if (state.sofroniyAbilityUsed) return { ...state, message: 'Способността на Софроний вече е използвана този ход.' };
  const player = state.players[state.currentPlayerIndex];
  if (!player.traits.includes('sofroniy')) return state;

  if (state.deck.length === 0) return { ...state, message: 'Тестето е изчерпано.' };

  const peekedCard = state.deck[0];
  const newDeck = state.deck.slice(1);

  // All peeked cards go to the side field (safely aside, per Sofroniy rules)
  return {
    ...state,
    deck: newDeck,
    sideField: [...state.sideField, peekedCard],
    sideFieldFaceUp: [...state.sideFieldFaceUp, true],
    sofroniyAbilityUsed: true,
    message: peekedCard.type === 'zaptie'
      ? `Софроний Врачански откри Заптие (сила ${peekedCard.strength}) — поставено встрани без последствия.`
      : `Софроний Врачански разкри "${peekedCard.name}" — поставена встрани с лице нагоре.`,
  };
});
