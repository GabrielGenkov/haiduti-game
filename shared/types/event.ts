import { ContributionType, DeyetsTraitId, CardType } from './card';

export interface DomainEventBase {
  /** Command revision that produced this event */
  revision: number;
  /** 0-based index within the command's event list */
  index: number;
  /** Player index of the acting player (currentPlayerIndex at time of dispatch) */
  playerIndex: number;
  /** ISO timestamp (set by collectEvents, not by handlers) */
  timestamp: string;
}

// ── Recruiting events ─────────────────────────────────────────

export interface CardScoutedEvent extends DomainEventBase {
  type: 'CARD_SCOUTED';
  fieldIndex: number;
  cardId: string;
  cardName: string;
  cardType: CardType;
  isZaptie: boolean;
}

export interface CardRecruitedSafeEvent extends DomainEventBase {
  type: 'CARD_RECRUITED_SAFE';
  fieldIndex: number;
  cardId: string;
  cardName: string;
}

export interface CardRecruitedRiskyEvent extends DomainEventBase {
  type: 'CARD_RECRUITED_RISKY';
  cardId: string;
  cardName: string;
  cardType: CardType;
  drawnZaptie: boolean;
}

export interface ActionsSkippedEvent extends DomainEventBase {
  type: 'ACTIONS_SKIPPED';
  actionsUsed: number;
}

// ── Selection events ──────────────────────────────────────────

export interface CardDiscardedEvent extends DomainEventBase {
  type: 'CARD_DISCARDED';
  cardId: string;
  cardName: string;
}

export interface FormingStartedEvent extends DomainEventBase {
  type: 'FORMING_STARTED';
}

export interface FormingSkippedEvent extends DomainEventBase {
  type: 'FORMING_SKIPPED';
}

// ── Group formation events ────────────────────────────────────

export interface StatImprovedEvent extends DomainEventBase {
  type: 'STAT_IMPROVED';
  statType: ContributionType;
  previousValue: number;
  newValue: number;
  groupCardIds: string[];
  effectiveStrength: number;
  traitBonus: number;
}

export interface CardRaisedEvent extends DomainEventBase {
  type: 'CARD_RAISED';
  targetCardId: string;
  targetCardName: string;
  targetCardType: 'voyvoda' | 'deyets';
  groupCardIds: string[];
  effectiveStrength: number;
  traitAcquired?: DeyetsTraitId;
}

// ── Zaptie events ─────────────────────────────────────────────

export interface ZaptieEncounteredEvent extends DomainEventBase {
  type: 'ZAPTIE_ENCOUNTERED';
  zaptieCardId: string;
  zaptieStrength: number;
  wasSecret: boolean;
  isDefeated: boolean;
  traitIntercepted?: DeyetsTraitId;
  petkoTriggered: boolean;
  popHaritonTriggered: boolean;
}

export interface ZaptieAcknowledgedEvent extends DomainEventBase {
  type: 'ZAPTIE_ACKNOWLEDGED';
  wasDefeated: boolean;
  resumeStep: string;
}

export interface TraitChoiceOpenedEvent extends DomainEventBase {
  type: 'TRAIT_CHOICE_OPENED';
  options: DeyetsTraitId[];
  zaptieCardId: string;
}

// ── Defeat events ─────────────────────────────────────────────

export interface DefeatResolutionAdvancedEvent extends DomainEventBase {
  type: 'DEFEAT_RESOLUTION_ADVANCED';
  step: 'pop_hariton' | 'petko_keep' | 'panayot_take' | 'final_cleanup';
  defeatedPlayerIndex: number;
}

// ── Ability events ────────────────────────────────────────────

export interface SofroniyAbilityUsedEvent extends DomainEventBase {
  type: 'SOFRONIY_ABILITY_USED';
  revealedCardId: string;
  revealedCardName: string;
  isZaptie: boolean;
}

export interface HadzhiAbilityUsedEvent extends DomainEventBase {
  type: 'HADZHI_ABILITY_USED';
  removedZaptieCardId: string;
  removedZaptieStrength: number;
  fieldIndex: number;
}

export interface PanayotCardPickedEvent extends DomainEventBase {
  type: 'PANAYOT_CARD_PICKED';
  cardId: string;
  cardName: string;
  beneficiaryPlayerIndex: number;
  defeatedPlayerIndex: number;
}

export interface PanayotSkippedEvent extends DomainEventBase {
  type: 'PANAYOT_SKIPPED';
  beneficiaryPlayerIndex: number;
}

export interface LyubenStatChosenEvent extends DomainEventBase {
  type: 'LYUBEN_STAT_CHOSEN';
  statType: ContributionType;
}

export interface PopHaritonGroupFormedEvent extends DomainEventBase {
  type: 'POP_HARITON_GROUP_FORMED';
  statType: ContributionType;
  newValue: number;
  groupCardIds: string[];
}

export interface PopHaritonSkippedEvent extends DomainEventBase {
  type: 'POP_HARITON_SKIPPED';
}

// ── Decision events ───────────────────────────────────────────

export interface DecisionResolvedEvent extends DomainEventBase {
  type: 'DECISION_RESOLVED';
  decisionKind: string;
  decisionId: string;
}

// ── Turn / game lifecycle events ──────────────────────────────

export interface TurnEndedEvent extends DomainEventBase {
  type: 'TURN_ENDED';
  nextPlayerIndex: number;
  benkovskiBonus: number;
}

export interface FieldReplenishedEvent extends DomainEventBase {
  type: 'FIELD_REPLENISHED';
  cardsAdded: number;
  deckRemaining: number;
}

export interface DeckRotatedEvent extends DomainEventBase {
  type: 'DECK_ROTATED';
  rotationNumber: number;
  includesSilver: boolean;
  includesGold: boolean;
}

export interface GameEndedEvent extends DomainEventBase {
  type: 'GAME_ENDED';
  reason: 'max_rotations';
  finalRotation: number;
}

// ── The union ─────────────────────────────────────────────────

export type DomainEvent =
  | CardScoutedEvent
  | CardRecruitedSafeEvent
  | CardRecruitedRiskyEvent
  | ActionsSkippedEvent
  | CardDiscardedEvent
  | FormingStartedEvent
  | FormingSkippedEvent
  | StatImprovedEvent
  | CardRaisedEvent
  | ZaptieEncounteredEvent
  | ZaptieAcknowledgedEvent
  | TraitChoiceOpenedEvent
  | DefeatResolutionAdvancedEvent
  | SofroniyAbilityUsedEvent
  | HadzhiAbilityUsedEvent
  | PanayotCardPickedEvent
  | PanayotSkippedEvent
  | LyubenStatChosenEvent
  | PopHaritonGroupFormedEvent
  | PopHaritonSkippedEvent
  | DecisionResolvedEvent
  | TurnEndedEvent
  | FieldReplenishedEvent
  | DeckRotatedEvent
  | GameEndedEvent;
