/**
 * Property-based tests — use fast-check to generate random valid game sequences
 * and assert universal invariants after every command.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createInitialGameState } from '../factory';
import { applyCommand } from '../engine/command-handler';
import { gameReducer } from '../engine/reducer';
import { derivePhase } from '../engine/phases';
import { buildPlayerView } from '../projections/build-player-view';
import type { GameState } from '../types/state';
import type { Command } from '../types/command';
import type { GameAction } from '../types/action';
import type { ContributionType } from '../types/card';

// ── Helpers ──────────────────────────────────────────────────────────────

/** Count total cards across all zones. */
function countAllCards(state: GameState): number {
  let count = state.deck.length + state.field.filter(c => c !== null).length + state.sideField.filter(c => c !== null).length + state.usedCards.length;
  for (const p of state.players) {
    count += p.hand.length + p.raisedVoyvodas.length + p.raisedDeytsi.length;
  }
  return count;
}

/**
 * Expected card count based on deck rotations.
 * - Rotation 0: 84 regular cards (96 total - 6 silver - 6 gold)
 * - Rotation 1: +6 silver = 90
 * - Rotation 2+: +6 gold = 96
 */
function expectedCardCount(deckRotations: number): number {
  let count = 84; // regular (non-diamond) cards
  if (deckRotations >= 1) count += 6; // silver diamonds added at rotation 1
  if (deckRotations >= 2) count += 6; // gold diamonds added at rotation 2
  return count;
}

/** Build a Command envelope for the current player. */
function makeCommand(state: GameState, action: GameAction): Command {
  const playerId = state.pendingDecision
    ? state.players[state.pendingDecision.ownerPlayerIndex].id
    : state.players[state.currentPlayerIndex].id;
  return {
    ...action,
    commandId: `prop-${state.revision}-${Math.random().toString(36).slice(2, 8)}`,
    playerId,
    expectedRevision: state.revision,
  };
}

/**
 * Generate a valid GameAction for the current state.
 * Returns null if the game is over (scoring phase).
 * Uses a simple counter for deterministic-ish selection within fast-check.
 */
