import { registerRule } from '../rule-registry';
import { emitEvent } from '../../event-collector';

registerRule({
  id: 'panayot-pick',
  priority: 25,
  when: ({ state, action }) => action.type === 'PANAYOT_PICK_CARD' && !!state.panayotTrigger,
  execute: ({ state, action }) => {
    const { beneficiaryPlayerIndex, availableCards } = state.panayotTrigger!;
    const { cardId } = action as { type: 'PANAYOT_PICK_CARD'; cardId: string };

    const pickedCard = availableCards.find(c => c.id === cardId);
    if (!pickedCard) return [];

    emitEvent({
      type: 'PANAYOT_CARD_PICKED', cardId: pickedCard.id, cardName: pickedCard.name,
      beneficiaryPlayerIndex, defeatedPlayerIndex: state.panayotTrigger!.defeatedPlayerIndex,
    });

    const newAvailableCards = availableCards.filter(c => c.id !== cardId);
    const newBeneficiaryHand = [...state.players[beneficiaryPlayerIndex].hand, pickedCard];
    const pickedSoFar = state.panayotTrigger!.availableCards.length - newAvailableCards.length;
    const newPanayotTrigger = pickedSoFar >= 2 || newAvailableCards.length === 0
      ? undefined
      : { ...state.panayotTrigger!, availableCards: newAvailableCards };

    // Cards come from panayotTrigger.availableCards (a snapshot), not a standard zone.
    // Use UPDATE_PLAYER to directly set the beneficiary's hand.
    return [
      { type: 'UPDATE_PLAYER', playerIndex: beneficiaryPlayerIndex, updates: { hand: newBeneficiaryHand } },
      { type: 'SET_PANAYOT_TRIGGER', panayotTrigger: newPanayotTrigger },
      {
        type: 'SET_MESSAGE',
        message: newPanayotTrigger
          ? `Панайот Хитов: взета карта "${pickedCard.name}". Избери още 1.`
          : `Панайот Хитов: взети ${pickedSoFar} карти от разбития комитет.`,
      },
    ];
  },
});

registerRule({
  id: 'panayot-skip',
  priority: 25,
  when: ({ state, action }) => action.type === 'PANAYOT_SKIP' && !!state.panayotTrigger,
  execute: ({ state }) => {
    emitEvent({ type: 'PANAYOT_SKIPPED', beneficiaryPlayerIndex: state.panayotTrigger!.beneficiaryPlayerIndex });
    return [
      { type: 'SET_PANAYOT_TRIGGER', panayotTrigger: undefined },
      { type: 'SET_MESSAGE', message: 'Панайот Хитов: пропуснато.' },
    ];
  },
});
