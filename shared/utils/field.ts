import { Card } from '../types/card';

export function getTotalZaptieBoyna(fieldCards: Card[], fieldFaceUp: boolean[]): number {
  return fieldCards.reduce((sum, card, i) => {
    if (fieldFaceUp[i] && card.type === 'zaptie') {
      return sum + (card.strength ?? 0);
    }
    return sum;
  }, 0);
}
