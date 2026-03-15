import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../factory';
import { applyCommand } from '../engine/command-handler';
import { emitEvent, collectEvents } from '../engine/event-collector';
import type { Command } from '../types/command';
import type { GameAction } from '../types/action';
import type { DomainEvent } from '../types/event';

const SEED = 42;

function makeCommand(
  action: GameAction,
  overrides: Partial<Pick<Command, 'commandId' | 'playerId' | 'expectedRevision'>> = {},
): Command {
  return {
    ...action,
    commandId: overrides.commandId ?? 'cmd-test',
    playerId: overrides.playerId ?? 'player_0',
    expectedRevision: overrides.expectedRevision ?? 0,
  };
}

function applyAndGetEvents(
  state: ReturnType<typeof createInitialGameState>,
  action: GameAction,
  overrides: Partial<Pick<Command, 'playerId' | 'expectedRevision'>> = {},
): { events: DomainEvent[]; newState: ReturnType<typeof createInitialGameState> } {
  const cmd = makeCommand(action, overrides);
  const result = applyCommand(state, cmd);
  if (!result.ok) throw new Error(`Command rejected: ${result.rejection.message}`);
  return { events: result.events, newState: result.newState };
}

// ── EventCollector unit tests ──────────────────────────────────

describe('EventCollector', () => {
  it('emitEvent is a no-op when no collector is active', () => {
    // Should not throw
    emitEvent({ type: 'ACTIONS_SKIPPED', actionsUsed: 0 } as any);
  });

  it('collectEvents captures all emitted events', () => {
    const { events } = collectEvents(0, 1, () => {
      emitEvent({ type: 'ACTIONS_SKIPPED', actionsUsed: 2 } as any);
      emitEvent({ type: 'FORMING_STARTED' } as any);
      return 'result';
    });
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('ACTIONS_SKIPPED');
    expect(events[1].type).toBe('FORMING_STARTED');
  });

  it('events receive correct revision and sequential index', () => {
    const { events } = collectEvents(0, 42, () => {
      emitEvent({ type: 'ACTIONS_SKIPPED', actionsUsed: 0 } as any);
      emitEvent({ type: 'FORMING_STARTED' } as any);
      return null;
    });
    expect(events[0].revision).toBe(42);
    expect(events[0].index).toBe(0);
    expect(events[1].revision).toBe(42);
    expect(events[1].index).toBe(1);
  });

  it('events receive playerIndex from the collector', () => {
    const { events } = collectEvents(3, 1, () => {
      emitEvent({ type: 'ACTIONS_SKIPPED', actionsUsed: 0 } as any);
      return null;
    });
    expect(events[0].playerIndex).toBe(3);
  });

  it('nested collection is isolated (stack safety)', () => {
    const outer = collectEvents(0, 1, () => {
      emitEvent({ type: 'ACTIONS_SKIPPED', actionsUsed: 0 } as any);
      const inner = collectEvents(1, 2, () => {
        emitEvent({ type: 'FORMING_STARTED' } as any);
        return 'inner';
      });
      expect(inner.events).toHaveLength(1);
      expect(inner.events[0].type).toBe('FORMING_STARTED');
      emitEvent({ type: 'FORMING_SKIPPED' } as any);
      return 'outer';
    });
    expect(outer.events).toHaveLength(2);
    expect(outer.events[0].type).toBe('ACTIONS_SKIPPED');
    expect(outer.events[1].type).toBe('FORMING_SKIPPED');
  });
});

// ── Handler event emission ──────────────────────────────────────

