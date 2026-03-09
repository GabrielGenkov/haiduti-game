import { Card, CardColor, ContributionType } from '../types/card';

export function canFormGroupByContribution(cards: Card[]): ContributionType | null {
  const hayduti = cards.filter(c => c.type === 'haydut');
  if (hayduti.length < 2) return null;
  const contributions = Array.from(new Set(hayduti.map(c => c.contribution)));
  if (contributions.length === 1 && contributions[0]) return contributions[0];
  return null;
}

export function canFormGroupByColor(cards: Card[]): CardColor | null {
  const hayduti = cards.filter(c => c.type === 'haydut');
  if (hayduti.length < 2) return null;
  const colors = Array.from(new Set(hayduti.map(c => c.color)));
  if (colors.length === 1 && colors[0]) return colors[0];
  return null;
}

export function getGroupStrength(cards: Card[]): number {
  return cards
    .filter(c => c.type === 'haydut')
    .reduce((sum, c) => sum + (c.strength ?? 0), 0);
}

export function getGroupContributions(cards: Card[]): ContributionType[] {
  const contribs = cards
    .filter(c => c.type === 'haydut' && c.contribution)
    .map(c => c.contribution as ContributionType);
  return Array.from(new Set(contribs));
}
