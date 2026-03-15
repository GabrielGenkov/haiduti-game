import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../factory';
import { derivePhase, isCommandAllowed, ALLOWED_COMMANDS, LogicalPhase } from '../engine/phases';
import { applyCommand } from '../engine/command-handler';
import { gameReducer } from '../engine/reducer';
import type { GameState } from '../types/state';
import type { Command } from '../types/command';
import type { GameAction } from '../types/action';

const SEED = 42;

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED), ...overrides };
}

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

// ── derivePhase unit tests ────────────────────────────────────

describe('derivePhase', () => {
  it('returns home for phase=home', () => {
    expect(derivePhase(makeState({ phase: 'home' }))).toBe('home');
  });

  it('returns setup for phase=setup', () => {
    expect(derivePhase(makeState({ phase: 'setup' }))).toBe('setup');
  });

  it('returns scoring for phase=scoring', () => {
    expect(derivePhase(makeState({ phase: 'scoring' }))).toBe('scoring');
  });

  it('returns recruiting for fresh game (turnStep=recruiting)', () => {
    expect(derivePhase(makeState())).toBe('recruiting');
  });

  it('returns recruiting for turnStep=start', () => {
    expect(derivePhase(makeState({ turnStep: 'start' }))).toBe('recruiting');
  });

  it('returns selection for turnStep=selection', () => {
    expect(derivePhase(makeState({ turnStep: 'selection' }))).toBe('selection');
  });

  it('returns forming for turnStep=forming', () => {
    expect(derivePhase(makeState({ turnStep: 'forming' }))).toBe('forming');
  });

  it('returns turn_end for turnStep=end', () => {
    expect(derivePhase(makeState({ turnStep: 'end' }))).toBe('turn_end');
  });

  it('returns interrupt:zaptie when zaptieTrigger is set', () => {
    expect(derivePhase(makeState({
      zaptieTrigger: { wasSecret: false, isDefeated: false, zaptieCards: [] },
    }))).toBe('interrupt:zaptie');
  });

  it('returns interrupt:panayot when panayotTrigger is set (no zaptie)', () => {
    expect(derivePhase(makeState({
      panayotTrigger: { beneficiaryPlayerIndex: 1, defeatedPlayerIndex: 0, availableCards: [] },
    }))).toBe('interrupt:panayot');
  });

  it('returns interrupt:defeat_forming when popHaritonForming is true', () => {
    expect(derivePhase(makeState({ popHaritonForming: true, turnStep: 'forming' }))).toBe('interrupt:defeat_forming');
  });

  it('returns interrupt:trait_choice for pendingDecision.kind=trait_choice', () => {
    expect(derivePhase(makeState({
      pendingDecision: { id: 'd1', kind: 'trait_choice', ownerPlayerIndex: 0, prompt: 'Choose', options: ['vasil_levski'], context: { source: 'scout' } },
    }))).toBe('interrupt:trait_choice');
  });

  it('returns decision:rakowski_keep for card_choice with rakowski purpose', () => {
    expect(derivePhase(makeState({
      pendingDecision: { id: 'd1', kind: 'card_choice', ownerPlayerIndex: 0, prompt: 'Keep', purpose: 'rakowski_keep', selectableCardIds: [], minChoices: 0, maxChoices: 1, context: {} },
    }))).toBe('decision:rakowski_keep');
  });

  it('returns decision:petko_keep for card_choice with petko purpose', () => {
    expect(derivePhase(makeState({
      pendingDecision: { id: 'd1', kind: 'card_choice', ownerPlayerIndex: 0, prompt: 'Keep', purpose: 'petko_keep', selectableCardIds: [], minChoices: 0, maxChoices: 2, context: {} },
    }))).toBe('decision:petko_keep');
  });

  it('returns decision:panayot_take for card_choice with panayot purpose', () => {
    expect(derivePhase(makeState({
      pendingDecision: { id: 'd1', kind: 'card_choice', ownerPlayerIndex: 0, prompt: 'Take', purpose: 'panayot_take', selectableCardIds: [], minChoices: 0, maxChoices: 2, context: {} },
    }))).toBe('decision:panayot_take');
  });

  it('returns decision:contribution_choice for contribution_choice', () => {
    expect(derivePhase(makeState({
      pendingDecision: { id: 'd1', kind: 'contribution_choice', ownerPlayerIndex: 0, prompt: 'Choose', selectableContributions: ['nabor'], context: {} },
    }))).toBe('decision:contribution_choice');
  });

  it('returns decision:stat_choice for stat_choice', () => {
    expect(derivePhase(makeState({
      pendingDecision: { id: 'd1', kind: 'stat_choice', ownerPlayerIndex: 0, prompt: 'Choose', selectableStats: ['nabor'], context: {} },
    }))).toBe('decision:stat_choice');
  });

  it('returns decision:acknowledge for acknowledge', () => {
    expect(derivePhase(makeState({
      pendingDecision: { id: 'd1', kind: 'acknowledge', ownerPlayerIndex: 0, prompt: 'OK' },
    }))).toBe('decision:acknowledge');
  });

  // ── Priority tests ──

  it('pendingDecision takes priority over zaptieTrigger', () => {
    expect(derivePhase(makeState({
      pendingDecision: { id: 'd1', kind: 'trait_choice', ownerPlayerIndex: 0, prompt: 'Choose', options: ['vasil_levski'], context: { source: 'scout' } },
      zaptieTrigger: { wasSecret: false, isDefeated: false, zaptieCards: [] },
    }))).toBe('interrupt:trait_choice');
  });

  it('zaptieTrigger takes priority over panayotTrigger', () => {
    expect(derivePhase(makeState({
      zaptieTrigger: { wasSecret: false, isDefeated: false, zaptieCards: [] },
      panayotTrigger: { beneficiaryPlayerIndex: 1, defeatedPlayerIndex: 0, availableCards: [] },
    }))).toBe('interrupt:zaptie');
  });

  it('popHaritonForming takes priority over turnStep=forming', () => {
    expect(derivePhase(makeState({
      popHaritonForming: true,
      turnStep: 'forming',
    }))).toBe('interrupt:defeat_forming');
  });
});

