// ============================================================
// ХАЙДУТИ — Barrel Exports (Public API)
// ============================================================

// Types
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
export type { GameAction } from './types/action';
export type { PlayerScore } from './types/scoring';

// Constants
export {
  HAYDUTI_CARDS,
  VOYVODA_CARDS,
  DEYETS_CARDS,
  ZAPTIE_CARDS,
  ALL_CARDS,
} from './constants/cards';
export { STAT_TRACK, STAT_UPGRADE_COSTS } from './constants/stats';

// Utility functions
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

// Engine
export { gameReducer } from './engine/reducer';
export { getTraitGroupBonus } from './traits/trait-registry';

// Scoring & Factory
export { calculateScores } from './scoring';
export { createInitialGameState } from './factory';
