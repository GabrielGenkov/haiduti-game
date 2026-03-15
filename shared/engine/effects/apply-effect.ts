import { GameState } from '../../types/state';
import { Card } from '../../types/card';
import {
  Effect,
  MoveCardsEffect,
  SetFieldVisibilityEffect,
  SetStatEffect,
  UpdatePlayerEffect,
  AddTraitsEffect,
  SetTurnFlowEffect,
  PushNotificationEffect,
  ReplaceDeckEffect,
  ZoneRef,
} from './types';

// ── Zone accessors ───────────────────────────────────────────

function getCardsInZone(state: GameState, ref: ZoneRef): Card[] {
  switch (ref.zone) {
    case 'deck': return state.deck;
    case 'field': return state.field;
    case 'sideField': return state.sideField;
    case 'usedCards': return state.usedCards;
    case 'hand': return state.players[ref.playerIndex].hand;
    case 'raisedVoyvodas': return state.players[ref.playerIndex].raisedVoyvodas;
    case 'raisedDeytsi': return state.players[ref.playerIndex].raisedDeytsi;
  }
}

function removeCardsFromZone(state: GameState, ref: ZoneRef, cardIds: Set<string>): GameState {
  switch (ref.zone) {
    case 'deck':
      return { ...state, deck: state.deck.filter(c => !cardIds.has(c.id)) };
    case 'field': {
      const indices: number[] = [];
      state.field.forEach((c, i) => { if (cardIds.has(c.id)) indices.push(i); });
      const indexSet = new Set(indices);
      return {
        ...state,
        field: state.field.filter((_, i) => !indexSet.has(i)),
        fieldFaceUp: state.fieldFaceUp.filter((_, i) => !indexSet.has(i)),
      };
    }
    case 'sideField': {
      const indices: number[] = [];
      state.sideField.forEach((c, i) => { if (cardIds.has(c.id)) indices.push(i); });
      const indexSet = new Set(indices);
      return {
        ...state,
        sideField: state.sideField.filter((_, i) => !indexSet.has(i)),
        sideFieldFaceUp: state.sideFieldFaceUp.filter((_, i) => !indexSet.has(i)),
      };
    }
    case 'usedCards':
      return { ...state, usedCards: state.usedCards.filter(c => !cardIds.has(c.id)) };
    case 'hand':
      return {
        ...state,
        players: state.players.map((p, i) =>
          i === ref.playerIndex ? { ...p, hand: p.hand.filter(c => !cardIds.has(c.id)) } : p
        ),
      };
    case 'raisedVoyvodas':
      return {
        ...state,
        players: state.players.map((p, i) =>
          i === ref.playerIndex ? { ...p, raisedVoyvodas: p.raisedVoyvodas.filter(c => !cardIds.has(c.id)) } : p
        ),
      };
    case 'raisedDeytsi':
      return {
        ...state,
        players: state.players.map((p, i) =>
          i === ref.playerIndex ? { ...p, raisedDeytsi: p.raisedDeytsi.filter(c => !cardIds.has(c.id)) } : p
        ),
      };
  }
}

function addCardsToZone(state: GameState, ref: ZoneRef, cards: Card[], position: 'start' | 'end' = 'end'): GameState {
  const prepend = position === 'start';
  switch (ref.zone) {
    case 'deck':
      return { ...state, deck: prepend ? [...cards, ...state.deck] : [...state.deck, ...cards] };
    case 'field':
      return prepend
        ? {
          ...state,
          field: [...cards, ...state.field],
          fieldFaceUp: [...new Array(cards.length).fill(false), ...state.fieldFaceUp],
        }
        : {
          ...state,
          field: [...state.field, ...cards],
          fieldFaceUp: [...state.fieldFaceUp, ...new Array(cards.length).fill(false)],
        };
    case 'sideField':
      return prepend
        ? {
          ...state,
          sideField: [...cards, ...state.sideField],
          sideFieldFaceUp: [...new Array(cards.length).fill(false), ...state.sideFieldFaceUp],
        }
        : {
          ...state,
          sideField: [...state.sideField, ...cards],
          sideFieldFaceUp: [...state.sideFieldFaceUp, ...new Array(cards.length).fill(false)],
        };
    case 'usedCards':
      return { ...state, usedCards: prepend ? [...cards, ...state.usedCards] : [...state.usedCards, ...cards] };
    case 'hand':
      return {
        ...state,
        players: state.players.map((p, i) =>
          i === ref.playerIndex ? { ...p, hand: prepend ? [...cards, ...p.hand] : [...p.hand, ...cards] } : p
        ),
      };
    case 'raisedVoyvodas':
      return {
        ...state,
        players: state.players.map((p, i) =>
          i === ref.playerIndex ? { ...p, raisedVoyvodas: prepend ? [...cards, ...p.raisedVoyvodas] : [...p.raisedVoyvodas, ...cards] } : p
        ),
      };
    case 'raisedDeytsi':
      return {
        ...state,
        players: state.players.map((p, i) =>
          i === ref.playerIndex ? { ...p, raisedDeytsi: prepend ? [...cards, ...p.raisedDeytsi] : [...p.raisedDeytsi, ...cards] } : p
        ),
      };
  }
}

