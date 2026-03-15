/**
 * Golden tests — baseline integration tests capturing current game behavior.
 * These tests use a fixed seed for deterministic deck ordering and exercise
 * the complete game reducer through realistic game scenarios.
 *
 * Every subsequent refactoring phase must keep these tests green.
 */
import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../factory';
import { gameReducer } from '../engine/reducer';
import { GameState } from '../types/state';
import { GameAction } from '../types/action';
import { calculateScores } from '../scoring';
import { Card } from '../types/card';

// ── Helpers ──────────────────────────────────────────────────────────────

const SEED = 42;

function createGame(playerCount = 2, gameLength: 'short' | 'medium' | 'long' = 'short') {
  const names = Array.from({ length: playerCount }, (_, i) => `Player${i + 1}`);
  return createInitialGameState(names, gameLength, SEED);
}

function dispatch(state: GameState, action: GameAction): GameState {
  return gameReducer(state, action);
}

function dispatchAll(state: GameState, actions: GameAction[]): GameState {
  return actions.reduce(dispatch, state);
}

function currentPlayer(state: GameState) {
  return state.players[state.currentPlayerIndex];
}

/** Find first face-down field index */
function findFaceDownIndex(state: GameState): number {
  return state.fieldFaceUp.findIndex(up => !up);
}

/** Find first face-up non-zaptie field index */
function findRecruitableIndex(state: GameState): number {
  return state.field.findIndex(
    (card, i) => state.fieldFaceUp[i] && card.type !== 'zaptie'
  );
}

/** Find first face-up zaptie field index */
function findZaptieIndex(state: GameState): number {
  return state.field.findIndex(
    (card, i) => state.fieldFaceUp[i] && card.type === 'zaptie'
  );
}

/** Count total cards across all zones for conservation checks */
function countAllCards(state: GameState): number {
  let count = state.deck.length + state.field.length + state.sideField.length + state.usedCards.length;
  for (const p of state.players) {
    count += p.hand.length + p.raisedVoyvodas.length + p.raisedDeytsi.length;
  }
  return count;
}

// ── Test Suites ──────────────────────────────────────────────────────────

