import { TraitStrategy, registerTrait } from './trait-registry';

const dyadoIlyoTrait: TraitStrategy = {
  id: 'dyado_ilyo',

  onZaptieEncounter(state, zaptieCard) {
    const player = state.players[state.currentPlayerIndex];
    // Only triggers on first reveal (wasSecret)
    if (player.isRevealed) return null;

    // Remove the Zaptie from field
    const newField = state.field.filter(c => c.id !== zaptieCard.id);
    const newFieldFaceUp = state.fieldFaceUp.filter((_, i) => state.field[i]?.id !== zaptieCard.id);
    const players = state.players.map((p, i) =>
      i === state.currentPlayerIndex
        ? { ...p, isRevealed: true, dyadoIlyoActive: true }
        : p
    );
    return {
      ...state,
      players,
      field: newField,
      fieldFaceUp: newFieldFaceUp,
      actionsRemaining: 0,
      canFormGroup: false,
      zaptieTrigger: {
        wasSecret: true,
        isDefeated: false,
        zaptieCards: [zaptieCard],
        dyadoIlyoTriggered: true,
      },
      message: `Дядо Ильо: Заптието е отстранено! Комитетът е разкрит, но можеш да задържиш 2 карти повече.`,
    };
  },

  resetTurnState() {
    return { dyadoIlyoActive: false };
  },
};

registerTrait(dyadoIlyoTrait);
