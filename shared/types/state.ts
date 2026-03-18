import { Card, ContributionType, DeyetsTraitId } from './card';
import { Player } from './player';

export type GameLength = 'short' | 'medium' | 'long';
export type GamePhase = 'home' | 'setup' | 'playing' | 'scoring';
export type TurnStep = 'start' | 'recruiting' | 'selection' | 'forming' | 'end';
export type ActionType = 'scout' | 'safe_recruit' | 'risky_recruit' | 'skip';

export interface GameNotification {
  id: string;
  kind: 'info' | 'warning' | 'error' | 'success';
  text: string;
}

export interface PendingDecisionBase {
  id: string;
  kind: string;
  ownerPlayerIndex: number;
  prompt: string;
}

export interface AcknowledgeDecision extends PendingDecisionBase {
  kind: 'acknowledge';
}

export interface TraitChoiceDecision extends PendingDecisionBase {
  kind: 'trait_choice';
  options: DeyetsTraitId[];
}

export interface CardChoiceDecision extends PendingDecisionBase {
  kind: 'card_choice';
  purpose: 'rakowski_keep' | 'petko_keep' | 'panayot_take';
  selectableCardIds: string[];
  minChoices: number;
  maxChoices: number;
}

export interface ContributionChoiceDecision extends PendingDecisionBase {
  kind: 'contribution_choice';
  selectableContributions: ContributionType[];
}

export interface StatChoiceDecision extends PendingDecisionBase {
  kind: 'stat_choice';
  selectableStats: ContributionType[];
}

export interface PendingDecisionContext {
  source?: 'scout' | 'risky_recruit' | 'sofroniy';
  encounteredCardId?: string;
  targetCardId?: string;
  statType?: ContributionType;
}

export type PendingDecision =
  | (AcknowledgeDecision & { context?: PendingDecisionContext })
  | (TraitChoiceDecision & { context: PendingDecisionContext })
  | (CardChoiceDecision & { context: PendingDecisionContext })
  | (StatChoiceDecision & { context: PendingDecisionContext })
  | (ContributionChoiceDecision & { context: PendingDecisionContext });

export interface PendingGroupContext {
  selectedCardIds: string[];
  haydutCardIds: string[];
  purpose: 'improve_stat' | 'raise_card';
  statType?: ContributionType;
  targetCardId?: string;
  chosenContribution?: ContributionType;
  targetValue?: number;
  effectiveStrength: number;
  traitBonus: number;
}

export interface DefeatContext {
  source: 'scout' | 'risky_recruit';
  defeatedPlayerIndex: number;
  popAvailable: boolean;
  petkoAvailable: boolean;
  panayotBeneficiaryIndex?: number;
  remainingCardIds: string[];
}

export interface GameState {
  phase: GamePhase;
  ruleset: 'official';
  seed: number;
  revision: number;
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  field: (Card | null)[];
  fieldFaceUp: boolean[];
  sideField: (Card | null)[];
  sideFieldFaceUp: boolean[];
  usedCards: Card[];
  deckRotations: number;
  maxRotations: number;
  gameLength: GameLength;
  turnStep: TurnStep;
  actionsRemaining: number;
  actionsUsed: number;
  canFormGroup: boolean;
  selectedCards: string[];
  message: string;
  publicMessage?: string;
  notifications: GameNotification[];
  pendingDecision?: PendingDecision;
  pendingGroup?: PendingGroupContext;
  defeatContext?: DefeatContext;
  zaptieTrigger?: {
    wasSecret: boolean;
    isDefeated: boolean;
    zaptieCards: Card[];
    dyadoIlyoTriggered?: boolean;
    petkoVoyTriggered?: boolean;
    popHaritonTriggered?: boolean;
    fromRiskyRecruit?: boolean;
  };
  panayotTrigger?: {
    beneficiaryPlayerIndex: number;
    defeatedPlayerIndex: number;
    availableCards: Card[];
  };
  popHaritonForming: boolean;
  sofroniyAbilityUsed: boolean;
  hadzhiAbilityUsed: boolean;
  benkovskiApplied: boolean;
  deckExhausted: boolean;
  gameEndsAfterTurn: boolean;
}
