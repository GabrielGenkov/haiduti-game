import { Card } from '../types/card';

export function getTotalZaptieBoyna(fieldCards: (Card | null)[], fieldFaceUp: boolean[]): number {
  return fieldCards.reduce((sum, card, i) => {
    if (card !== null && fieldFaceUp[i] && card.type === 'zaptie') {
      return sum + (card.strength ?? 0);
    }
    return sum;
  }, 0);
}
