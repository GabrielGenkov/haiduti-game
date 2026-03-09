export type CardColor = 'green' | 'blue' | 'red' | 'yellow';
export type ContributionType = 'nabor' | 'deynost' | 'boyna';
export type CardType = 'haydut' | 'voyvoda' | 'deyets' | 'zaptie';

export interface Card {
  id: string;
  type: CardType;
  name: string;
  color?: CardColor;
  strength?: number;
  contribution?: ContributionType;
  cost?: number;
  chetaPoints?: number;
  effect?: string;
  groupBonus?: string;
  traitId?: DeyetsTraitId;
  silverDiamond?: boolean;
  goldDiamond?: boolean;
}

// Trait IDs for each Деец
export type DeyetsTraitId =
  | 'hristo_botev'
  | 'vasil_levski'
  | 'sofroniy'
  | 'rakowski'
  | 'evlogi'
  | 'petko_voy'
  | 'lyuben'
  | 'rayna'
  | 'benkovski'
  | 'pop_hariton'
  | 'hadzhi'
  | 'dyado_ilyo'
  | 'filip_totyu'
  | 'panayot'
  | 'stefan_karadzha';
