import { ContributionType, CardColor } from '../types/card';

export function contributionLabel(type: ContributionType): string {
  switch (type) {
    case 'nabor': return 'Набор';
    case 'deynost': return 'Дейност';
    case 'boyna': return 'Бойна мощ';
  }
}

export function colorLabel(color: CardColor): string {
  switch (color) {
    case 'green': return 'Зелен';
    case 'blue': return 'Син';
    case 'red': return 'Червен';
    case 'yellow': return 'Жълт';
  }
}
