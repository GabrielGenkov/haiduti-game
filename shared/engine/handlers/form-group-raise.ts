import { registerAction } from '../action-registry';
import { DeyetsTraitId } from '../../types/card';
import { validateGroupForRaise, resolveGroupDiscard } from '../helpers/group-validation';
import { replenishField } from '../helpers/replenish-field';

/** Map a Deец card ID to its trait ID */
function cardIdToTrait(cardId: string): DeyetsTraitId | null {
  const map: Record<string, DeyetsTraitId> = {
    dey_hristo: 'hristo_botev',
    dey_vasil: 'vasil_levski',
    dey_sofroniy: 'sofroniy',
    dey_rakowski: 'rakowski',
    dey_evlogi: 'evlogi',
    dey_petko_voy: 'petko_voy',
    dey_lyuben: 'lyuben',
    dey_rayna: 'rayna',
    dey_benkovski: 'benkovski',
    dey_pop: 'pop_hariton',
    dey_hadzhi: 'hadzhi',
    dey_dyado: 'dyado_ilyo',
    dey_filip: 'filip_totyu',
    dey_panayot: 'panayot',
    dey_stefan: 'stefan_karadzha',
  };
  return map[cardId] ?? null;
}

registerAction('FORM_GROUP_RAISE_CARD', (state, action) => {
  if (state.turnStep !== 'forming') return state;
  const { targetCardId } = action as { type: 'FORM_GROUP_RAISE_CARD'; targetCardId: string };
  const player = state.players[state.currentPlayerIndex];

  const targetInField = state.field.find(c => c.id === targetCardId);
  const targetInHand = player.hand.find(c => c.id === targetCardId);
  const targetCard = targetInField || targetInHand;

  if (!targetCard) return state;
  if (targetCard.type !== 'voyvoda' && targetCard.type !== 'deyets') return state;

  const validation = validateGroupForRaise(state.selectedCards, player, targetCard);
  if (!validation.valid) {
    return { ...state, message: validation.errorMessage! };
  }

  const newTrait = targetCard.type === 'deyets' ? cardIdToTrait(targetCard.id) : null;
  const { newHand, discarded: discardedHayduti } = resolveGroupDiscard(
    player, validation.hayduti, state.selectedCards, targetCardId
  );

  const newField = state.field.filter(c => c.id !== targetCardId);
  const newFieldFaceUp = state.fieldFaceUp.filter((_, i) => state.field[i]?.id !== targetCardId);

  const isVoyvoda = targetCard.type === 'voyvoda';
  const players = state.players.map((p, i) => {
    if (i !== state.currentPlayerIndex) return p;
    const updatedTraits = newTrait && !p.traits.includes(newTrait)
      ? [...p.traits, newTrait]
      : p.traits;
    return {
      ...p,
      hand: newHand,
      raisedVoyvodas: isVoyvoda ? [...p.raisedVoyvodas, targetCard] : p.raisedVoyvodas,
      raisedDeytsi: !isVoyvoda ? [...p.raisedDeytsi, targetCard] : p.raisedDeytsi,
      traits: updatedTraits,
    };
  });

  const wasInField = state.field.some(c => c.id === targetCardId);
  const traitMsg = newTrait ? ` Придобита черта: ${targetCard.name}!` : '';
  const rakowskiMsg = player.traits.includes('rakowski') && !player.isRevealed ? ' Раковски: запазена 1 карта.' : '';

  let baseResult: typeof state = {
    ...state,
    players,
    field: newField,
    fieldFaceUp: newFieldFaceUp,
    usedCards: [...state.usedCards, ...discardedHayduti],
    selectedCards: [] as string[],
    canFormGroup: false,
    message: `Издигнат "${targetCard.name}"!${traitMsg}${rakowskiMsg}`,
  };

  if (wasInField) {
    baseResult = replenishField(baseResult);
  }

  // If Lyuben was just raised, prompt for stat choice
  if (targetCardId === 'dey_lyuben') {
    const updatedPlayer = baseResult.players[state.currentPlayerIndex];
    if (!updatedPlayer.lyubenStatChoice) {
      return {
        ...baseResult,
        pendingDecision: {
          id: `lyuben-${Date.now()}`,
          kind: 'stat_choice',
          ownerPlayerIndex: state.currentPlayerIndex,
          prompt: 'Избери показателя за края на играта на Любен Каравелов.',
          selectableStats: ['nabor', 'deynost', 'boyna'],
          context: {},
        },
        message: 'Любен Каравелов: избери показател за крайния бонус.',
      };
    }
  }

  return baseResult;
});
