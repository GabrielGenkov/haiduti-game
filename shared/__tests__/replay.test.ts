import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../factory';
import { replayCommands } from '../engine/replay';
import type { Command } from '../types/command';
import type { GameAction } from '../types/action';

const SEED = 42;

function makeCommand(
  action: GameAction,
  playerId: string,
  expectedRevision: number,
  commandId?: string,
): Command {
  return {
    ...action,
    commandId: commandId ?? `cmd-${expectedRevision}`,
    playerId,
    expectedRevision,
  };
}

describe('Replay', () => {
  it('replaying the same commands produces identical final state', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    const commands: Command[] = [
      makeCommand({ type: 'SCOUT', fieldIndex: 0 }, 'player_0', 0),
      makeCommand({ type: 'SCOUT', fieldIndex: 1 }, 'player_0', 1),
      makeCommand({ type: 'SKIP_ACTIONS' }, 'player_0', 2),
      makeCommand({ type: 'PROCEED_TO_FORMING' }, 'player_0', 3),
    ];

    const r1 = replayCommands(state, commands);
    const r2 = replayCommands(state, commands);

    // States should be deeply equal
    expect(r1.finalState).toEqual(r2.finalState);
    expect(r1.commandCount).toBe(r2.commandCount);
  });

  it('replaying produces the same events deterministically', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    const commands: Command[] = [
      makeCommand({ type: 'SCOUT', fieldIndex: 0 }, 'player_0', 0),
      makeCommand({ type: 'RISKY_RECRUIT' }, 'player_0', 1),
      makeCommand({ type: 'SKIP_ACTIONS' }, 'player_0', 2),
    ];

    const r1 = replayCommands(state, commands);
    const r2 = replayCommands(state, commands);

    // Strip timestamps for comparison (they differ by milliseconds)
    const stripTimestamps = (events: typeof r1.allEvents) =>
      events.map(({ timestamp, ...rest }) => rest);

    expect(stripTimestamps(r1.allEvents)).toEqual(stripTimestamps(r2.allEvents));
    expect(r1.allEvents.length).toBeGreaterThan(0);
  });

  it('replay stops at first rejection and reports failure index', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    const commands: Command[] = [
      makeCommand({ type: 'SCOUT', fieldIndex: 0 }, 'player_0', 0),
      // Wrong expectedRevision — should fail
      makeCommand({ type: 'SCOUT', fieldIndex: 1 }, 'player_0', 0, 'bad-cmd'),
    ];

    const result = replayCommands(state, commands);
    expect(result.commandCount).toBe(1);
    expect(result.failedAt).toBeDefined();
    expect(result.failedAt!.index).toBe(1);
    expect(result.failedAt!.commandId).toBe('bad-cmd');
  });

  it('replay with empty command list returns initial state', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    const result = replayCommands(state, []);
    expect(result.finalState).toBe(state);
    expect(result.allEvents).toHaveLength(0);
    expect(result.commandCount).toBe(0);
    expect(result.failedAt).toBeUndefined();
  });

  it('multi-turn replay accumulates events from all commands', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    const commands: Command[] = [
      makeCommand({ type: 'SCOUT', fieldIndex: 0 }, 'player_0', 0),
      makeCommand({ type: 'SCOUT', fieldIndex: 1 }, 'player_0', 1),
      makeCommand({ type: 'SKIP_ACTIONS' }, 'player_0', 2),
    ];

    const result = replayCommands(state, commands);
    expect(result.commandCount).toBe(3);
    // At minimum: CARD_SCOUTED + CARD_SCOUTED + ACTIONS_SKIPPED = 3 events
    expect(result.allEvents.length).toBeGreaterThanOrEqual(3);
    // Events from different commands should have different revisions
    const revisions = new Set(result.allEvents.map(e => e.revision));
    expect(revisions.size).toBe(3);
  });
});
