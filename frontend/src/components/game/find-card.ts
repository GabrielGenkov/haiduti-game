import type { Card } from '@shared/gameData';
import type { AnyGameState } from '@/utils/view-helpers';

export function findCardById(state: AnyGameState, cardId: string): Card | undefined {
  const handCard = state.players
    .flatMap(player => Array.isArray(player.hand) ? player.hand : [])
    .find(card => card.id === cardId);
  const fieldCard = (state.field as (Card | null)[])
    .filter((c): c is Card => c != null)
    .find(card => card.id === cardId);
  const sideCard = (state.sideField as (Card | null)[])
    .filter((c): c is Card => c != null)
    .find(card => card.id === cardId);
  // Panayot trigger stores card snapshots visible to the beneficiary
  const panayotCard = state.panayotTrigger?.availableCards
    ?.find(card => card.id === cardId);
  return handCard ?? fieldCard ?? sideCard ?? panayotCard;
}
