import { GameAction } from './action';
import { GameState } from './state';
import { DomainEvent } from './event';

/**
 * Command envelope: wraps a GameAction with identity, ownership, and concurrency control.
 * This is the write-side API of the CQRS-shaped system.
 */
export type Command = GameAction & {
  commandId: string;
  playerId: string;
  expectedRevision: number;
};

export type CommandRejectionKind =
  | 'NOT_YOUR_TURN'
  | 'STALE_REVISION'
  | 'INVALID_ACTION'
  | 'DECISION_NOT_OWNED'
  | 'PHASE_NOT_ALLOWED';

export interface CommandRejection {
  kind: CommandRejectionKind;
  commandId: string;
  message: string;
}

export type ApplyResult =
  | { ok: true; newState: GameState; newRevision: number; events: DomainEvent[] }
  | { ok: false; rejection: CommandRejection };
