import { registerAction } from '../action-registry';

registerAction('PANAYOT_PICK_CARD', (state, action) => {
  if (!state.panayotTrigger) return state;
  const { beneficiaryPlayerIndex, availableCards } = state.panayotTrigger;
  const beneficiary = state.players[beneficiaryPlayerIndex];
  const { cardId } = action as { type: 'PANAYOT_PICK_CARD'; cardId: string };

  const pickedCard = availableCards.find(c => c.id === cardId);
  if (!pickedCard) return state;

  const newAvailableCards = availableCards.filter(c => c.id !== cardId);
  const newBeneficiaryHand = [...beneficiary.hand, pickedCard];

  const players = state.players.map((p, i) => {
    if (i === beneficiaryPlayerIndex) return { ...p, hand: newBeneficiaryHand };
    return p;
  });

  const pickedSoFar = state.panayotTrigger.availableCards.length - newAvailableCards.length;

  const newPanayotTrigger = pickedSoFar >= 2 || newAvailableCards.length === 0
    ? undefined
    : { ...state.panayotTrigger, availableCards: newAvailableCards };

  return {
    ...state,
    players,
    panayotTrigger: newPanayotTrigger,
    message: newPanayotTrigger
      ? `Панайот Хитов: взета карта "${pickedCard.name}". Избери още 1.`
      : `Панайот Хитов: взети ${pickedSoFar} карти от разбития комитет.`,
  };
});

registerAction('PANAYOT_SKIP', (state) => {
  if (!state.panayotTrigger) return state;
  return { ...state, panayotTrigger: undefined, message: 'Панайот Хитов: пропуснато.' };
});
