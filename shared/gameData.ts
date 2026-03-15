// ============================================================
// ХАЙДУТИ — Game Data & Types (re-export shim)
// All logic has been decomposed into types/, constants/, utils/, traits/, scoring.ts, factory.ts
// ============================================================

export type {
  CardColor,
  ContributionType,
  CardType,
  Card,
  DeyetsTraitId,
} from './types/card';
export type { PlayerStats, Player } from './types/player';
export type {
  GameLength,
  GamePhase,
  TurnStep,
  ActionType,
  GameState,
} from './types/state';
export type { PlayerScore } from './types/scoring';
export type {
  Command,
  CommandRejection,
  CommandRejectionKind,
  ApplyResult,
} from './types/command';
export type { DomainEvent } from './types/event';
export type {
  HiddenHand,
  PlayerView,
  MaskedFieldCard,
  MaskedPendingDecision,
  PlayerViewState,
} from './types/player-view';
export { isHiddenHand } from './types/player-view';

export {
  HAYDUTI_CARDS,
  VOYVODA_CARDS,
  DEYETS_CARDS,
  ZAPTIE_CARDS,
  ALL_CARDS,
} from './constants/cards';
export { STAT_TRACK, STAT_UPGRADE_COSTS } from './constants/stats';

export { shuffle } from './utils/shuffle';
export {
  getStatValue,
  getNextStatValue,
  getUpgradeCost,
  getMaxReachableStatValue,
  getMaxRotations,
} from './utils/stats';
export {
  canFormGroupByContribution,
  canFormGroupByColor,
  getGroupStrength,
  getGroupContributions,
} from './utils/groups';
export { contributionLabel, colorLabel } from './utils/labels';
export { getTotalZaptieBoyna } from './utils/field';

export { calculateScores } from './scoring';
export { createInitialGameState } from './factory';