// ── isCommandAllowed tests ────────────────────────────────────

describe('isCommandAllowed', () => {
  it('allows SCOUT during recruiting', () => {
    expect(isCommandAllowed(makeState(), 'SCOUT')).toBe(true);
  });

  it('rejects SCOUT during selection', () => {
    expect(isCommandAllowed(makeState({ turnStep: 'selection' }), 'SCOUT')).toBe(false);
  });

  it('rejects SCOUT during interrupt:zaptie', () => {
    expect(isCommandAllowed(makeState({
      zaptieTrigger: { wasSecret: false, isDefeated: false, zaptieCards: [] },
    }), 'SCOUT')).toBe(false);
  });

  it('allows ACKNOWLEDGE_ZAPTIE during interrupt:zaptie', () => {
    expect(isCommandAllowed(makeState({
      zaptieTrigger: { wasSecret: false, isDefeated: false, zaptieCards: [] },
    }), 'ACKNOWLEDGE_ZAPTIE')).toBe(true);
  });

  it('rejects ACKNOWLEDGE_ZAPTIE during recruiting', () => {
    expect(isCommandAllowed(makeState(), 'ACKNOWLEDGE_ZAPTIE')).toBe(false);
  });

  it('allows TOGGLE_SELECT_CARD during forming', () => {
    expect(isCommandAllowed(makeState({ turnStep: 'forming' }), 'TOGGLE_SELECT_CARD')).toBe(true);
  });

  it('allows TOGGLE_SELECT_CARD during interrupt:defeat_forming', () => {
    expect(isCommandAllowed(makeState({ popHaritonForming: true, turnStep: 'forming' }), 'TOGGLE_SELECT_CARD')).toBe(true);
  });

  it('allows END_TURN during forming and turn_end', () => {
    expect(isCommandAllowed(makeState({ turnStep: 'forming' }), 'END_TURN')).toBe(true);
    expect(isCommandAllowed(makeState({ turnStep: 'end' }), 'END_TURN')).toBe(true);
  });

  it('allows POP_HARITON_FORM_GROUP during interrupt:defeat_forming', () => {
    expect(isCommandAllowed(makeState({ popHaritonForming: true, turnStep: 'forming' }), 'POP_HARITON_FORM_GROUP')).toBe(true);
  });

  it('rejects POP_HARITON_FORM_GROUP during normal forming', () => {
    expect(isCommandAllowed(makeState({ turnStep: 'forming' }), 'POP_HARITON_FORM_GROUP')).toBe(false);
  });

  it('allows RESOLVE_DECISION during all decision phases', () => {
    const decisionPhases: LogicalPhase[] = [
      'interrupt:trait_choice', 'decision:rakowski_keep', 'decision:petko_keep',
      'decision:panayot_take', 'decision:contribution_choice', 'decision:stat_choice',
      'decision:acknowledge',
    ];
    for (const phase of decisionPhases) {
      // Construct state that derives to this phase
      let state: GameState;
      switch (phase) {
        case 'interrupt:trait_choice':
          state = makeState({ pendingDecision: { id: 'd', kind: 'trait_choice', ownerPlayerIndex: 0, prompt: '', options: ['vasil_levski'], context: { source: 'scout' } } });
          break;
        case 'decision:rakowski_keep':
          state = makeState({ pendingDecision: { id: 'd', kind: 'card_choice', ownerPlayerIndex: 0, prompt: '', purpose: 'rakowski_keep', selectableCardIds: [], minChoices: 0, maxChoices: 1, context: {} } });
          break;
        case 'decision:petko_keep':
          state = makeState({ pendingDecision: { id: 'd', kind: 'card_choice', ownerPlayerIndex: 0, prompt: '', purpose: 'petko_keep', selectableCardIds: [], minChoices: 0, maxChoices: 2, context: {} } });
          break;
        case 'decision:panayot_take':
          state = makeState({ pendingDecision: { id: 'd', kind: 'card_choice', ownerPlayerIndex: 0, prompt: '', purpose: 'panayot_take', selectableCardIds: [], minChoices: 0, maxChoices: 2, context: {} } });
          break;
        case 'decision:contribution_choice':
          state = makeState({ pendingDecision: { id: 'd', kind: 'contribution_choice', ownerPlayerIndex: 0, prompt: '', selectableContributions: ['nabor'], context: {} } });
          break;
        case 'decision:stat_choice':
          state = makeState({ pendingDecision: { id: 'd', kind: 'stat_choice', ownerPlayerIndex: 0, prompt: '', selectableStats: ['nabor'], context: {} } });
          break;
        case 'decision:acknowledge':
          state = makeState({ pendingDecision: { id: 'd', kind: 'acknowledge', ownerPlayerIndex: 0, prompt: '' } });
          break;
        default:
          throw new Error(`Unhandled phase: ${phase}`);
      }
      expect(isCommandAllowed(state, 'RESOLVE_DECISION')).toBe(true);
    }
  });

  it('allows DISMISS_MESSAGE in every phase', () => {
    const allPhases = Object.keys(ALLOWED_COMMANDS) as LogicalPhase[];
    for (const phase of allPhases) {
      if (phase === 'home' || phase === 'setup' || phase === 'scoring') continue;
      expect(ALLOWED_COMMANDS[phase]).toContain('DISMISS_MESSAGE');
    }
  });

  it('allows PANAYOT_PICK_CARD and PANAYOT_SKIP during interrupt:panayot', () => {
    const state = makeState({
      panayotTrigger: { beneficiaryPlayerIndex: 1, defeatedPlayerIndex: 0, availableCards: [] },
    });
    expect(isCommandAllowed(state, 'PANAYOT_PICK_CARD')).toBe(true);
    expect(isCommandAllowed(state, 'PANAYOT_SKIP')).toBe(true);
  });

  it('rejects PANAYOT_PICK_CARD during recruiting', () => {
    expect(isCommandAllowed(makeState(), 'PANAYOT_PICK_CARD')).toBe(false);
  });
});

