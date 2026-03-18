import { ContributionType, DeyetsTraitId } from './card';

export type GameAction =
  | { type: 'SCOUT'; fieldIndex: number; zone?: 'field' | 'sideField' }
  | { type: 'SAFE_RECRUIT'; fieldIndex: number; zone?: 'field' | 'sideField' }
  | { type: 'RISKY_RECRUIT' }
  | { type: 'SKIP_ACTIONS' }
  | { type: 'DISCARD_CARD'; cardId: string }
  | { type: 'CONFIRM_DISCARDS'; cardIds: string[] }
  | { type: 'PROCEED_TO_FORMING' }
  | { type: 'TOGGLE_SELECT_CARD'; cardId: string }
  | { type: 'FORM_GROUP_IMPROVE_STAT'; statType: ContributionType }
  | { type: 'FORM_GROUP_RAISE_CARD'; targetCardId: string }
  | { type: 'END_TURN' }
  | { type: 'ACKNOWLEDGE_ZAPTIE' }
  | { type: 'USE_SOFRONIY_ABILITY' }
  | { type: 'USE_HADZHI_ABILITY'; fieldIndex: number }
  | { type: 'PANAYOT_PICK_CARD'; cardId: string }
  | { type: 'PANAYOT_SKIP' }
  | { type: 'LYUBEN_CHOOSE_STAT'; statType: ContributionType }
  | { type: 'POP_HARITON_SKIP' }
  | { type: 'DISMISS_MESSAGE' }
  | { type: 'SKIP_FORMING' }
  | { type: 'POP_HARITON_FORM_GROUP'; statType: ContributionType }
  | {
      type: 'RESOLVE_DECISION';
      decisionId: string;
      cardIds?: string[];
      contribution?: ContributionType;
      statType?: ContributionType;
      traitId?: DeyetsTraitId;
    };
