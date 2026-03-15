import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../factory';
import { buildPlayerView } from '../projections';
import { isHiddenHand } from '../types/player-view';
import { gameReducer } from '../engine/reducer';
import type { GameState } from '../types/state';

const SEED = 42;

function makeState(): GameState {
  return createInitialGameState(['Алеко', 'Бойко', 'Васил'], 'medium', SEED);
}

function stateWithHands(): GameState {
  let state = makeState();
  // Scout + safe recruit to give player 0 some cards
  state = gameReducer(state, { type: 'SCOUT', fieldIndex: 0 });
  // Find a face-up non-zaptie card to safely recruit
  const faceUpIdx = state.fieldFaceUp.findIndex((up, i) => up && state.field[i].type !== 'zaptie');
  if (faceUpIdx >= 0) {
    state = gameReducer(state, { type: 'SAFE_RECRUIT', fieldIndex: faceUpIdx });
  }
  return state;
}

describe('buildPlayerView', () => {
  it('shows own hand as full Card[]', () => {
    const state = stateWithHands();
    const view = buildPlayerView(state, 0);
    const ownPlayer = view.players[0];

    expect(Array.isArray(ownPlayer.hand)).toBe(true);
    expect(isHiddenHand(ownPlayer.hand)).toBe(false);
    if (Array.isArray(ownPlayer.hand)) {
      expect(ownPlayer.hand).toEqual(state.players[0].hand);
    }
  });

  it('hides other players hands as HiddenHand', () => {
    const state = stateWithHands();
    const view = buildPlayerView(state, 0);

    for (let i = 1; i < view.players.length; i++) {
      const otherPlayer = view.players[i];
      expect(isHiddenHand(otherPlayer.hand)).toBe(true);
      if (isHiddenHand(otherPlayer.hand)) {
        expect(otherPlayer.hand.count).toBe(state.players[i].hand.length);
      }
    }
  });

  it('different viewer sees different hand visibility', () => {
    const state = stateWithHands();
    const view0 = buildPlayerView(state, 0);
    const view1 = buildPlayerView(state, 1);

    // Player 0 view: own hand visible, player 1 hidden
    expect(Array.isArray(view0.players[0].hand)).toBe(true);
    expect(isHiddenHand(view0.players[1].hand)).toBe(true);

    // Player 1 view: player 0 hidden, own hand visible
    expect(isHiddenHand(view1.players[0].hand)).toBe(true);
    expect(Array.isArray(view1.players[1].hand)).toBe(true);
  });

  it('replaces deck with deckCount', () => {
    const state = makeState();
    const view = buildPlayerView(state, 0);

    expect(view.deckCount).toBe(state.deck.length);
    expect((view as any).deck).toBeUndefined();
  });

  it('replaces usedCards with usedCardsCount', () => {
    const state = makeState();
    const view = buildPlayerView(state, 0);

    expect(view.usedCardsCount).toBe(state.usedCards.length);
    expect((view as any).usedCards).toBeUndefined();
  });

  it('omits seed', () => {
    const state = makeState();
    const view = buildPlayerView(state, 0);

    expect((view as any).seed).toBeUndefined();
  });

  it('masks face-down field cards as null', () => {
    const state = makeState();
    // All cards start face-down
    const view = buildPlayerView(state, 0);

    for (let i = 0; i < view.field.length; i++) {
      if (state.fieldFaceUp[i]) {
        expect(view.field[i]).not.toBeNull();
      } else {
        expect(view.field[i]).toBeNull();
      }
    }
  });

  it('shows face-up field cards as full Card objects', () => {
    let state = makeState();
    // Scout to reveal a card
    state = gameReducer(state, { type: 'SCOUT', fieldIndex: 0 });
    const view = buildPlayerView(state, 0);

    // Index 0 should be face-up and visible
    expect(state.fieldFaceUp[0]).toBe(true);
    expect(view.field[0]).not.toBeNull();
    expect(view.field[0]!.id).toBe(state.field[0].id);
  });

  it('masks face-down sideField cards as null', () => {
    const state = makeState();
    // sideField starts empty, but test with a state that has sideField entries
    const stateWithSide: GameState = {
      ...state,
      sideField: state.field.slice(0, 2),
      sideFieldFaceUp: [true, false],
    };
    const view = buildPlayerView(stateWithSide, 0);

    expect(view.sideField[0]).not.toBeNull();
    expect(view.sideField[1]).toBeNull();
  });

  it('keeps fieldFaceUp arrays unchanged', () => {
    const state = makeState();
    const view = buildPlayerView(state, 0);

    expect(view.fieldFaceUp).toEqual(state.fieldFaceUp);
    expect(view.sideFieldFaceUp).toEqual(state.sideFieldFaceUp);
  });

  it('shows full pendingDecision to owner', () => {
    const state: GameState = {
      ...makeState(),
      pendingDecision: {
        id: 'test-d',
        kind: 'card_choice',
        ownerPlayerIndex: 0,
        prompt: 'Choose cards',
        purpose: 'petko_keep',
        selectableCardIds: ['card-1', 'card-2'],
        minChoices: 1,
        maxChoices: 2,
        context: { source: 'scout' },
      },
    };
    const view = buildPlayerView(state, 0);

    expect(view.pendingDecision).toBeDefined();
    expect((view.pendingDecision as any).selectableCardIds).toEqual(['card-1', 'card-2']);
    expect((view.pendingDecision as any).purpose).toBe('petko_keep');
  });

  it('masks pendingDecision for non-owners', () => {
    const state: GameState = {
      ...makeState(),
      pendingDecision: {
        id: 'test-d',
        kind: 'card_choice',
        ownerPlayerIndex: 0,
        prompt: 'Choose cards',
        purpose: 'petko_keep',
        selectableCardIds: ['card-1', 'card-2'],
        minChoices: 1,
        maxChoices: 2,
        context: { source: 'scout' },
      },
    };
    const view = buildPlayerView(state, 1);

    expect(view.pendingDecision).toBeDefined();
    expect(view.pendingDecision!.id).toBe('test-d');
    expect(view.pendingDecision!.kind).toBe('card_choice');
    expect(view.pendingDecision!.ownerPlayerIndex).toBe(0);
    expect(view.pendingDecision!.prompt).toBe('Choose cards');
    // Should NOT have selectableCardIds, purpose, etc.
    expect((view.pendingDecision as any).selectableCardIds).toBeUndefined();
    expect((view.pendingDecision as any).purpose).toBeUndefined();
    expect((view.pendingDecision as any).context).toBeUndefined();
  });

  it('passes through zaptieTrigger and panayotTrigger', () => {
    const state: GameState = {
      ...makeState(),
      zaptieTrigger: { wasSecret: true, isDefeated: false, zaptieCards: [] },
      panayotTrigger: { beneficiaryPlayerIndex: 1, defeatedPlayerIndex: 0, availableCards: [] },
    };
    const view = buildPlayerView(state, 0);

    expect(view.zaptieTrigger).toEqual(state.zaptieTrigger);
    expect(view.panayotTrigger).toEqual(state.panayotTrigger);
  });

  it('strips internal player flags', () => {
    const state = makeState();
    const view = buildPlayerView(state, 0);

    for (const player of view.players) {
      expect((player as any).zaptieTurnIgnored).toBeUndefined();
      expect((player as any).dyadoIlyoActive).toBeUndefined();
    }
  });

  it('omits pendingGroup and defeatContext', () => {
    const state: GameState = {
      ...makeState(),
      pendingGroup: {
        selectedCardIds: [], haydutCardIds: [], purpose: 'improve_stat',
        effectiveStrength: 0, traitBonus: 0,
      },
      defeatContext: {
        source: 'scout', defeatedPlayerIndex: 0,
        popAvailable: false, petkoAvailable: false, remainingCardIds: [],
      },
    };
    const view = buildPlayerView(state, 0);

    expect((view as any).pendingGroup).toBeUndefined();
    expect((view as any).defeatContext).toBeUndefined();
  });

  it('passes through game flow fields', () => {
    const state = makeState();
    const view = buildPlayerView(state, 0);

    expect(view.phase).toBe(state.phase);
    expect(view.turnStep).toBe(state.turnStep);
    expect(view.currentPlayerIndex).toBe(state.currentPlayerIndex);
    expect(view.actionsRemaining).toBe(state.actionsRemaining);
    expect(view.message).toBe(state.message);
    expect(view.revision).toBe(state.revision);
    expect(view.popHaritonForming).toBe(state.popHaritonForming);
    expect(view.sofroniyAbilityUsed).toBe(state.sofroniyAbilityUsed);
  });
});