// ── Phase guard integration ───────────────────────────────────

describe('phase guard integration', () => {
  it('applyCommand rejects with PHASE_NOT_ALLOWED for wrong-phase commands', () => {
    const state = makeState();
    // FORM_GROUP_IMPROVE_STAT during recruiting → PHASE_NOT_ALLOWED
    const cmd = makeCommand({ type: 'FORM_GROUP_IMPROVE_STAT', statType: 'nabor' });
    const result = applyCommand(state, cmd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejection.kind).toBe('PHASE_NOT_ALLOWED');
      expect(result.rejection.message).toContain('recruiting');
    }
  });

  it('PHASE_NOT_ALLOWED includes phase name in message', () => {
    const state = makeState({
      zaptieTrigger: { wasSecret: false, isDefeated: false, zaptieCards: [] },
    });
    const cmd = makeCommand({ type: 'SCOUT', fieldIndex: 0 });
    const result = applyCommand(state, cmd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejection.kind).toBe('PHASE_NOT_ALLOWED');
      expect(result.rejection.message).toContain('interrupt:zaptie');
    }
  });

  it('golden scenario: phase transitions through a full turn', () => {
    let state = makeState();

    // recruiting
    expect(derivePhase(state)).toBe('recruiting');

    // Scout until actions run out → selection
    state = gameReducer(state, { type: 'SCOUT', fieldIndex: 0 });
    state = gameReducer(state, { type: 'SCOUT', fieldIndex: 1 });
    state = gameReducer(state, { type: 'SCOUT', fieldIndex: 2 });
    state = gameReducer(state, { type: 'SCOUT', fieldIndex: 3 });

    // After 4 scouts with deynost=4, should be in selection
    expect(derivePhase(state)).toBe('selection');

    // Proceed to forming
    state = gameReducer(state, { type: 'PROCEED_TO_FORMING' });
    expect(derivePhase(state)).toBe('forming');

    // Skip forming → end
    state = gameReducer(state, { type: 'SKIP_FORMING' });
    expect(derivePhase(state)).toBe('turn_end');

    // End turn → next player recruiting
    state = gameReducer(state, { type: 'END_TURN' });
    expect(derivePhase(state)).toBe('recruiting');
    expect(state.currentPlayerIndex).toBe(1);
  });
});