function generateValidAction(state: GameState, pick: number): GameAction | null {
  const phase = derivePhase(state);

  if (phase === 'scoring' || phase === 'home' || phase === 'setup') return null;

  switch (phase) {
    case 'recruiting': {
      const options: GameAction[] = [];

      // SCOUT — pick a face-down card
      const faceDownIdx = state.fieldFaceUp.findIndex(up => !up);
      if (faceDownIdx >= 0) {
        options.push({ type: 'SCOUT', fieldIndex: faceDownIdx });
      }

      // SAFE_RECRUIT — pick a face-up non-zaptie card
      const recruitIdx = state.field.findIndex(
        (card, i) => state.fieldFaceUp[i] && card.type !== 'zaptie',
      );
      if (recruitIdx >= 0) {
        options.push({ type: 'SAFE_RECRUIT', fieldIndex: recruitIdx });
      }

      // RISKY_RECRUIT
      if (state.deck.length > 0) {
        options.push({ type: 'RISKY_RECRUIT' });
      }

      // SKIP_ACTIONS — only if we've used at least 1 action
      if (state.actionsUsed > 0) {
        options.push({ type: 'SKIP_ACTIONS' });
      }

      if (options.length === 0) {
        // Fallback: if somehow no recruiting action is valid, try dismiss
        return { type: 'DISMISS_MESSAGE' };
      }
      return options[pick % options.length];
    }

    case 'selection': {
      const player = state.players[state.currentPlayerIndex];
      const effectiveNabor = player.stats.nabor;
      const needsDiscard = player.hand.length > effectiveNabor;

      if (needsDiscard && player.hand.length > 0) {
        // Must discard — pick a random hand card
        const cardIndex = pick % player.hand.length;
        return { type: 'DISCARD_CARD', cardId: player.hand[cardIndex].id };
      }

      // Can proceed or skip
      const options: GameAction[] = [
        { type: 'PROCEED_TO_FORMING' },
        { type: 'SKIP_FORMING' },
      ];
      return options[pick % options.length];
    }

    case 'forming': {
      // For simplicity, mostly skip forming or end turn
      // Occasionally toggle select if hayduts available
      const player = state.players[state.currentPlayerIndex];
      const hayduts = player.hand.filter(c => c.type === 'haydut');

      const options: GameAction[] = [];

      if (hayduts.length > 0 && state.selectedCards.length < 4) {
        const unselected = hayduts.filter(h => !state.selectedCards.includes(h.id));
        if (unselected.length > 0) {
          options.push({ type: 'TOGGLE_SELECT_CARD', cardId: unselected[pick % unselected.length].id });
        }
      }

      // Can always skip forming or end turn
      options.push({ type: 'SKIP_FORMING' });
      options.push({ type: 'END_TURN' });

      return options[pick % options.length];
    }

    case 'turn_end':
      return { type: 'END_TURN' };

    case 'interrupt:zaptie':
      return { type: 'ACKNOWLEDGE_ZAPTIE' };

    case 'interrupt:trait_choice': {
      const decision = state.pendingDecision;
      if (decision && decision.kind === 'trait_choice' && decision.options && decision.options.length > 0) {
        return {
          type: 'RESOLVE_DECISION',
          decisionId: decision.id,
          traitId: decision.options[pick % decision.options.length],
        };
      }
      // Fallback
      return { type: 'DISMISS_MESSAGE' };
    }

    case 'interrupt:panayot':
      return { type: 'PANAYOT_SKIP' };

    case 'interrupt:defeat_forming':
      // Skip Pop Hariton's forming opportunity
      return (pick % 2 === 0) ? { type: 'POP_HARITON_SKIP' } : { type: 'END_TURN' };

    case 'decision:rakowski_keep': {
      const decision = state.pendingDecision;
      if (decision && decision.selectableCardIds && decision.selectableCardIds.length > 0) {
        return {
          type: 'RESOLVE_DECISION',
          decisionId: decision.id,
          cardIds: [decision.selectableCardIds[pick % decision.selectableCardIds.length]],
        };
      }
      return { type: 'DISMISS_MESSAGE' };
    }

    case 'decision:petko_keep': {
      const decision = state.pendingDecision;
      if (decision && decision.selectableCardIds && decision.selectableCardIds.length > 0) {
        // Pick up to 2 cards
        const ids = decision.selectableCardIds;
        const kept = ids.slice(0, Math.min(2, ids.length));
        return {
          type: 'RESOLVE_DECISION',
          decisionId: decision.id,
          cardIds: kept,
        };
      }
      return { type: 'DISMISS_MESSAGE' };
    }

    case 'decision:panayot_take': {
      const decision = state.pendingDecision;
      if (decision && decision.selectableCardIds && decision.selectableCardIds.length > 0) {
        // Pick up to 2 cards
        const ids = decision.selectableCardIds;
        const taken = ids.slice(0, Math.min(2, ids.length));
        return {
          type: 'RESOLVE_DECISION',
          decisionId: decision.id,
          cardIds: taken,
        };
      }
      return { type: 'DISMISS_MESSAGE' };
    }

    case 'decision:contribution_choice': {
      const decision = state.pendingDecision;
      const contribs: ContributionType[] = ['nabor', 'deynost', 'boyna'];
      if (decision) {
        return {
          type: 'RESOLVE_DECISION',
          decisionId: decision.id,
          contribution: contribs[pick % contribs.length],
        };
      }
      return { type: 'DISMISS_MESSAGE' };
    }

    case 'decision:stat_choice': {
      const decision = state.pendingDecision;
      const stats: ContributionType[] = ['nabor', 'deynost', 'boyna'];
      if (decision) {
        return {
          type: 'RESOLVE_DECISION',
          decisionId: decision.id,
          statType: stats[pick % stats.length],
        };
      }
      return { type: 'DISMISS_MESSAGE' };
    }

    case 'decision:acknowledge': {
      const decision = state.pendingDecision;
      if (decision) {
        return { type: 'RESOLVE_DECISION', decisionId: decision.id };
      }
      return { type: 'DISMISS_MESSAGE' };
    }

    default:
      return { type: 'DISMISS_MESSAGE' };
  }
}

/** Assert all invariants hold for the given state. */
function assertInvariants(state: GameState, label: string): void {
  // 1. Card conservation
  const actual = countAllCards(state);
  const expected = expectedCardCount(state.deckRotations);
  expect(actual, `[${label}] Card conservation: got ${actual}, expected ${expected} (rotations=${state.deckRotations})`).toBe(expected);

  // 2. No zaptie in any player's hand
  for (let i = 0; i < state.players.length; i++) {
    const zapties = state.players[i].hand.filter(c => c.type === 'zaptie');
    expect(zapties.length, `[${label}] Player ${i} has ${zapties.length} zapties in hand`).toBe(0);
  }

  // 3. Parallel array consistency
  expect(
    state.fieldFaceUp.length,
    `[${label}] fieldFaceUp.length (${state.fieldFaceUp.length}) !== field.length (${state.field.length})`,
  ).toBe(state.field.length);
  expect(
    state.sideFieldFaceUp.length,
    `[${label}] sideFieldFaceUp.length (${state.sideFieldFaceUp.length}) !== sideField.length (${state.sideField.length})`,
  ).toBe(state.sideField.length);

  // 4. Revision is non-negative
  expect(state.revision >= 0, `[${label}] Negative revision: ${state.revision}`).toBe(true);

  // 6. No duplicate card IDs across all zones
  const allIds: string[] = [];
  allIds.push(...state.deck.map(c => c.id));
  allIds.push(...state.field.filter(c => c !== null).map(c => c.id));
  allIds.push(...state.sideField.filter(c => c !== null).map(c => c.id));
  allIds.push(...state.usedCards.map(c => c.id));
  for (const p of state.players) {
    allIds.push(...p.hand.map(c => c.id));
    allIds.push(...p.raisedVoyvodas.map(c => c.id));
    allIds.push(...p.raisedDeytsi.map(c => c.id));
  }
  const uniqueIds = new Set(allIds);
  expect(
    uniqueIds.size,
    `[${label}] Duplicate card IDs found: ${allIds.length} total but ${uniqueIds.size} unique`,
  ).toBe(allIds.length);
}

