// ============================================================
// ХАЙДУТИ — Game Engine (State Reducer)
// Design: Хайдушка чета board-game aesthetic
// ============================================================

import {
  GameState,
  Card,
  Player,
  ContributionType,
  shuffle,
  getTotalZaptieBoyna,
  getGroupStrength,
  canFormGroupByContribution,
  canFormGroupByColor,
  getUpgradeCost,
  getNextStatValue,
  ALL_CARDS,
} from './gameData';

export type GameAction =
  | { type: 'SCOUT'; fieldIndex: number }
  | { type: 'SAFE_RECRUIT'; fieldIndex: number }
  | { type: 'RISKY_RECRUIT' }
  | { type: 'SKIP_ACTIONS' }
  | { type: 'DISCARD_CARD'; cardId: string }
  | { type: 'PROCEED_TO_FORMING' }
  | { type: 'TOGGLE_SELECT_CARD'; cardId: string }
  | { type: 'FORM_GROUP_IMPROVE_STAT'; statType: ContributionType }
  | { type: 'FORM_GROUP_RAISE_CARD'; targetCardId: string }
  | { type: 'SKIP_FORMING' }
  | { type: 'END_TURN' }
  | { type: 'ACKNOWLEDGE_ZAPTIE' }
  | { type: 'DISMISS_MESSAGE' };

function replenishField(state: GameState): GameState {
  let { field, fieldFaceUp, deck, usedCards, deckRotations } = state;
  
  const needed = 16 - field.length;
  if (needed <= 0) return state;

  // Add cards from deck
  const toAdd = Math.min(needed, deck.length);
  const newCards = deck.slice(0, toAdd);
  const newDeck = deck.slice(toAdd);
  
  field = [...field, ...newCards];
  fieldFaceUp = [...fieldFaceUp, ...new Array(toAdd).fill(false)];
  deck = newDeck;

  // Check if deck is exhausted (rotation)
  if (field.length < 16 && deck.length === 0) {
    deckRotations += 1;
    
    if (deckRotations >= state.maxRotations) {
      // Game ends
      return {
        ...state,
        field,
        fieldFaceUp,
        deck,
        usedCards,
        deckRotations,
        phase: 'scoring',
        message: 'Играта приключи! Изчисляване на точките...',
      };
    }

    // Reshuffle used cards into new deck
    let silverCards: Card[] = [];
    let goldCards: Card[] = [];
    
    if (deckRotations === 1) {
      // Silver diamond cards enter
      silverCards = ALL_CARDS.filter(c => c.silverDiamond && !c.goldDiamond);
    }
    if (deckRotations >= 2) {
      // Gold diamond cards enter
      goldCards = ALL_CARDS.filter(c => c.goldDiamond);
    }

    const newDeckCards = shuffle([...usedCards, ...silverCards, ...goldCards]);
    usedCards = [];
    
    const stillNeeded = 16 - field.length;
    const fromNewDeck = newDeckCards.slice(0, stillNeeded);
    const remainingDeck = newDeckCards.slice(stillNeeded);
    
    field = [...field, ...fromNewDeck];
    fieldFaceUp = [...fieldFaceUp, ...new Array(fromNewDeck.length).fill(false)];
    deck = remainingDeck;
  }

  return { ...state, field, fieldFaceUp, deck, usedCards, deckRotations };
}

