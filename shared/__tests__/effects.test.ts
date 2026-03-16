import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../factory';
import { applyEffect, applyEffects } from '../engine/effects/apply-effect';
import type { Effect } from '../engine/effects/types';
import type { GameState } from '../types/state';

const SEED = 42;

function makeState(): GameState {
  return createInitialGameState(['Алеко', 'Бойко'], 'medium', SEED);
}

// ── MOVE_CARDS ───────────────────────────────────────────────

describe('MOVE_CARDS', () => {
  it('moves card from deck to hand', () => {
    const state = makeState();
    const cardId = state.deck[0].id;
    const effect: Effect = {
      type: 'MOVE_CARDS',
      cardIds: [cardId],
      from: { zone: 'deck' },
      to: { zone: 'hand', playerIndex: 0 },
    };
    const next = applyEffect(state, effect);
    expect(next.deck.length).toBe(state.deck.length - 1);
    expect(next.players[0].hand.length).toBe(state.players[0].hand.length + 1);
    expect(next.players[0].hand.some(c => c.id === cardId)).toBe(true);
    expect(next.deck.some(c => c.id === cardId)).toBe(false);
  });

  it('moves card from field to hand and removes fieldFaceUp entry', () => {
    const state = makeState();
    const fieldIndex = 0;
    const cardId = state.field[fieldIndex].id;
    const effect: Effect = {
      type: 'MOVE_CARDS',
      cardIds: [cardId],
      from: { zone: 'field' },
      to: { zone: 'hand', playerIndex: 0 },
    };
    const next = applyEffect(state, effect);
    expect(next.field.length).toBe(state.field.length);
    expect(next.field[fieldIndex]).toBeNull();
    expect(next.fieldFaceUp.length).toBe(state.fieldFaceUp.length);
    expect(next.players[0].hand.some(c => c.id === cardId)).toBe(true);
  });

  it('moves card from hand to usedCards', () => {
    const state = makeState();
    // Give player a card first
    const card = state.deck[0];
    const withCard = applyEffect(state, {
      type: 'MOVE_CARDS', cardIds: [card.id],
      from: { zone: 'deck' }, to: { zone: 'hand', playerIndex: 0 },
    });
    const effect: Effect = {
      type: 'MOVE_CARDS',
      cardIds: [card.id],
      from: { zone: 'hand', playerIndex: 0 },
      to: { zone: 'usedCards' },
    };
    const next = applyEffect(withCard, effect);
    expect(next.players[0].hand.some(c => c.id === card.id)).toBe(false);
    expect(next.usedCards.some(c => c.id === card.id)).toBe(true);
  });

  it('moves card from field to raisedVoyvodas and syncs fieldFaceUp', () => {
    const state = makeState();
    const voyvoda = state.field.find(c => c.type === 'voyvoda');
    if (!voyvoda) return; // skip if no voyvoda in field
    const effect: Effect = {
      type: 'MOVE_CARDS',
      cardIds: [voyvoda.id],
      from: { zone: 'field' },
      to: { zone: 'raisedVoyvodas', playerIndex: 0 },
    };
    const next = applyEffect(state, effect);
    expect(next.field.length).toBe(state.field.length);
    expect(next.field.find(c => c !== null && c.id === voyvoda.id)).toBeUndefined();
    expect(next.fieldFaceUp.length).toBe(state.fieldFaceUp.length);
    expect(next.players[0].raisedVoyvodas.some(c => c.id === voyvoda.id)).toBe(true);
  });

  it('moves card between players (hand to hand)', () => {
    const state = makeState();
    // Give player 0 a card first
    const card = state.deck[0];
    const withCard = applyEffect(state, {
      type: 'MOVE_CARDS', cardIds: [card.id],
      from: { zone: 'deck' }, to: { zone: 'hand', playerIndex: 0 },
    });
    const effect: Effect = {
      type: 'MOVE_CARDS',
      cardIds: [card.id],
      from: { zone: 'hand', playerIndex: 0 },
      to: { zone: 'hand', playerIndex: 1 },
    };
    const next = applyEffect(withCard, effect);
    expect(next.players[0].hand.some(c => c.id === card.id)).toBe(false);
    expect(next.players[1].hand.some(c => c.id === card.id)).toBe(true);
  });

  it('adds card to field with new fieldFaceUp entry', () => {
    const state = makeState();
    const cardId = state.deck[0].id;
    const effect: Effect = {
      type: 'MOVE_CARDS',
      cardIds: [cardId],
      from: { zone: 'deck' },
      to: { zone: 'field' },
    };
    const next = applyEffect(state, effect);
    expect(next.field.length).toBe(state.field.length + 1);
    expect(next.fieldFaceUp.length).toBe(state.fieldFaceUp.length + 1);
    // New card enters face-down
    expect(next.fieldFaceUp[next.fieldFaceUp.length - 1]).toBe(false);
  });

  it('adds card to sideField with new sideFieldFaceUp entry', () => {
    const state = makeState();
    const cardId = state.deck[0].id;
    const effect: Effect = {
      type: 'MOVE_CARDS',
      cardIds: [cardId],
      from: { zone: 'deck' },
      to: { zone: 'sideField' },
    };
    const next = applyEffect(state, effect);
    expect(next.sideField.length).toBe(state.sideField.length + 1);
    expect(next.sideFieldFaceUp.length).toBe(state.sideFieldFaceUp.length + 1);
    expect(next.sideFieldFaceUp[next.sideFieldFaceUp.length - 1]).toBe(false);
  });

  it('moves multiple cards at once', () => {
    const state = makeState();
    const ids = [state.deck[0].id, state.deck[1].id];
    const effect: Effect = {
      type: 'MOVE_CARDS',
      cardIds: ids,
      from: { zone: 'deck' },
      to: { zone: 'hand', playerIndex: 0 },
    };
    const next = applyEffect(state, effect);
    expect(next.deck.length).toBe(state.deck.length - 2);
    expect(next.players[0].hand.length).toBe(state.players[0].hand.length + 2);
  });
});