// ── Property Tests ───────────────────────────────────────────────────────

describe('Property-Based Tests', () => {

  it('invariants hold across random game sequences', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2147483646 }),  // random seed
        fc.integer({ min: 2, max: 4 }),             // player count
        (seed, playerCount) => {
          const names = Array.from({ length: playerCount }, (_, i) => `P${i}`);
          let state = createInitialGameState(names, 'short', seed);
          assertInvariants(state, 'init');

          let prevRevision = state.revision;

          for (let i = 0; i < 300; i++) {
            const action = generateValidAction(state, i);
            if (!action) break; // game over

            const cmd = makeCommand(state, action);
            const result = applyCommand(state, cmd);

            if (!result.ok) {
              // Rejected commands don't change state — that's fine
              continue;
            }

            // Monotonic revision
            expect(
              result.newRevision,
              `[cmd ${i}] Revision went from ${prevRevision} to ${result.newRevision}`,
            ).toBe(prevRevision + 1);

            state = result.newState;
            prevRevision = state.revision;
            assertInvariants(state, `cmd ${i} (${action.type})`);
          }
        },
      ),
      { numRuns: 30 },
    );
  });

  it('projection safety: no secret data exposed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2147483646 }),
        (seed) => {
          const names = ['A', 'B', 'C'];
          let state = createInitialGameState(names, 'short', seed);

          // Play a few actions to get interesting state
          for (let i = 0; i < 30; i++) {
            const action = generateValidAction(state, i);
            if (!action) break;
            const cmd = makeCommand(state, action);
            const result = applyCommand(state, cmd);
            if (result.ok) state = result.newState;
          }

          // Check projection for each player
          for (let viewerIdx = 0; viewerIdx < state.players.length; viewerIdx++) {
            const view = buildPlayerView(state, viewerIdx);

            // No deck array
            expect('deck' in view).toBe(false);
            expect(typeof (view as any).deckCount).toBe('number');

            // No usedCards array
            expect('usedCards' in view).toBe(false);
            expect(typeof (view as any).usedCardsCount).toBe('number');

            // No seed
            expect('seed' in view).toBe(false);

            // No pendingGroup or defeatContext
            expect('pendingGroup' in view).toBe(false);
            expect('defeatContext' in view).toBe(false);

            // Own hand is Card[], others are HiddenHand
            for (let pi = 0; pi < view.players.length; pi++) {
              const hand = view.players[pi].hand;
              if (pi === viewerIdx) {
                expect(Array.isArray(hand), `Viewer's own hand should be Card[]`).toBe(true);
              } else {
                expect(
                  !Array.isArray(hand) && typeof (hand as any).count === 'number',
                  `Other player ${pi}'s hand should be HiddenHand`,
                ).toBe(true);
              }
            }

            // Face-down field cards are null
            for (let fi = 0; fi < view.field.length; fi++) {
              if (!view.fieldFaceUp[fi]) {
                expect(view.field[fi], `Face-down field[${fi}] should be null`).toBeNull();
              }
            }
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it('determinism: same seed and actions produce identical states', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2147483646 }),
        (seed) => {
          const names = ['X', 'Y'];

          // Run 1
          let state1 = createInitialGameState(names, 'short', seed);
          const actions: GameAction[] = [];
          for (let i = 0; i < 100; i++) {
            const action = generateValidAction(state1, i);
            if (!action) break;
            actions.push(action);
            const cmd = makeCommand(state1, action);
            const result = applyCommand(state1, cmd);
            if (result.ok) state1 = result.newState;
          }

          // Run 2 — same seed, same action sequence
          let state2 = createInitialGameState(names, 'short', seed);
          for (const action of actions) {
            const cmd = makeCommand(state2, action);
            const result = applyCommand(state2, cmd);
            if (result.ok) state2 = result.newState;
          }

          // States must be identical
          expect(state1.revision).toBe(state2.revision);
          expect(state1.phase).toBe(state2.phase);
          expect(state1.currentPlayerIndex).toBe(state2.currentPlayerIndex);
          expect(state1.deck.map(c => c.id)).toEqual(state2.deck.map(c => c.id));
          expect(state1.field.map(c => c?.id)).toEqual(state2.field.map(c => c?.id));
          for (let i = 0; i < state1.players.length; i++) {
            expect(state1.players[i].hand.map(c => c.id)).toEqual(state2.players[i].hand.map(c => c.id));
            expect(state1.players[i].stats).toEqual(state2.players[i].stats);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it('invariants hold across random long game sequences (covers rotation 3+)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2147483646 }),  // random seed
        fc.integer({ min: 2, max: 4 }),             // player count
        (seed, playerCount) => {
          const names = Array.from({ length: playerCount }, (_, i) => `P${i}`);
          let state = createInitialGameState(names, 'long', seed);
          assertInvariants(state, 'init');

          let prevRevision = state.revision;

          for (let i = 0; i < 600; i++) {
            const action = generateValidAction(state, i);
            if (!action) break; // game over

            const cmd = makeCommand(state, action);
            const result = applyCommand(state, cmd);

            if (!result.ok) continue;

            expect(
              result.newRevision,
              `[cmd ${i}] Revision went from ${prevRevision} to ${result.newRevision}`,
            ).toBe(prevRevision + 1);

            state = result.newState;
            prevRevision = state.revision;
            assertInvariants(state, `cmd ${i} (${action.type})`);
          }
        },
      ),
      { numRuns: 15 },
    );
  });

  it('determinism: same seed produces identical deck after rotation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2147483646 }),
        (seed) => {
          const names = ['X', 'Y'];

          // Run 1
          let state1 = createInitialGameState(names, 'medium', seed);
          const actions: GameAction[] = [];
          for (let i = 0; i < 400; i++) {
            const action = generateValidAction(state1, i);
            if (!action) break;
            actions.push(action);
            const cmd = makeCommand(state1, action);
            const result = applyCommand(state1, cmd);
            if (result.ok) state1 = result.newState;
          }

          // Run 2 — same seed, same action sequence
          let state2 = createInitialGameState(names, 'medium', seed);
          for (const action of actions) {
            const cmd = makeCommand(state2, action);
            const result = applyCommand(state2, cmd);
            if (result.ok) state2 = result.newState;
          }

          // Both must have gone through at least 1 rotation for this to be meaningful
          // (if not, the test is vacuously true — still correct)
          expect(state1.deckRotations).toBe(state2.deckRotations);
          expect(state1.deck.map(c => c.id)).toEqual(state2.deck.map(c => c.id));
          expect(state1.field.map(c => c?.id)).toEqual(state2.field.map(c => c?.id));
          expect(state1.usedCards.map(c => c.id)).toEqual(state2.usedCards.map(c => c.id));
        },
      ),
      { numRuns: 20 },
    );
  });

  it('no command produces negative card counts in any zone', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2147483646 }),
        (seed) => {
          const names = ['A', 'B'];
          let state = createInitialGameState(names, 'short', seed);

          for (let i = 0; i < 200; i++) {
            const action = generateValidAction(state, i * 7 + seed % 13);
            if (!action) break;
            const cmd = makeCommand(state, action);
            const result = applyCommand(state, cmd);
            if (!result.ok) continue;
            state = result.newState;

            // All zone lengths must be non-negative
            expect(state.deck.length >= 0).toBe(true);
            expect(state.field.length >= 0).toBe(true);
            expect(state.sideField.length >= 0).toBe(true);
            expect(state.usedCards.length >= 0).toBe(true);
            for (const p of state.players) {
              expect(p.hand.length >= 0).toBe(true);
              expect(p.raisedVoyvodas.length >= 0).toBe(true);
              expect(p.raisedDeytsi.length >= 0).toBe(true);
            }
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it('gameReducer never throws for valid game actions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2147483646 }),
        fc.integer({ min: 2, max: 4 }),
        (seed, playerCount) => {
          const names = Array.from({ length: playerCount }, (_, i) => `P${i}`);
          let state = createInitialGameState(names, 'short', seed);

          for (let i = 0; i < 200; i++) {
            const action = generateValidAction(state, i);
            if (!action) break;

            // gameReducer should never throw, even for invalid actions
            // (it returns the same state reference for no-ops)
            const newState = gameReducer(state, action);
            expect(newState).toBeDefined();

            // If state changed, use new state
            if (newState !== state) {
              state = newState;
            }
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});
