import { Card, ContributionType, DeyetsTraitId } from './card';
import { PlayerStats } from './player';
import {
  GamePhase,
  TurnStep,
  GameLength,
  GameNotification,
  PendingDecision,
} from './state';

// ── Hand masking ───────────────────────────────────────────────

/** What non-owners see for another player's hand. */
export interface HiddenHand {
  count: number;
}

export function isHiddenHand(hand: Card[] | HiddenHand): hand is HiddenHand {
  return !Array.isArray(hand);
}

// ── Player view ────────────────────────────────────────────────

/** A player as seen by a specific viewer. Internal flags stripped. */
export interface PlayerView {
  id: string;
  name: string;
  stats: PlayerStats;
  isRevealed: boolean;
  hand: Card[] | HiddenHand;
  raisedVoyvodas: Card[];
  raisedDeytsi: Card[];
  traits: DeyetsTraitId[];
  lyubenStatChoice?: ContributionType;
  // zaptieTurnIgnored, dyadoIlyoActive: STRIPPED
}

// ── Field masking ──────────────────────────────────────────────

/** Face-down → null, empty slot → 'empty'. */
export type MaskedFieldCard = Card | null | 'empty';

// ── Decision masking ───────────────────────────────────────────

/** What non-owners see for a pending decision (no selectable options). */
export interface MaskedPendingDecision {
  id: string;
  kind: string;
  ownerPlayerIndex: number;
  prompt: string;
}

// ── PlayerViewState ────────────────────────────────────────────

/**
 * The game state shape sent to a specific player over the wire.
 * All secret information is masked or omitted.
 */
export interface PlayerViewState {
  phase: GamePhase;
  ruleset: 'official';
  revision: number;
  // seed: OMITTED

  players: PlayerView[];
  currentPlayerIndex: number;

  deckCount: number;              // was deck: Card[]
  field: MaskedFieldCard[];       // null for face-down
  fieldFaceUp: boolean[];
  sideField: MaskedFieldCard[];   // null for face-down
  sideFieldFaceUp: boolean[];
  usedCardsCount: number;         // was usedCards: Card[]

  deckRotations: number;
  maxRotations: number;
  gameLength: GameLength;
  turnStep: TurnStep;
  actionsRemaining: number;
  actionsUsed: number;
  canFormGroup: boolean;
  selectedCards: string[];
  message: string;
  notifications: GameNotification[];

  pendingDecision?: PendingDecision | MaskedPendingDecision;
  // pendingGroup: OMITTED (internal engine state)
  // defeatContext: OMITTED (internal engine state)

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
