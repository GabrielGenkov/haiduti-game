// ============================================================
// ХАЙДУТИ — Game Engine (re-export shim)
// All logic has been decomposed into engine/, traits/
// ============================================================

export { gameReducer } from './engine/reducer';
export { getTraitGroupBonus } from './traits/trait-registry';
export type { GameAction } from './types/action';