function handleZaptieEncounter(state: GameState, zaptieCard: Card): GameState {
  const player = state.players[state.currentPlayerIndex];
  const wasSecret = !player.isRevealed;

  if (wasSecret) {
    // Reveal the committee
    const players = state.players.map((p, i) =>
      i === state.currentPlayerIndex ? { ...p, isRevealed: true } : p
    );
    return {
      ...state,
      players,
      actionsRemaining: 0,
      canFormGroup: false,
      zaptieTrigger: { wasSecret: true, isDefeated: false, zaptieCards: [zaptieCard] },
      message: `Заптие! Комитетът на ${player.name} е разкрит!`,
    };
  } else {
    // Already revealed — check if defeated
    const totalZaptieBoyna = getTotalZaptieBoyna(state.field, state.fieldFaceUp) + (zaptieCard.strength ?? 0);
    const playerBoyna = player.stats.boyna;

    if (totalZaptieBoyna > playerBoyna) {
      // Committee defeated
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: [], isRevealed: true } : p
      );
      // Clear all face-up field cards
      const newFieldFaceUp = state.fieldFaceUp.map(() => false);
      
      return {
        ...state,
        players,
        fieldFaceUp: newFieldFaceUp,
        actionsRemaining: 0,
        canFormGroup: false,
        zaptieTrigger: { wasSecret: false, isDefeated: true, zaptieCards: [zaptieCard] },
        message: `Заптие! Комитетът на ${player.name} е разбит! Загубени всички карти.`,
      };
    } else {
      // Already revealed but not defeated
      return {
        ...state,
        actionsRemaining: 0,
        canFormGroup: false,
        zaptieTrigger: { wasSecret: false, isDefeated: false, zaptieCards: [zaptieCard] },
        message: `Заптие! Комитетът на ${player.name} вече е разкрит. Продължаваш.`,
      };
    }
  }
}

