import { Card, ContributionType, DeyetsTraitId } from './card';

export interface PlayerStats {
  nabor: number;
  deynost: number;
  boyna: number;
}

export interface Player {
  id: string;
  name: string;
  stats: PlayerStats;
  isRevealed: boolean;
  hand: Card[];
  raisedVoyvodas: Card[];
  raisedDeytsi: Card[];
  traits: DeyetsTraitId[];
  zaptieTurnIgnored: boolean;
  dyadoIlyoActive: boolean;
  lyubenStatChoice?: ContributionType;
}
