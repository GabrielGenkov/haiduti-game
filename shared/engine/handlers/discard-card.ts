import { registerAction } from '../action-registry';

registerAction('DISCARD_CARD', (state, action) => {
  if (state.turnStep !== 'selection') return state;
  const { cardId } = action as { type: 'DISCARD_CARD'; cardId: string };
  const player = state.players[state.currentPlayerIndex];
  const newHand = player.hand.filter(c => c.id !== cardId);
  const discarded = player.hand.find(c => c.id === cardId);
  const players = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
  );
  return {
    ...state,
    players,
    turnStep: 'selection',
    usedCards: discarded ? [...state.usedCards, discarded] : state.usedCards,
    message: `Изчистена карта: "${discarded?.name}"`,
  };
});