// ── Effect appliers ──────────────────────────────────────────

function applyMoveCards(state: GameState, effect: MoveCardsEffect): GameState {
  const cardIds = new Set(effect.cardIds);
  const cards = getCardsInZone(state, effect.from).filter(c => cardIds.has(c.id));
  let newState = removeCardsFromZone(state, effect.from, cardIds);
  newState = addCardsToZone(newState, effect.to, cards, effect.position ?? 'end');
  return newState;
}

function applySetFieldVisibility(state: GameState, effect: SetFieldVisibilityEffect): GameState {
  if (effect.fieldZone === 'field') {
    if (effect.indices === 'all') {
      return { ...state, fieldFaceUp: state.fieldFaceUp.map(() => effect.visible) };
    }
    const indexSet = new Set(effect.indices);
    return {
      ...state,
      fieldFaceUp: state.fieldFaceUp.map((v, i) => indexSet.has(i) ? effect.visible : v),
    };
  } else {
    if (effect.indices === 'all') {
      return { ...state, sideFieldFaceUp: state.sideFieldFaceUp.map(() => effect.visible) };
    }
    const indexSet = new Set(effect.indices);
    return {
      ...state,
      sideFieldFaceUp: state.sideFieldFaceUp.map((v, i) => indexSet.has(i) ? effect.visible : v),
    };
  }
}

function applySetStat(state: GameState, effect: SetStatEffect): GameState {
  return {
    ...state,
    players: state.players.map((p, i) =>
      i === effect.playerIndex
        ? { ...p, stats: { ...p.stats, [effect.stat]: effect.value } }
        : p
    ),
  };
}

function applyUpdatePlayer(state: GameState, effect: UpdatePlayerEffect): GameState {
  return {
    ...state,
    players: state.players.map((p, i) =>
      i === effect.playerIndex ? { ...p, ...effect.updates } : p
    ),
  };
}

function applyAddTraits(state: GameState, effect: AddTraitsEffect): GameState {
  return {
    ...state,
    players: state.players.map((p, i) =>
      i === effect.playerIndex
        ? { ...p, traits: [...new Set([...p.traits, ...effect.traitIds])] }
        : p
    ),
  };
}

function applySetTurnFlow(state: GameState, effect: SetTurnFlowEffect): GameState {
  return { ...state, ...effect.updates };
}

function applyPushNotification(state: GameState, effect: PushNotificationEffect): GameState {
  return {
    ...state,
    notifications: [
      ...state.notifications,
      { id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, kind: effect.kind, text: effect.text },
    ],
  };
}

function applyReplaceDeck(state: GameState, effect: ReplaceDeckEffect): GameState {
  return {
    ...state,
    deck: effect.newDeck,
    usedCards: effect.clearUsedCards ? [] : state.usedCards,
  };
}

// ── Main applier ─────────────────────────────────────────────

export function applyEffect(state: GameState, effect: Effect): GameState {
  switch (effect.type) {
    case 'MOVE_CARDS': return applyMoveCards(state, effect);
    case 'SET_FIELD_VISIBILITY': return applySetFieldVisibility(state, effect);
    case 'SET_STAT': return applySetStat(state, effect);
    case 'UPDATE_PLAYER': return applyUpdatePlayer(state, effect);
    case 'ADD_TRAITS': return applyAddTraits(state, effect);
    case 'SET_TURN_FLOW': return applySetTurnFlow(state, effect);
    case 'SET_MESSAGE': return { ...state, message: effect.message };
    case 'PUSH_NOTIFICATION': return applyPushNotification(state, effect);
    case 'SET_DECISION': return { ...state, pendingDecision: effect.decision };
    case 'SET_PENDING_GROUP': return { ...state, pendingGroup: effect.pendingGroup };
    case 'SET_ZAPTIE_TRIGGER': return { ...state, zaptieTrigger: effect.zaptieTrigger };
    case 'SET_PANAYOT_TRIGGER': return { ...state, panayotTrigger: effect.panayotTrigger };
    case 'SET_DEFEAT_CONTEXT': return { ...state, defeatContext: effect.defeatContext };
    case 'REPLACE_DECK': return applyReplaceDeck(state, effect);
  }
}

export function applyEffects(state: GameState, effects: Effect[]): GameState {
  if (effects.length === 0) return state;
  return effects.reduce(applyEffect, state);
}