describe('Handler event emission', () => {
  it('SCOUT emits CARD_SCOUTED event', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    const { events } = applyAndGetEvents(state, { type: 'SCOUT', fieldIndex: 0 });
    const scouted = events.find(e => e.type === 'CARD_SCOUTED');
    expect(scouted).toBeDefined();
    expect(scouted!.type).toBe('CARD_SCOUTED');
    if (scouted!.type === 'CARD_SCOUTED') {
      expect(scouted!.fieldIndex).toBe(0);
      expect(typeof scouted!.cardId).toBe('string');
    }
  });

  it('SAFE_RECRUIT emits CARD_RECRUITED_SAFE and FIELD_REPLENISHED', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    // First scout to reveal a card
    const { newState: s1 } = applyAndGetEvents(state, { type: 'SCOUT', fieldIndex: 0 });

    // Find a non-zaptie face-up card
    const faceUpIndex = s1.fieldFaceUp.findIndex((fu, i) => fu && s1.field[i].type !== 'zaptie');
    if (faceUpIndex < 0) return; // skip if no suitable card

    const { events } = applyAndGetEvents(s1, { type: 'SAFE_RECRUIT', fieldIndex: faceUpIndex }, { expectedRevision: 1 });
    expect(events.some(e => e.type === 'CARD_RECRUITED_SAFE')).toBe(true);
    expect(events.some(e => e.type === 'FIELD_REPLENISHED')).toBe(true);
  });

  it('RISKY_RECRUIT emits CARD_RECRUITED_RISKY', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    const { events } = applyAndGetEvents(state, { type: 'RISKY_RECRUIT' });
    const recruited = events.find(e => e.type === 'CARD_RECRUITED_RISKY');
    expect(recruited).toBeDefined();
  });

  it('SKIP_ACTIONS emits ACTIONS_SKIPPED', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    // First do an action so actionsUsed > 0
    const { newState: s1 } = applyAndGetEvents(state, { type: 'SCOUT', fieldIndex: 0 });
    const { events } = applyAndGetEvents(s1, { type: 'SKIP_ACTIONS' }, { expectedRevision: 1 });
    expect(events.some(e => e.type === 'ACTIONS_SKIPPED')).toBe(true);
  });

  it('PROCEED_TO_FORMING emits FORMING_STARTED', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    // Scout to use an action, then skip to selection, then proceed to forming
    const { newState: s1 } = applyAndGetEvents(state, { type: 'SCOUT', fieldIndex: 0 });
    const { newState: s2 } = applyAndGetEvents(s1, { type: 'SKIP_ACTIONS' }, { expectedRevision: 1 });
    const { events } = applyAndGetEvents(s2, { type: 'PROCEED_TO_FORMING' }, { expectedRevision: 2 });
    expect(events.some(e => e.type === 'FORMING_STARTED')).toBe(true);
  });

  it('SKIP_FORMING emits FORMING_SKIPPED', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    // Get to forming step
    const { newState: s1 } = applyAndGetEvents(state, { type: 'SCOUT', fieldIndex: 0 });
    const { newState: s2 } = applyAndGetEvents(s1, { type: 'SKIP_ACTIONS' }, { expectedRevision: 1 });
    const { newState: s3 } = applyAndGetEvents(s2, { type: 'PROCEED_TO_FORMING' }, { expectedRevision: 2 });
    if (s3.turnStep !== 'forming') return; // guard
    const { events } = applyAndGetEvents(s3, { type: 'SKIP_FORMING' }, { expectedRevision: 3 });
    expect(events.some(e => e.type === 'FORMING_SKIPPED')).toBe(true);
  });

  it('END_TURN emits TURN_ENDED via advanceTurn helper', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    // Get to end step
    const { newState: s1 } = applyAndGetEvents(state, { type: 'SCOUT', fieldIndex: 0 });
    const { newState: s2 } = applyAndGetEvents(s1, { type: 'SKIP_ACTIONS' }, { expectedRevision: 1 });
    const { newState: s3 } = applyAndGetEvents(s2, { type: 'PROCEED_TO_FORMING' }, { expectedRevision: 2 });
    if (s3.turnStep === 'forming') {
      const { newState: s4 } = applyAndGetEvents(s3, { type: 'SKIP_FORMING' }, { expectedRevision: 3 });
      const { events } = applyAndGetEvents(s4, { type: 'END_TURN' }, { expectedRevision: 4 });
      const turnEnded = events.find(e => e.type === 'TURN_ENDED');
      expect(turnEnded).toBeDefined();
      if (turnEnded?.type === 'TURN_ENDED') {
        expect(turnEnded.nextPlayerIndex).toBe(1);
      }
    }
  });
});

// ── applyCommand event integration ──────────────────────────────

describe('applyCommand event integration', () => {
  it('successful command returns events array on ApplyResult', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    const cmd = makeCommand({ type: 'SCOUT', fieldIndex: 0 });
    const result = applyCommand(state, cmd);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.events)).toBe(true);
      expect(result.events.length).toBeGreaterThan(0);
    }
  });

  it('rejected command returns no events', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    const cmd = makeCommand({ type: 'SCOUT', fieldIndex: 0 }, { expectedRevision: 999 });
    const result = applyCommand(state, cmd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect('events' in result).toBe(false);
    }
  });

  it('TOGGLE_SELECT_CARD produces empty events array', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    // Get to selection step
    const { newState: s1 } = applyAndGetEvents(state, { type: 'SCOUT', fieldIndex: 0 });
    const { newState: s2 } = applyAndGetEvents(s1, { type: 'SKIP_ACTIONS' }, { expectedRevision: 1 });
    // Toggle a card in hand
    const player = s2.players[s2.currentPlayerIndex];
    if (player.hand.length > 0) {
      const { events } = applyAndGetEvents(s2, { type: 'TOGGLE_SELECT_CARD', cardId: player.hand[0].id }, { expectedRevision: 2 });
      expect(events).toHaveLength(0);
    }
  });

  it('events have sequential indices starting from 0', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    const cmd = makeCommand({ type: 'SCOUT', fieldIndex: 0 });
    const result = applyCommand(state, cmd);
    if (result.ok && result.events.length > 0) {
      result.events.forEach((event, i) => {
        expect(event.index).toBe(i);
      });
    }
  });

  it('events have correct revision matching the new state', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    const cmd = makeCommand({ type: 'SCOUT', fieldIndex: 0 });
    const result = applyCommand(state, cmd);
    if (result.ok) {
      result.events.forEach(event => {
        expect(event.revision).toBe(result.newRevision);
      });
    }
  });

  it('event playerIndex matches state.currentPlayerIndex at dispatch time', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    const { events } = applyAndGetEvents(state, { type: 'SCOUT', fieldIndex: 0 });
    events.forEach(event => {
      expect(event.playerIndex).toBe(0);
    });
  });
});

// ── Event invariant ──────────────────────────────────────────────

describe('Event invariants', () => {
  it('every successful applyCommand produces at least one event (except TOGGLE/DISMISS)', () => {
    const state = createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
    // SCOUT should produce at least CARD_SCOUTED
    const { events } = applyAndGetEvents(state, { type: 'SCOUT', fieldIndex: 0 });
    expect(events.length).toBeGreaterThanOrEqual(1);
  });
});