// ── SET_FIELD_VISIBILITY ─────────────────────────────────────

describe('SET_FIELD_VISIBILITY', () => {
  it('reveals specific field indices', () => {
    const state = makeState();
    const effect: Effect = {
      type: 'SET_FIELD_VISIBILITY',
      fieldZone: 'field',
      indices: [0, 2],
      visible: true,
    };
    const next = applyEffect(state, effect);
    expect(next.fieldFaceUp[0]).toBe(true);
    expect(next.fieldFaceUp[1]).toBe(false);
    expect(next.fieldFaceUp[2]).toBe(true);
  });

  it('hides all field cards', () => {
    const state = { ...makeState(), fieldFaceUp: new Array(16).fill(true) };
    const effect: Effect = {
      type: 'SET_FIELD_VISIBILITY',
      fieldZone: 'field',
      indices: 'all',
      visible: false,
    };
    const next = applyEffect(state, effect);
    expect(next.fieldFaceUp.every(v => v === false)).toBe(true);
  });

  it('works with sideField', () => {
    const state = {
      ...makeState(),
      sideField: [makeState().deck[0]],
      sideFieldFaceUp: [false],
    };
    const effect: Effect = {
      type: 'SET_FIELD_VISIBILITY',
      fieldZone: 'sideField',
      indices: [0],
      visible: true,
    };
    const next = applyEffect(state, effect);
    expect(next.sideFieldFaceUp[0]).toBe(true);
  });
});

// ── SET_STAT ─────────────────────────────────────────────────

describe('SET_STAT', () => {
  it('sets a player stat', () => {
    const state = makeState();
    const effect: Effect = {
      type: 'SET_STAT',
      playerIndex: 0,
      stat: 'nabor',
      value: 7,
    };
    const next = applyEffect(state, effect);
    expect(next.players[0].stats.nabor).toBe(7);
    // Other stats unchanged
    expect(next.players[0].stats.deynost).toBe(state.players[0].stats.deynost);
  });
});

// ── UPDATE_PLAYER ────────────────────────────────────────────

describe('UPDATE_PLAYER', () => {
  it('updates player flags', () => {
    const state = makeState();
    const effect: Effect = {
      type: 'UPDATE_PLAYER',
      playerIndex: 0,
      updates: { isRevealed: true, dyadoIlyoActive: true },
    };
    const next = applyEffect(state, effect);
    expect(next.players[0].isRevealed).toBe(true);
    expect(next.players[0].dyadoIlyoActive).toBe(true);
    // Other player unchanged
    expect(next.players[1].isRevealed).toBe(false);
  });
});

// ── ADD_TRAITS ───────────────────────────────────────────────

describe('ADD_TRAITS', () => {
  it('adds traits to player', () => {
    const state = makeState();
    const effect: Effect = {
      type: 'ADD_TRAITS',
      playerIndex: 0,
      traitIds: ['hristo_botev'],
    };
    const next = applyEffect(state, effect);
    expect(next.players[0].traits).toContain('hristo_botev');
  });

  it('deduplicates existing traits', () => {
    const state = makeState();
    // First add a trait
    const s1 = applyEffect(state, {
      type: 'ADD_TRAITS',
      playerIndex: 0,
      traitIds: ['hristo_botev'],
    });
    // Try to add it again
    const s2 = applyEffect(s1, {
      type: 'ADD_TRAITS',
      playerIndex: 0,
      traitIds: ['hristo_botev', 'vasil_levski'],
    });
    const botevCount = s2.players[0].traits.filter(t => t === 'hristo_botev').length;
    expect(botevCount).toBe(1);
    expect(s2.players[0].traits).toContain('vasil_levski');
  });
});

