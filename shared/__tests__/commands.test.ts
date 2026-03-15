import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../factory';
import { applyCommand, commandToAction } from '../engine/command-handler';
import type { Command } from '../types/command';
import type { GameAction } from '../types/action';

const SEED = 42;

function makeCommand(
  action: GameAction,
  overrides: Partial<Pick<Command, 'commandId' | 'playerId' | 'expectedRevision'>> = {},
): Command {
  return {
    ...action,
    commandId: overrides.commandId ?? 'cmd-1',
    playerId: overrides.playerId ?? 'player_0',
    expectedRevision: overrides.expectedRevision ?? 0,
  };
}

describe('applyCommand', () => {
  it('returns ok with incremented revision for a valid command', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    expect(state.revision).toBe(0);

    const cmd = makeCommand({ type: 'SCOUT', fieldIndex: 0 });
    const result = applyCommand(state, cmd);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.newRevision).toBe(1);
      expect(result.newState.revision).toBe(1);
    }
  });

  it('rejects with STALE_REVISION when expectedRevision does not match', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    const cmd = makeCommand({ type: 'SCOUT', fieldIndex: 0 }, { expectedRevision: 5 });
    const result = applyCommand(state, cmd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejection.kind).toBe('STALE_REVISION');
      expect(result.rejection.commandId).toBe('cmd-1');
    }
  });

  it('rejects with NOT_YOUR_TURN when playerId does not match current player', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    expect(state.currentPlayerIndex).toBe(0);

    const cmd = makeCommand({ type: 'SCOUT', fieldIndex: 0 }, { playerId: 'player_1' });
    const result = applyCommand(state, cmd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejection.kind).toBe('NOT_YOUR_TURN');
    }
  });

  it('rejects with PHASE_NOT_ALLOWED when command is invalid for current phase', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    // PROCEED_TO_FORMING during 'recruiting' phase is rejected by the phase guard
    const cmd = makeCommand({ type: 'PROCEED_TO_FORMING' });
    const result = applyCommand(state, cmd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejection.kind).toBe('PHASE_NOT_ALLOWED');
    }
  });

  it('rejects with DECISION_NOT_OWNED when wrong player resolves a decision', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);

    // Manually inject a pending decision owned by player 1
    const stateWithDecision = {
      ...state,
      pendingDecision: {
        id: 'test-decision',
        kind: 'acknowledge' as const,
        ownerPlayerIndex: 1,
        prompt: 'Test',
      },
    };

    const cmd = makeCommand(
      { type: 'RESOLVE_DECISION', decisionId: 'test-decision' },
      { playerId: 'player_0' },
    );
    const result = applyCommand(stateWithDecision, cmd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejection.kind).toBe('DECISION_NOT_OWNED');
    }
  });

  it('allows decision owner to resolve their own decision', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);

    // Inject an acknowledge decision owned by player 0
    const stateWithDecision = {
      ...state,
      pendingDecision: {
        id: 'test-ack',
        kind: 'acknowledge' as const,
        ownerPlayerIndex: 0,
        prompt: 'Test acknowledge',
      },
    };

    const cmd = makeCommand(
      { type: 'RESOLVE_DECISION', decisionId: 'test-ack' },
      { playerId: 'player_0' },
    );
    const result = applyCommand(stateWithDecision, cmd);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.newState.pendingDecision).toBeUndefined();
      expect(result.newRevision).toBe(1);
    }
  });

  it('revision increments cumulatively across multiple commands', () => {
    let state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    expect(state.revision).toBe(0);

    // Command 1: scout
    const cmd1 = makeCommand({ type: 'SCOUT', fieldIndex: 0 }, { expectedRevision: 0 });
    const r1 = applyCommand(state, cmd1);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    state = r1.newState;
    expect(state.revision).toBe(1);

    // Command 2: scout again (different card)
    const cmd2 = makeCommand({ type: 'SCOUT', fieldIndex: 1 }, { expectedRevision: 1 });
    const r2 = applyCommand(state, cmd2);
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    state = r2.newState;
    expect(state.revision).toBe(2);
  });
});

describe('commandToAction', () => {
  it('strips command envelope fields, preserving the action payload', () => {
    const cmd: Command = {
      type: 'SCOUT',
      fieldIndex: 3,
      commandId: 'abc-123',
      playerId: 'player_0',
      expectedRevision: 7,
    };
    const action = commandToAction(cmd);

    expect(action).toEqual({ type: 'SCOUT', fieldIndex: 3 });
    expect('commandId' in action).toBe(false);
    expect('playerId' in action).toBe(false);
    expect('expectedRevision' in action).toBe(false);
  });
});