function advanceTurn(state: GameState): GameState {
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  const nextPlayer = state.players[nextIndex];
  
  let newState = replenishField(state);
  
  if (newState.phase === 'scoring') return newState;

  return {
    ...newState,
    currentPlayerIndex: nextIndex,
    turnStep: 'recruiting',
    actionsRemaining: nextPlayer.stats.deynost,
    actionsUsed: 0,
    canFormGroup: true,
    selectedCards: [],
    message: `Ход на ${nextPlayer.name}`,
    zaptieTrigger: undefined,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const player = state.players[state.currentPlayerIndex];

  switch (action.type) {
    case 'SCOUT': {
      if (state.turnStep !== 'recruiting' || state.actionsRemaining <= 0) return state;
      const { fieldIndex } = action;
      if (state.fieldFaceUp[fieldIndex]) return state; // already face-up
      
      const card = state.field[fieldIndex];
      const newFieldFaceUp = [...state.fieldFaceUp];
      newFieldFaceUp[fieldIndex] = true;

      if (card.type === 'zaptie') {
        const newState = {
          ...state,
          field: state.field,
          fieldFaceUp: newFieldFaceUp,
          actionsUsed: state.actionsUsed + 1,
        };
        return handleZaptieEncounter(newState, card);
      }

      return {
        ...state,
        fieldFaceUp: newFieldFaceUp,
        actionsRemaining: state.actionsRemaining - 1,
        actionsUsed: state.actionsUsed + 1,
        message: `Проучване: открита карта "${card.name}"`,
      };
    }

    case 'SAFE_RECRUIT': {
      if (state.turnStep !== 'recruiting' || state.actionsRemaining <= 0) return state;
      const { fieldIndex } = action;
      if (!state.fieldFaceUp[fieldIndex]) return state; // must be face-up
      
      const card = state.field[fieldIndex];
      if (card.type === 'zaptie') return state; // can't safe recruit zaptie

      const newField = state.field.filter((_, i) => i !== fieldIndex);
      const newFieldFaceUp = state.fieldFaceUp.filter((_, i) => i !== fieldIndex);
      const newHand = [...player.hand, card];
      
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      );

      const newActionsRemaining = state.actionsRemaining - 1;
      const newActionsUsed = state.actionsUsed + 1;
      // Auto-advance to selection if actions exhausted
      const newTurnStep = newActionsRemaining <= 0
        ? (newHand.length <= players[state.currentPlayerIndex].stats.nabor ? 'forming' : 'selection')
        : 'recruiting';
      return {
        ...state,
        field: newField,
        fieldFaceUp: newFieldFaceUp,
        players,
        actionsRemaining: newActionsRemaining,
        actionsUsed: newActionsUsed,
        turnStep: newTurnStep,
        message: `Сигурно вербуване: взета карта "${card.name}"`,
      };
    }

    case 'RISKY_RECRUIT': {
      if (state.turnStep !== 'recruiting' || state.actionsRemaining <= 0) return state;
      if (state.deck.length === 0) return state;

      const card = state.deck[0];
      const newDeck = state.deck.slice(1);

      if (card.type === 'zaptie') {
        // Place on field face-up
        const newField = [...state.field, card];
        const newFieldFaceUp = [...state.fieldFaceUp, true];
        const newState = {
          ...state,
          deck: newDeck,
          field: newField,
          fieldFaceUp: newFieldFaceUp,
          actionsUsed: state.actionsUsed + 1,
        };
        return handleZaptieEncounter(newState, card);
      }

      const newHand = [...player.hand, card];
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      );

      const riskyActionsRemaining = state.actionsRemaining - 1;
      const riskyNextStep = riskyActionsRemaining <= 0
        ? (newHand.length <= players[state.currentPlayerIndex].stats.nabor ? 'forming' : 'selection')
        : 'recruiting';
      return {
        ...state,
        deck: newDeck,
        players,
        actionsRemaining: riskyActionsRemaining,
        actionsUsed: state.actionsUsed + 1,
        turnStep: riskyNextStep,
        message: `Рисковано вербуване: взета карта "${card.name}"`,
      };
    }

    case 'SKIP_ACTIONS': {
      if (state.turnStep !== 'recruiting') return state;
      // If no actions used and hand is already within nabor limit, skip to forming
      const currentPlayer = state.players[state.currentPlayerIndex];
      const nextStep = currentPlayer.hand.length <= currentPlayer.stats.nabor ? 'forming' : 'selection';
      return {
        ...state,
        turnStep: nextStep,
        actionsRemaining: 0,
        message: nextStep === 'forming' ? 'Сформиране на групи' : 'Подбор на революционери',
      };
    }

    case 'PROCEED_TO_FORMING': {
      if (state.turnStep !== 'selection') return state;
      return {
        ...state,
        turnStep: 'forming',
        message: 'Сформиране на групи',
      };
    }

    case 'DISCARD_CARD': {
      if (state.turnStep !== 'selection') return state;
      const newHand = player.hand.filter(c => c.id !== action.cardId);
      const discarded = player.hand.find(c => c.id === action.cardId);
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      );
      const newHandAfterDiscard = newHand;
      const discardedPlayer = players[state.currentPlayerIndex];
      const autoAdvance = newHandAfterDiscard.length <= discardedPlayer.stats.nabor;
      return {
        ...state,
        players,
        turnStep: autoAdvance ? 'forming' : 'selection',
        usedCards: discarded ? [...state.usedCards, discarded] : state.usedCards,
        message: autoAdvance
          ? `Изчистена карта: "${discarded?.name}". Сформиране на групи`
          : `Изчистена карта: "${discarded?.name}"`,
      };
    }

    case 'TOGGLE_SELECT_CARD': {
      if (state.turnStep !== 'forming') return state;
      const { cardId } = action;
      const isSelected = state.selectedCards.includes(cardId);
      const selectedCards = isSelected
        ? state.selectedCards.filter(id => id !== cardId)
        : [...state.selectedCards, cardId];
      return { ...state, selectedCards };
    }

    case 'FORM_GROUP_IMPROVE_STAT': {
      if (state.turnStep !== 'forming') return state;
      const { statType } = action;
      
      const selectedHand = player.hand.filter(c => state.selectedCards.includes(c.id));
      const hayduti = selectedHand.filter(c => c.type === 'haydut');
      
      if (hayduti.length === 0) return state;

      const groupStrength = getGroupStrength(hayduti);
      const currentStatValue = player.stats[statType];
      const nextValue = getNextStatValue(currentStatValue);
      
      if (!nextValue) return { ...state, message: 'Показателят е вече на максимум!' };
      
      const cost = getUpgradeCost(nextValue);
      if (groupStrength < cost) {
        return { ...state, message: `Недостатъчна сила! Нужна: ${cost}, имаш: ${groupStrength}` };
      }

      // Validate group formation
      const byContribution = canFormGroupByContribution(hayduti);
      const byColor = canFormGroupByColor(hayduti);
      
      if (!byContribution && !byColor) {
        return { ...state, message: 'Невалидна група! Хайдутите трябва да са с еднакъв принос или цвят.' };
      }

      // Improve stat
      const newStats = { ...player.stats, [statType]: nextValue };
      const newHand = player.hand.filter(c => !state.selectedCards.includes(c.id) || c.type !== 'haydut');
      const discarded = player.hand.filter(c => state.selectedCards.includes(c.id) && c.type === 'haydut');
      
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, stats: newStats, hand: newHand } : p
      );

      return {
        ...state,
        players,
        usedCards: [...state.usedCards, ...discarded],
        selectedCards: [],
        canFormGroup: false,
        message: `Подобрен показател "${statType}" до ${nextValue}!`,
      };
    }

    case 'FORM_GROUP_RAISE_CARD': {
      if (state.turnStep !== 'forming') return state;
      const { targetCardId } = action;
      
      const selectedHand = player.hand.filter(c => state.selectedCards.includes(c.id));
      const hayduti = selectedHand.filter(c => c.type === 'haydut');
      
      if (hayduti.length === 0) return state;

      // Find target card (on field or in hand)
      const targetInField = state.field.find(c => c.id === targetCardId);
      const targetInHand = player.hand.find(c => c.id === targetCardId);
      const targetCard = targetInField || targetInHand;
      
      if (!targetCard) return state;
      if (targetCard.type !== 'voyvoda' && targetCard.type !== 'deyets') return state;

      const groupStrength = getGroupStrength(hayduti);
      const cost = targetCard.cost ?? 999;
      
      if (groupStrength < cost) {
        return { ...state, message: `Недостатъчна сила! Нужна: ${cost}, имаш: ${groupStrength}` };
      }

      // Validate group
      const byContribution = canFormGroupByContribution(hayduti);
      const byColor = canFormGroupByColor(hayduti);
      if (!byContribution && !byColor) {
        return { ...state, message: 'Невалидна група!' };
      }

      // Remove hayduti from hand, raise target card
      const newHand = player.hand.filter(c => {
        if (state.selectedCards.includes(c.id) && c.type === 'haydut') return false;
        if (c.id === targetCardId) return false;
        return true;
      });
      const discardedHayduti = player.hand.filter(c => state.selectedCards.includes(c.id) && c.type === 'haydut');

      // Remove from field if it was there
      const newField = state.field.filter(c => c.id !== targetCardId);
      const newFieldFaceUp = state.fieldFaceUp.filter((_, i) => state.field[i]?.id !== targetCardId);

      const isVoyvoda = targetCard.type === 'voyvoda';
      const players = state.players.map((p, i) => {
        if (i !== state.currentPlayerIndex) return p;
        return {
          ...p,
          hand: newHand,
          raisedVoyvodas: isVoyvoda ? [...p.raisedVoyvodas, targetCard] : p.raisedVoyvodas,
          raisedDeytsi: !isVoyvoda ? [...p.raisedDeytsi, targetCard] : p.raisedDeytsi,
        };
      });

      return {
        ...state,
        players,
        field: newField,
        fieldFaceUp: newFieldFaceUp,
        usedCards: [...state.usedCards, ...discardedHayduti],
        selectedCards: [],
        canFormGroup: false,
        message: `Издигнат "${targetCard.name}"!`,
      };
    }

    case 'SKIP_FORMING': {
      return {
        ...state,
        turnStep: 'end',
        selectedCards: [],
        message: 'Край на хода',
      };
    }

    case 'END_TURN': {
      // Allow ending turn from forming or end step
      if (state.turnStep !== 'forming' && state.turnStep !== 'end') return state;
      // Check if player has no cards and is revealed → flip to secret
      let players = state.players;
      if (player.hand.length === 0 && player.isRevealed) {
        players = players.map((p, i) =>
          i === state.currentPlayerIndex ? { ...p, isRevealed: false } : p
        );
      }
      
      return advanceTurn({ ...state, players, turnStep: 'end' });
    }

    case 'ACKNOWLEDGE_ZAPTIE': {
      // After acknowledging zaptie, move to selection or forming step
      const zapPlayer = state.players[state.currentPlayerIndex];
      const zapNextStep = zapPlayer.hand.length <= zapPlayer.stats.nabor ? 'forming' : 'selection';
      return {
        ...state,
        zaptieTrigger: undefined,
        turnStep: zapNextStep,
        message: zapNextStep === 'forming' ? 'Сформиране на групи' : 'Подбор на революционери',
      };
    }

    case 'DISMISS_MESSAGE': {
      return { ...state, message: '' };
    }

    default:
      return state;
  }
}