// ── SET_TURN_FLOW ────────────────────────────────────────────

describe('SET_TURN_FLOW', () => {
  it('updates multiple turn flow fields', () => {
    const state = makeState();
    const effect: Effect = {
      type: 'SET_TURN_FLOW',
      updates: {
        turnStep: 'selection',
        actionsRemaining: 0,
        canFormGroup: false,
      },
    };
    const next = applyEffect(state, effect);
    expect(next.turnStep).toBe('selection');
    expect(next.actionsRemaining).toBe(0);
    expect(next.canFormGroup).toBe(false);
  });
});

// ── SET_MESSAGE ──────────────────────────────────────────────

describe('SET_MESSAGE', () => {
  it('sets message', () => {
    const state = makeState();
    const next = applyEffect(state, { type: 'SET_MESSAGE', message: 'Hello' });
    expect(next.message).toBe('Hello');
  });
});

// ── PUSH_NOTIFICATION ────────────────────────────────────────

describe('PUSH_NOTIFICATION', () => {
  it('appends notification', () => {
    const state = makeState();
    const next = applyEffect(state, {
      type: 'PUSH_NOTIFICATION',
      text: 'Test notification',
      kind: 'info',
    });
    expect(next.notifications.length).toBe(state.notifications.length + 1);
    expect(next.notifications[next.notifications.length - 1].text).toBe('Test notification');
    expect(next.notifications[next.notifications.length - 1].kind).toBe('info');
  });
});

// ── SET_DECISION ─────────────────────────────────────────────

describe('SET_DECISION', () => {
  it('opens a decision', () => {
    const state = makeState();
    const decision = {
      id: 'test',
      kind: 'acknowledge' as const,
      ownerPlayerIndex: 0,
      prompt: 'OK?',
    };
    const next = applyEffect(state, { type: 'SET_DECISION', decision });
    expect(next.pendingDecision).toEqual(decision);
  });

  it('clears a decision', () => {
    const state = {
      ...makeState(),
      pendingDecision: {
        id: 'test',
        kind: 'acknowledge' as const,
        ownerPlayerIndex: 0,
        prompt: 'OK?',
      },
    };
    const next = applyEffect(state, { type: 'SET_DECISION', decision: undefined });
    expect(next.pendingDecision).toBeUndefined();
  });
});

// ── SET_ZAPTIE_TRIGGER ───────────────────────────────────────

describe('SET_ZAPTIE_TRIGGER', () => {
  it('sets and clears zaptieTrigger', () => {
    const state = makeState();
    const trigger = { wasSecret: true, isDefeated: false, zaptieCards: [] as any[] };
    const s1 = applyEffect(state, { type: 'SET_ZAPTIE_TRIGGER', zaptieTrigger: trigger });
    expect(s1.zaptieTrigger).toEqual(trigger);
    const s2 = applyEffect(s1, { type: 'SET_ZAPTIE_TRIGGER', zaptieTrigger: undefined });
    expect(s2.zaptieTrigger).toBeUndefined();
  });
});

// ── REPLACE_DECK ─────────────────────────────────────────────

describe('REPLACE_DECK', () => {
  it('replaces deck and optionally clears usedCards', () => {
    const state = { ...makeState(), usedCards: [makeState().deck[0]] };
    const newDeck = [makeState().deck[1], makeState().deck[2]];
    const next = applyEffect(state, {
      type: 'REPLACE_DECK',
      newDeck,
      clearUsedCards: true,
    });
    expect(next.deck).toEqual(newDeck);
    expect(next.usedCards).toHaveLength(0);
  });

  it('replaces deck without clearing usedCards', () => {
    const state = { ...makeState(), usedCards: [makeState().deck[0]] };
    const newDeck = [makeState().deck[1]];
    const next = applyEffect(state, {
      type: 'REPLACE_DECK',
      newDeck,
      clearUsedCards: false,
    });
    expect(next.deck).toEqual(newDeck);
    expect(next.usedCards).toHaveLength(1);
  });
});

// ── applyEffects ─────────────────────────────────────────────

describe('applyEffects', () => {
  it('empty effects returns same reference', () => {
    const state = makeState();
    const next = applyEffects(state, []);
    expect(next).toBe(state);
  });

  it('applies multiple effects sequentially', () => {
    const state = makeState();
    const effects: Effect[] = [
      { type: 'SET_MESSAGE', message: 'Step 1' },
      { type: 'SET_TURN_FLOW', updates: { turnStep: 'selection' } },
      { type: 'SET_MESSAGE', message: 'Step 2' },
    ];
    const next = applyEffects(state, effects);
    // Last SET_MESSAGE wins
    expect(next.message).toBe('Step 2');
    expect(next.turnStep).toBe('selection');
  });
});
