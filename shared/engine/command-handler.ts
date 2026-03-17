import { GameAction } from "@shared/types";
import { GameState } from "@shared/types";
import { Command, ApplyResult } from '../types/command';
import { gameReducer } from './reducer';
import { collectEvents } from './event-collector';
import { isCommandAllowed, derivePhase } from './phases';

/**
 * Strip command envelope fields to produce a plain GameAction.
 */
export function commandToAction(command: Command): GameAction {
  const { commandId: _, playerId: __, expectedRevision: ___, ...action } = command;
  return action as GameAction;
}

/**
 * Apply a Command to a GameState with full validation:
 * 1. Revision check (optimistic concurrency)
 * 2. Turn ownership / decision ownership
 * 3. Delegate to gameReducer
 * 4. Detect no-op (invalid action)
 * 5. Increment revision on success
 */
export function applyCommand(state: GameState, command: Command): ApplyResult {
  const { commandId, playerId, expectedRevision } = command;

  // 1. Optimistic concurrency: reject stale revisions
  if (expectedRevision !== state.revision) {
    return {
      ok: false,
      rejection: {
        kind: 'STALE_REVISION',
        commandId,
        message: `Expected revision ${expectedRevision}, but state is at revision ${state.revision}`,
      },
    };
  }

  // 2. Ownership checks
  if (state.pendingDecision) {
    // When a decision is pending, only RESOLVE_DECISION is meaningful
    // and only the decision owner can resolve it
    if (command.type === 'RESOLVE_DECISION') {
      const ownerIndex = state.pendingDecision.ownerPlayerIndex;
      const ownerId = state.players[ownerIndex].id;
      if (ownerId !== playerId) {
        return {
          ok: false,
          rejection: {
            kind: 'DECISION_NOT_OWNED',
            commandId,
            message: `Decision is owned by ${ownerId}, not ${playerId}`,
          },
        };
      }
    }
    // Other action types will be rejected by the reducer (it returns same state for non-RESOLVE_DECISION during pending decision)
  } else {
    // No pending decision: only the current player may act
    const currentId = state.players[state.currentPlayerIndex].id;
    if (currentId !== playerId) {
      return {
        ok: false,
        rejection: {
          kind: 'NOT_YOUR_TURN',
          commandId,
          message: `It is ${currentId}'s turn, not ${playerId}'s`,
        },
      };
    }
  }

  // 3. Phase guard: reject commands not allowed in current logical phase
  if (!isCommandAllowed(state, command.type as GameAction['type'])) {
    return {
      ok: false,
      rejection: {
        kind: 'PHASE_NOT_ALLOWED',
        commandId,
        message: `Action ${command.type} is not allowed in phase ${derivePhase(state)}`,
      },
    };
  }

  // 4. Strip envelope and dispatch to the existing reducer, collecting events
  const action = commandToAction(command);
  const newRevision = state.revision + 1;
  const { result: newState, events } = collectEvents(
    state.currentPlayerIndex,
    newRevision,
    () => gameReducer(state, action),
  );

  // 5. Detect no-op (reducer returned same reference = invalid action)
  if (newState === state) {
    return {
      ok: false,
      rejection: {
        kind: 'INVALID_ACTION',
        commandId,
        message: `Action ${command.type} had no effect on the current state`,
      },
    };
  }

  // 6. Success — bump revision, return events
  return {
    ok: true,
    newState: { ...newState, revision: newRevision },
    newRevision,
    events,
  };
}
