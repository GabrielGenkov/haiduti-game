// ============================================================
// HAYDUTI - Game Engine
// ============================================================

export { gameReducer, getTraitGroupBonus } from './engine/reducer';
export { applyCommand, commandToAction } from './engine/command-handler';
export { collectEvents, emitEvent } from './engine/event-collector';
export { replayCommands } from './engine/replay';
export { dispatchAction } from './engine/rules/rule-dispatcher';
export type { GameAction } from './types/action';
export type { Command, CommandRejection, ApplyResult } from './types/command';
export type { DomainEvent } from './types/event';
export type { Effect, ZoneRef } from './engine/effects/types';
export { applyEffect, applyEffects } from './engine/effects/apply-effect';
export type { Rule, RuleContext } from './engine/rules/rule';
export { derivePhase, isCommandAllowed, ALLOWED_COMMANDS } from './engine/phases';
export type { LogicalPhase } from './engine/phases';
export { buildPlayerView } from './projections';