describe('Phase 0 Golden Tests', () => {

  describe('Deterministic initialization', () => {
    it('creates identical states from the same seed', () => {
      const state1 = createGame();
      const state2 = createGame();
      expect(state1.deck.map(c => c.id)).toEqual(state2.deck.map(c => c.id));
      expect(state1.field.map(c => c.id)).toEqual(state2.field.map(c => c.id));
    });

    it('creates different states from different seeds', () => {
      const state1 = createInitialGameState(['A', 'B'], 'short', 42);
      const state2 = createInitialGameState(['A', 'B'], 'short', 123);
      // Very unlikely to be identical
      expect(state1.deck.map(c => c.id)).not.toEqual(state2.deck.map(c => c.id));
    });

    it('initializes with correct defaults', () => {
      const state = createGame(3);
      expect(state.phase).toBe('playing');
      expect(state.turnStep).toBe('recruiting');
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.players.length).toBe(3);
      expect(state.field.length).toBe(16);
      expect(state.fieldFaceUp.every(v => v === false)).toBe(true);
      expect(state.seed).toBe(SEED);
      expect(state.revision).toBe(0);
      for (const p of state.players) {
        expect(p.stats).toEqual({ nabor: 4, deynost: 4, boyna: 4 });
        expect(p.hand.length).toBe(0);
        expect(p.isRevealed).toBe(false);
        expect(p.traits.length).toBe(0);
      }
    });

    it('excludes silver and gold diamond cards initially', () => {
      const state = createGame();
      const allGameCards = [...state.deck, ...state.field];
      expect(allGameCards.some(c => c.silverDiamond)).toBe(false);
      expect(allGameCards.some(c => c.goldDiamond)).toBe(false);
    });
  });

  describe('Basic turn flow', () => {
    it('scout reveals a field card and consumes an action', () => {
      const state = createGame();
      const idx = findFaceDownIndex(state);
      const next = dispatch(state, { type: 'SCOUT', fieldIndex: idx });

      expect(next.fieldFaceUp[idx]).toBe(true);
      expect(next.actionsRemaining).toBe(state.actionsRemaining - 1);
      expect(next.actionsUsed).toBe(1);
    });

    it('scout on already face-up card does nothing', () => {
      const state = createGame();
      const idx = findFaceDownIndex(state);
      const scouted = dispatch(state, { type: 'SCOUT', fieldIndex: idx });
      const again = dispatch(scouted, { type: 'SCOUT', fieldIndex: idx });
      // Should be same state (no change)
      expect(again.actionsUsed).toBe(scouted.actionsUsed);
    });

    it('safe recruit takes a face-up non-zaptie card into hand', () => {
      let state = createGame();
      // Scout until we find a non-zaptie
      let recruitIdx = -1;
      for (let i = 0; i < 16 && recruitIdx === -1; i++) {
        const idx = findFaceDownIndex(state);
        if (idx === -1) break;
        state = dispatch(state, { type: 'SCOUT', fieldIndex: idx });
        if (state.field[idx].type !== 'zaptie') {
          recruitIdx = idx;
        }
        // If zaptie encounter changed state, check for pending decision
        if (state.pendingDecision) break;
      }

      if (recruitIdx !== -1 && !state.pendingDecision && state.actionsRemaining > 0) {
        const cardToRecruit = state.field[recruitIdx];
        const next = dispatch(state, { type: 'SAFE_RECRUIT', fieldIndex: recruitIdx });
        const hand = next.players[next.currentPlayerIndex].hand;
        expect(hand.some(c => c.id === cardToRecruit.id)).toBe(true);
      }
    });

    it('risky recruit draws from deck into hand (non-zaptie)', () => {
      let state = createGame();
      const topCard = state.deck[0];

      if (topCard.type !== 'zaptie') {
        const next = dispatch(state, { type: 'RISKY_RECRUIT' });
        expect(currentPlayer(next).hand.some(c => c.id === topCard.id)).toBe(true);
        expect(next.deck.length).toBe(state.deck.length - 1);
        expect(next.actionsUsed).toBe(1);
      }
    });

    it('skip actions transitions to selection phase', () => {
      let state = createGame();
      // Must use at least 1 action before skipping
      const idx = findFaceDownIndex(state);
      state = dispatch(state, { type: 'SCOUT', fieldIndex: idx });

      // Skip if not interrupted by zaptie
      if (state.turnStep === 'recruiting' && !state.pendingDecision) {
        const next = dispatch(state, { type: 'SKIP_ACTIONS' });
        expect(next.turnStep).toBe('selection');
        expect(next.actionsRemaining).toBe(0);
      }
    });

    it('skip actions requires at least 1 used action', () => {
      const state = createGame();
      const next = dispatch(state, { type: 'SKIP_ACTIONS' });
      // Should not change — actionsUsed is 0
      expect(next.turnStep).toBe('recruiting');
    });

    it('proceed-to-forming transitions from selection to forming', () => {
      let state = createGame();
      // Use all actions to get to selection
      for (let i = 0; i < state.actionsRemaining; i++) {
        const idx = findFaceDownIndex(state);
        if (idx === -1) break;
        state = dispatch(state, { type: 'SCOUT', fieldIndex: idx });
        if (state.pendingDecision || state.turnStep !== 'recruiting') break;
      }

      if (state.turnStep === 'selection') {
        const next = dispatch(state, { type: 'PROCEED_TO_FORMING' });
        expect(next.turnStep).toBe('forming');
      }
    });

    it('end turn advances to next player', () => {
      let state = createGame();
      // Fast-forward to forming phase
      for (let i = 0; i < state.actionsRemaining; i++) {
        const idx = findFaceDownIndex(state);
        if (idx === -1) break;
        state = dispatch(state, { type: 'SCOUT', fieldIndex: idx });
        if (state.pendingDecision || state.turnStep !== 'recruiting') break;
      }
      if (state.turnStep === 'selection') {
        state = dispatch(state, { type: 'PROCEED_TO_FORMING' });
      }
      if (state.turnStep === 'forming' && !state.pendingDecision) {
        const prevIndex = state.currentPlayerIndex;
        const next = dispatch(state, { type: 'END_TURN' });
        expect(next.currentPlayerIndex).toBe((prevIndex + 1) % state.players.length);
        expect(next.turnStep).toBe('recruiting');
        expect(next.actionsUsed).toBe(0);
      }
    });
  });

  describe('Discard / selection', () => {
    it('discard removes card from hand and puts in used cards', () => {
      let state = createGame();
      // Risky recruit to get a card
      while (state.turnStep === 'recruiting' && state.actionsRemaining > 0 && !state.pendingDecision) {
        const topCard = state.deck[0];
        if (topCard.type === 'zaptie') {
          // Scout instead
          const idx = findFaceDownIndex(state);
          if (idx === -1) break;
          state = dispatch(state, { type: 'SCOUT', fieldIndex: idx });
        } else {
          state = dispatch(state, { type: 'RISKY_RECRUIT' });
        }
      }

      if (state.turnStep === 'selection' && currentPlayer(state).hand.length > 0 && !state.pendingDecision) {
        const cardToDiscard = currentPlayer(state).hand[0];
        const handBefore = currentPlayer(state).hand.length;
        const next = dispatch(state, { type: 'DISCARD_CARD', cardId: cardToDiscard.id });
        expect(next.players[next.currentPlayerIndex].hand.length).toBe(handBefore - 1);
        expect(next.usedCards.some(c => c.id === cardToDiscard.id)).toBe(true);
      }
    });
  });

  describe('Card conservation', () => {
    it('total card count remains constant after scout', () => {
      const state = createGame();
      const totalBefore = countAllCards(state);
      const idx = findFaceDownIndex(state);
      const next = dispatch(state, { type: 'SCOUT', fieldIndex: idx });
      expect(countAllCards(next)).toBe(totalBefore);
    });

    it('total card count remains constant after safe recruit', () => {
      let state = createGame();
      const totalBefore = countAllCards(state);
      // Scout to reveal a card
      const idx = findFaceDownIndex(state);
      state = dispatch(state, { type: 'SCOUT', fieldIndex: idx });

      if (state.field[idx]?.type !== 'zaptie' && state.fieldFaceUp[idx] && state.actionsRemaining > 0 && !state.pendingDecision) {
        const next = dispatch(state, { type: 'SAFE_RECRUIT', fieldIndex: idx });
        expect(countAllCards(next)).toBe(totalBefore);
      }
    });

    it('total card count remains constant after risky recruit', () => {
      const state = createGame();
      const totalBefore = countAllCards(state);
      const next = dispatch(state, { type: 'RISKY_RECRUIT' });
      expect(countAllCards(next)).toBe(totalBefore);
    });
  });

  describe('Zaptie encounter', () => {
    it('encountering zaptie when secret reveals committee', () => {
      let state = createGame();
      expect(currentPlayer(state).isRevealed).toBe(false);

      // Scout cards until we find a zaptie
      let hitZaptie = false;
      for (let i = 0; i < 16; i++) {
        const idx = findFaceDownIndex(state);
        if (idx === -1) break;
        const card = state.field[idx];
        state = dispatch(state, { type: 'SCOUT', fieldIndex: idx });
        if (card.type === 'zaptie') {
          hitZaptie = true;
          break;
        }
        if (state.pendingDecision || state.turnStep !== 'recruiting') break;
      }

      if (hitZaptie) {
        // Player should now be revealed (or have a pending decision about it)
        const player = state.players[0]; // Player 0 was current
        expect(player.isRevealed || state.pendingDecision !== undefined).toBe(true);
      }
    });

    it('no zaptie ever ends up in player hand', () => {
      let state = createGame();
      // Do a bunch of risky recruits
      for (let turn = 0; turn < 4; turn++) {
        while (state.turnStep === 'recruiting' && state.actionsRemaining > 0 && !state.pendingDecision) {
          state = dispatch(state, { type: 'RISKY_RECRUIT' });
        }
        // Resolve any pending decisions with acknowledge
        if (state.pendingDecision?.kind === 'acknowledge') {
          state = dispatch(state, { type: 'RESOLVE_DECISION', decisionId: state.pendingDecision.id });
        }
        // Move through phases
        if (state.turnStep === 'selection' && !state.pendingDecision) {
          state = dispatch(state, { type: 'PROCEED_TO_FORMING' });
        }
        if ((state.turnStep === 'forming' || state.turnStep === 'end') && !state.pendingDecision) {
          state = dispatch(state, { type: 'END_TURN' });
        }
        if (state.phase === 'scoring') break;
      }

      // Invariant: no zaptie in any player's hand
      for (const p of state.players) {
        expect(p.hand.every(c => c.type !== 'zaptie')).toBe(true);
      }
    });
  });

  describe('Group formation', () => {
    it('can form a group by same contribution and improve stat', () => {
      // Create a game and manually set up a player's hand for testing
      let state = createGame();

      // Manually give player hayduts with same contribution for a valid group
      const naborHayduts = state.deck
        .filter(c => c.type === 'haydut' && c.contribution === 'nabor')
        .slice(0, 3);

      if (naborHayduts.length >= 2) {
        // Inject cards into hand and set state to forming
        const player = { ...state.players[0], hand: [...naborHayduts] };
        state = {
          ...state,
          players: [player, ...state.players.slice(1)],
          turnStep: 'forming' as const,
          selectedCards: naborHayduts.map(c => c.id),
          canFormGroup: true,
          actionsRemaining: 0,
          actionsUsed: 4,
        };

        const totalStrength = naborHayduts.reduce((s, c) => s + (c.strength ?? 0), 0);
        if (totalStrength >= 4) { // cost to reach nabor 5
          const next = dispatch(state, { type: 'FORM_GROUP_IMPROVE_STAT', statType: 'nabor' });
          expect(next.players[0].stats.nabor).toBeGreaterThan(4);
          expect(next.canFormGroup).toBe(false);
          expect(next.selectedCards.length).toBe(0);
        }
      }
    });

    it('can form a group by same color', () => {
      let state = createGame();

      // Get hayduts of same color, different contributions
      const greenHayduts = state.deck
        .filter(c => c.type === 'haydut' && c.color === 'green')
        .slice(0, 3);

      if (greenHayduts.length >= 2) {
        const player = { ...state.players[0], hand: [...greenHayduts] };
        state = {
          ...state,
          players: [player, ...state.players.slice(1)],
          turnStep: 'forming' as const,
          selectedCards: greenHayduts.map(c => c.id),
          canFormGroup: true,
          actionsRemaining: 0,
          actionsUsed: 4,
        };

        // Pick contribution that at least one card has
        const statType = greenHayduts[0].contribution!;
        const totalStrength = greenHayduts.reduce((s, c) => s + (c.strength ?? 0), 0);
        if (totalStrength >= 4) {
          const next = dispatch(state, { type: 'FORM_GROUP_IMPROVE_STAT', statType });
          expect(next.players[0].stats[statType]).toBeGreaterThan(4);
        }
      }
    });

    it('raising a voyvoda from field works', () => {
      let state = createGame();

      // Find a voyvoda on the field
      const voyIndex = state.field.findIndex(c => c.type === 'voyvoda');
      if (voyIndex !== -1) {
        const voyCard = state.field[voyIndex];
        const cost = voyCard.cost ?? 4;

        // Create enough hayduts with total strength >= cost
        const hayduts = state.deck
          .filter(c => c.type === 'haydut' && c.contribution === 'nabor')
          .slice(0, Math.ceil(cost / 2));

        const totalStrength = hayduts.reduce((s, c) => s + (c.strength ?? 0), 0);
        if (totalStrength >= cost && hayduts.length >= 2) {
          const player = { ...state.players[0], hand: [...hayduts] };
          state = {
            ...state,
            players: [player, ...state.players.slice(1)],
            turnStep: 'forming' as const,
            fieldFaceUp: state.fieldFaceUp.map((v, i) => i === voyIndex ? true : v),
            selectedCards: hayduts.map(c => c.id),
            canFormGroup: true,
            actionsRemaining: 0,
            actionsUsed: 4,
          };

          const next = dispatch(state, { type: 'FORM_GROUP_RAISE_CARD', targetCardId: voyCard.id });
          expect(next.players[0].raisedVoyvodas.some(c => c.id === voyCard.id)).toBe(true);
          expect(next.canFormGroup).toBe(false);
        }
      }
    });
  });

  describe('Scoring', () => {
    it('calculates base scoring correctly', () => {
      const state = createGame();
      // Manually set up players with known stats for scoring
      const players = state.players.map((p, i) => ({
        ...p,
        stats: {
          nabor: i === 0 ? 8 : 6,
          deynost: i === 0 ? 7 : 5,
          boyna: i === 0 ? 6 : 7,
        },
      }));

      const scores = calculateScores(players);
      expect(scores.length).toBe(2);

      // Player 0: stats = 8+7+6 = 21, leads nabor (+5) and deynost (+5)
      expect(scores[0].statTotal).toBe(21);
      expect(scores[0].leadershipBonus).toBe(10); // nabor + deynost

      // Player 1: stats = 6+5+7 = 18, leads boyna (+5)
      expect(scores[1].statTotal).toBe(18);
      expect(scores[1].leadershipBonus).toBe(5); // boyna only
    });

    it('ties in leadership give bonus to all leaders', () => {
      const state = createGame();
      const players = state.players.map(p => ({
        ...p,
        stats: { nabor: 7, deynost: 7, boyna: 7 },
      }));

      const scores = calculateScores(players);
      // Both players tie on all stats — both get leadership for all three
      expect(scores[0].leadershipBonus).toBe(15);
      expect(scores[1].leadershipBonus).toBe(15);
    });

    it('includes voyvoda points in total', () => {
      const state = createGame();
      const voyCard: Card = {
        id: 'voy_test',
        type: 'voyvoda',
        name: 'Войвода',
        cost: 4,
        chetaPoints: 5,
      };

      const players = state.players.map((p, i) => ({
        ...p,
        stats: { nabor: 4, deynost: 4, boyna: 4 },
        raisedVoyvodas: i === 0 ? [voyCard] : [],
      }));

      const scores = calculateScores(players);
      expect(scores[0].voyvodaPoints).toBe(5);
      expect(scores[0].total).toBeGreaterThan(scores[1].total);
    });
  });

  describe('Reducer guards', () => {
    it('blocks non-decision actions when a decision is pending', () => {
      let state = createGame();
      // Manually set a pending decision
      state = {
        ...state,
        pendingDecision: {
          id: 'test-decision',
          kind: 'acknowledge',
          ownerPlayerIndex: 0,
          prompt: 'Test',
        },
      };

      const next = dispatch(state, { type: 'SCOUT', fieldIndex: 0 });
      // Should be unchanged
      expect(next.actionsUsed).toBe(state.actionsUsed);
    });

    it('allows RESOLVE_DECISION when decision is pending', () => {
      let state = createGame();
      state = {
        ...state,
        pendingDecision: {
          id: 'test-decision',
          kind: 'acknowledge',
          ownerPlayerIndex: 0,
          prompt: 'Test',
        },
      };

      const next = dispatch(state, { type: 'RESOLVE_DECISION', decisionId: 'test-decision' });
      // Should have cleared the decision
      expect(next.pendingDecision).toBeUndefined();
    });

    it('blocks actions in scoring phase', () => {
      let state = createGame();
      state = { ...state, phase: 'scoring' };

      const next = dispatch(state, { type: 'SCOUT', fieldIndex: 0 });
      expect(next).toEqual(state);
    });
  });

  describe('Multi-turn scenario', () => {
    it('plays through multiple turns without errors', () => {
      let state = createGame(3, 'short');
      const initialTotal = countAllCards(state);
      let turnsCompleted = 0;

      // Play up to 12 turns (4 per player in short game)
      for (let t = 0; t < 12 && state.phase === 'playing'; t++) {
        // Recruiting: scout all available actions
        while (state.turnStep === 'recruiting' && state.actionsRemaining > 0 && !state.pendingDecision) {
          const faceDownIdx = findFaceDownIndex(state);
          if (faceDownIdx !== -1) {
            state = dispatch(state, { type: 'SCOUT', fieldIndex: faceDownIdx });
          } else {
            // All face up, try risky recruit
            state = dispatch(state, { type: 'RISKY_RECRUIT' });
          }
        }

        // Resolve any pending decisions
        while (state.pendingDecision) {
          if (state.pendingDecision.kind === 'acknowledge') {
            state = dispatch(state, {
              type: 'RESOLVE_DECISION',
              decisionId: state.pendingDecision.id,
            });
          } else if (state.pendingDecision.kind === 'trait_choice') {
            state = dispatch(state, {
              type: 'RESOLVE_DECISION',
              decisionId: state.pendingDecision.id,
              traitId: state.pendingDecision.options[0],
            });
          } else {
            // For other decisions, just try to proceed
            break;
          }
        }

        // Selection: move to forming
        if (state.turnStep === 'selection' && !state.pendingDecision) {
          state = dispatch(state, { type: 'PROCEED_TO_FORMING' });
        }

        // Forming: just end turn (no group formation in this simple scenario)
        if ((state.turnStep === 'forming' || state.turnStep === 'end') && !state.pendingDecision && !state.defeatContext) {
          state = dispatch(state, { type: 'END_TURN' });
          turnsCompleted++;
        }

        // Card conservation invariant
        expect(countAllCards(state)).toBe(initialTotal);

        // No zaptie in hand invariant
        for (const p of state.players) {
          expect(p.hand.every(c => c.type !== 'zaptie')).toBe(true);
        }
      }

      expect(turnsCompleted).toBeGreaterThan(0);
    });
  });
});
