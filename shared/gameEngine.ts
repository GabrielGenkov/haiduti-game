// ============================================================
// ХАЙДУТИ — Game Engine (State Reducer)
// Design: Хайдушка чета board-game aesthetic
// All 13 Дейци traits implemented
// ============================================================

import {
  GameState,
  Card,
  Player,
  ContributionType,
  TurnStep,
  DeyetsTraitId,
  shuffle,
  getTotalZaptieBoyna,
  getGroupStrength,
  getGroupContributions,
  canFormGroupByContribution,
  canFormGroupByColor,
  getUpgradeCost,
  getNextStatValue,
  getMaxReachableStatValue,
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
  | { type: 'DISMISS_MESSAGE' }
  // Turn-start abilities
  | { type: 'USE_SOFRONIY_ABILITY' }          // Софроний: free peek one card
  | { type: 'USE_HADZHI_ABILITY'; fieldIndex: number } // Хаджи Димитър: remove Заптие from field
  // Панайот Хитов: pick 2 cards from defeated player
  | { type: 'PANAYOT_PICK_CARD'; cardId: string }
  | { type: 'PANAYOT_SKIP' }
  // Любен Каравелов: choose which stat to boost at end
  | { type: 'LYUBEN_CHOOSE_STAT'; statType: ContributionType }
  // Поп Харитон: form group during defeat before discarding
  | { type: 'POP_HARITON_FORM_GROUP'; statType: ContributionType }
  | { type: 'POP_HARITON_SKIP' };

// ============================================================
// HELPERS
// ============================================================

/** Map a Деец card ID to its trait ID */
function cardIdToTrait(cardId: string): DeyetsTraitId | null {
  const map: Record<string, DeyetsTraitId> = {
    dey_hristo: 'hristo_botev',
    dey_vasil: 'vasil_levski',
    dey_sofroniy: 'sofroniy',
    dey_rakowski: 'rakowski',
    dey_evlogi: 'evlogi',
    dey_petko_voy: 'petko_voy',
    dey_lyuben: 'lyuben',
    dey_rayna: 'rayna',
    dey_benkovski: 'benkovski',
    dey_pop: 'pop_hariton',
    dey_hadzhi: 'hadzhi',
    dey_dyado: 'dyado_ilyo',
    dey_filip: 'filip_totyu',
    dey_panayot: 'panayot',
    dey_stefan: 'stefan_karadzha',
  };
  return map[cardId] ?? null;
}

/** Calculate group strength bonus from player's raised Дейци traits */
export function getTraitGroupBonus(
  player: Player,
  hayduti: Card[],
  statType: ContributionType
): number {
  let bonus = 0;
  for (const trait of player.traits) {
    switch (trait) {
      case 'hristo_botev':
        bonus += 2; // +2 to any group
        break;
      case 'lyuben':
        bonus += 1; // +1 to any group
        break;
      case 'rayna':
        if (hayduti.length >= 3) bonus += 1; // +1 if 3+ hayduti
        break;
      case 'evlogi':
        if (statType === 'nabor') bonus += 2; // +2 if набор group
        break;
      case 'filip_totyu':
        if (statType === 'deynost') bonus += 2; // +2 if дейност group
        break;
      case 'stefan_karadzha':
        if (statType === 'boyna') bonus += 2; // +2 if бойна group
        break;
    }
  }
  return bonus;
}

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

    // Reshuffle used cards into new deck, add diamond cards on rotations
    let silverCards: Card[] = [];
    let goldCards: Card[] = [];
    
    if (deckRotations === 1) {
      silverCards = ALL_CARDS.filter(c => c.silverDiamond && !c.goldDiamond);
    }
    if (deckRotations >= 2) {
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

/**
 * Handle Заптие encounter — with trait effects:
 * - Васил Левски: first Заптие per turn is ignored entirely
 * - Дядо Ильо: when committee is revealed (wasSecret), Заптие is removed from field and player gets +2 hand limit this turn
 * - Петко Войвода: on defeat, player keeps 2 cards
 * - Поп Харитон: on defeat, player can form 1 group before discarding
 * - Панайот Хитов: other players with this trait get to pick 2 cards from the defeated player
 */
function handleZaptieEncounter(state: GameState, zaptieCard: Card): GameState {
  const player = state.players[state.currentPlayerIndex];

  // ── Васил Левски: ignore first Заптие per turn ──
  // The Заптие is placed on the field face-up (already done by caller) but has zero
  // effect on the player — no reveal, no defeat, no popup, turn continues normally.
  if (player.traits.includes('vasil_levski') && !player.zaptieTurnIgnored) {
    const players = state.players.map((p, i) =>
      i === state.currentPlayerIndex ? { ...p, zaptieTurnIgnored: true } : p
    );
    // Determine correct turnStep: if actions remain, stay in recruiting; else go to selection
    const levskyStep: TurnStep = state.actionsRemaining > 0 ? 'recruiting' : 'selection';
    return replenishField({
      ...state,
      players,
      turnStep: levskyStep,
      // No zaptieTrigger — player is completely unaffected
      message: `Васил Левски: Заптието (сила ${zaptieCard.strength}) е игнорирано! Продължаваш хода.`,
    });
  }

  const wasSecret = !player.isRevealed;

  if (wasSecret) {
    // ── Дядо Ильо: when committee is revealed, remove the Заптие card from field ──
    if (player.traits.includes('dyado_ilyo')) {
      // Remove the Заптие from field (it was just placed face-up or drawn)
      const newField = state.field.filter(c => c.id !== zaptieCard.id);
      const newFieldFaceUp = state.fieldFaceUp.filter((_, i) => state.field[i]?.id !== zaptieCard.id);
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex
          ? { ...p, isRevealed: true, dyadoIlyoActive: true }
          : p
      );
      return {
        ...state,
        players,
        field: newField,
        fieldFaceUp: newFieldFaceUp,
        actionsRemaining: 0,
        canFormGroup: false,
        zaptieTrigger: {
          wasSecret: true,
          isDefeated: false,
          zaptieCards: [zaptieCard],
          dyadoIlyoTriggered: true,
        },
        message: `Дядо Ильо: Заптието е отстранено! Комитетът е разкрит, но можеш да задържиш 2 карти повече.`,
      };
    }

    // Normal reveal — keep remaining actions so player can continue their turn
    const players = state.players.map((p, i) =>
      i === state.currentPlayerIndex ? { ...p, isRevealed: true } : p
    );
    return {
      ...state,
      players,
      // Do NOT zero out actionsRemaining — player continues their turn after acknowledging
      zaptieTrigger: { wasSecret: true, isDefeated: false, zaptieCards: [zaptieCard] },
      message: `Заптие! Комитетът на ${player.name} е разкрит!`,
    };
  } else {
    // Already revealed — check if defeated
    const totalZaptieBoyna = getTotalZaptieBoyna(state.field, state.fieldFaceUp);
    const playerBoyna = player.stats.boyna;

    if (totalZaptieBoyna > playerBoyna) {
      // Committee defeated
      // Remove face-up Заптие from field, flip others face-down
      const newField = state.field.filter((c, i) => !(state.fieldFaceUp[i] && c.type === 'zaptie'));
      const keptIndices = state.field.reduce<number[]>((acc, c, i) => {
        if (!(state.fieldFaceUp[i] && c.type === 'zaptie')) acc.push(i);
        return acc;
      }, []);
      const newFieldFaceUp = keptIndices.map(() => false);

      const hasPetko = player.traits.includes('petko_voy');
      const hasPop = player.traits.includes('pop_hariton');

      // Check if any other player has Панайот Хитов
      const panayotPlayerIndex = state.players.findIndex(
        (p, i) => i !== state.currentPlayerIndex && p.traits.includes('panayot')
      );

      // Петко Войвода: player keeps 2 cards (hand is NOT cleared yet — UI handles selection)
      // Поп Харитон: player can form 1 group before discarding
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex
          ? { ...p, isRevealed: true, hand: hasPetko ? p.hand : [] }
          : p
      );

      const panayotTrigger = panayotPlayerIndex >= 0 && player.hand.length > 0
        ? { beneficiaryPlayerIndex: panayotPlayerIndex, defeatedPlayerIndex: state.currentPlayerIndex }
        : undefined;

      return {
        ...state,
        players,
        field: newField,
        fieldFaceUp: newFieldFaceUp,
        actionsRemaining: 0,
        canFormGroup: false,
        zaptieTrigger: {
          wasSecret: false,
          isDefeated: true,
          zaptieCards: [zaptieCard],
          petkoVoyTriggered: hasPetko,
          popHaritonTriggered: hasPop,
        },
        panayotTrigger,
        message: hasPetko
          ? `Заптие! Комитетът на ${player.name} е разбит! Петко Войвода: запазваш 2 карти по избор.`
          : hasPop
          ? `Заптие! Комитетът на ${player.name} е разбит! Поп Харитон: можеш да сформираш група преди да изхвърлиш.`
          : `Заптие! Комитетът на ${player.name} е разбит! Загубени всички карти.`,
      };
    } else {
      // Already revealed but not defeated — keep remaining actions so player continues
      return {
        ...state,
        // Do NOT zero out actionsRemaining — player continues their turn after acknowledging
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

  // Reset per-turn trait state for the next player
  const players = newState.players.map((p, i) =>
    i === nextIndex
      ? { ...p, zaptieTurnIgnored: false, dyadoIlyoActive: false }
      : p
  );

  // Бенковски: check if next player has бенковски trait and there are ≥3 Заптие power on field
  const benkovskiBonus = players[nextIndex].traits.includes('benkovski')
    ? getTotalZaptieBoyna(newState.field, newState.fieldFaceUp) >= 3 ? 2 : 0
    : 0;

  const baseActions = nextPlayer.stats.deynost + benkovskiBonus;

  return {
    ...newState,
    players,
    currentPlayerIndex: nextIndex,
    turnStep: 'recruiting',
    actionsRemaining: baseActions,
    actionsUsed: 0,
    canFormGroup: true,
    selectedCards: [],
    message: benkovskiBonus > 0
      ? `Ход на ${nextPlayer.name} — Бенковски: +2 действия (Заптие на масата ≥3)!`
      : `Ход на ${nextPlayer.name}`,
    zaptieTrigger: undefined,
    sofroniyAbilityUsed: false,
    hadzhiAbilityUsed: false,
    benkovskiApplied: benkovskiBonus > 0,
    panayotTrigger: undefined,
    popHaritonForming: false,
  };
}

// ============================================================
// MAIN REDUCER
// ============================================================

export function gameReducer(state: GameState, action: GameAction): GameState {
  const player = state.players[state.currentPlayerIndex];

  switch (action.type) {

    // ── SCOUT ──────────────────────────────────────────────────
    case 'SCOUT': {
      if (state.turnStep !== 'recruiting' || state.actionsRemaining <= 0) return state;
      const { fieldIndex } = action;
      if (state.fieldFaceUp[fieldIndex]) return state;

      const card = state.field[fieldIndex];
      const newFieldFaceUp = [...state.fieldFaceUp];
      newFieldFaceUp[fieldIndex] = true;

      const scoutActionsRemaining = state.actionsRemaining - 1;
      const scoutActionsUsed = state.actionsUsed + 1;
      const scoutNextStep: TurnStep = scoutActionsRemaining <= 0 ? 'selection' : 'recruiting';

      const scoutState = {
        ...state,
        fieldFaceUp: newFieldFaceUp,
        actionsRemaining: scoutActionsRemaining,
        actionsUsed: scoutActionsUsed,
        turnStep: scoutNextStep,
        message: card.type === 'zaptie'
          ? `Проучване: открито Заптие (сила ${card.strength})!`
          : `Проучване: открита карта "${card.name}"`,
      };

      if (card.type === 'zaptie') {
        if (!player.isRevealed) {
          // Дядо Ильо or Васил Левски may intercept
          return handleZaptieEncounter(scoutState, card);
        } else {
          const totalZaptieBoyna = getTotalZaptieBoyna(scoutState.field, scoutState.fieldFaceUp);
          if (totalZaptieBoyna > player.stats.boyna) {
            return handleZaptieEncounter(scoutState, card);
          }
        }
      }

      return scoutState;
    }

    // ── SAFE RECRUIT ───────────────────────────────────────────
    case 'SAFE_RECRUIT': {
      if (state.turnStep !== 'recruiting' || state.actionsRemaining <= 0) return state;
      const { fieldIndex } = action;
      if (!state.fieldFaceUp[fieldIndex]) return state;
      
      const card = state.field[fieldIndex];
      if (card.type === 'zaptie') return state;

      const newField = state.field.filter((_, i) => i !== fieldIndex);
      const newFieldFaceUp = state.fieldFaceUp.filter((_, i) => i !== fieldIndex);
      const newHand = [...player.hand, card];
      
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      );

      const newActionsRemaining = state.actionsRemaining - 1;
      const newActionsUsed = state.actionsUsed + 1;
      const newTurnStep: TurnStep = newActionsRemaining <= 0 ? 'selection' : 'recruiting';
      return replenishField({
        ...state,
        field: newField,
        fieldFaceUp: newFieldFaceUp,
        players,
        actionsRemaining: newActionsRemaining,
        actionsUsed: newActionsUsed,
        turnStep: newTurnStep,
        message: `Сигурно вербуване: взета карта "${card.name}"`,
      });
    }

    // ── RISKY RECRUIT ──────────────────────────────────────────
    case 'RISKY_RECRUIT': {
      if (state.turnStep !== 'recruiting' || state.actionsRemaining <= 0) return state;
      if (state.deck.length === 0) {
        return { ...state, message: 'Тестето е изчерпано! Не може рисковано вербуване.' };
      }

      const card = state.deck[0];
      const newDeck = state.deck.slice(1);

      if (card.type === 'zaptie') {
        const newField = [...state.field, card];
        const newFieldFaceUp = [...state.fieldFaceUp, true];
        const riskyZaptieActionsRemaining = state.actionsRemaining - 1;
        const newState = {
          ...state,
          deck: newDeck,
          field: newField,
          fieldFaceUp: newFieldFaceUp,
          actionsUsed: state.actionsUsed + 1,
          actionsRemaining: riskyZaptieActionsRemaining,
          // turnStep will be set by handleZaptieEncounter or ACKNOWLEDGE_ZAPTIE
        };
        // Tag the trigger as coming from risky recruit so ACKNOWLEDGE_ZAPTIE
        // knows to end the turn after discard (no forming step allowed)
        const riskyResult = handleZaptieEncounter(newState, card);
        if (riskyResult.zaptieTrigger) {
          return { ...riskyResult, zaptieTrigger: { ...riskyResult.zaptieTrigger, fromRiskyRecruit: true } };
        }
        return riskyResult;
      }

      const newHand = [...player.hand, card];
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      );

      const riskyActionsRemaining = state.actionsRemaining - 1;
      const riskyNextStep: TurnStep = riskyActionsRemaining <= 0 ? 'selection' : 'recruiting';
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

    // ── SKIP ACTIONS ───────────────────────────────────────────
    case 'SKIP_ACTIONS': {
      if (state.turnStep !== 'recruiting') return state;
      if (state.actionsUsed === 0) return state;
      return {
        ...state,
        turnStep: 'selection',
        actionsRemaining: 0,
        message: 'Подбор на революционери',
      };
    }

    // ── PROCEED TO FORMING ─────────────────────────────────────
    case 'PROCEED_TO_FORMING': {
      if (state.turnStep !== 'selection') return state;
      if (!state.canFormGroup) {
        return advanceTurn({ ...state, turnStep: 'end' });
      }
      return {
        ...state,
        turnStep: 'forming',
        message: 'Сформиране на групи',
      };
    }

    // ── DISCARD CARD ───────────────────────────────────────────
    case 'DISCARD_CARD': {
      if (state.turnStep !== 'selection') return state;
      const newHand = player.hand.filter(c => c.id !== action.cardId);
      const discarded = player.hand.find(c => c.id === action.cardId);
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      );
      return {
        ...state,
        players,
        turnStep: 'selection',
        usedCards: discarded ? [...state.usedCards, discarded] : state.usedCards,
        message: `Изчистена карта: "${discarded?.name}"`,
      };
    }

    // ── TOGGLE SELECT CARD ─────────────────────────────────────
    case 'TOGGLE_SELECT_CARD': {
      if (state.turnStep !== 'forming') return state;
      const { cardId } = action;
      const isSelected = state.selectedCards.includes(cardId);
      const selectedCards = isSelected
        ? state.selectedCards.filter(id => id !== cardId)
        : [...state.selectedCards, cardId];
      return { ...state, selectedCards };
    }

    // ── FORM GROUP: IMPROVE STAT ───────────────────────────────
    case 'FORM_GROUP_IMPROVE_STAT': {
      if (state.turnStep !== 'forming') return state;
      const { statType } = action;
      
      const selectedHand = player.hand.filter(c => state.selectedCards.includes(c.id));
      const hayduti = selectedHand.filter(c => c.type === 'haydut');
      
      if (hayduti.length === 0) return state;

      // Calculate base strength + trait bonuses
      const baseStrength = getGroupStrength(hayduti);
      const traitBonus = getTraitGroupBonus(player, hayduti, statType);
      const effectiveStrength = baseStrength + traitBonus;

      const currentStatValue = player.stats[statType];

      if (getNextStatValue(currentStatValue) === null) {
        return { ...state, message: 'Показателят е вече на максимум!' };
      }

      const targetValue = getMaxReachableStatValue(currentStatValue, effectiveStrength);
      if (!targetValue) {
        const minCost = getUpgradeCost(getNextStatValue(currentStatValue)!);
        return { ...state, message: `Недостатъчна сила! Нужна: ${minCost}, имаш: ${effectiveStrength}${traitBonus > 0 ? ` (базова ${baseStrength} + бонус ${traitBonus})` : ''}` };
      }

      // Validate group formation
      const byContribution = canFormGroupByContribution(hayduti);
      const byColor = canFormGroupByColor(hayduti);
      
      if (!byContribution && !byColor) {
        return { ...state, message: 'Невалидна група! Хайдутите трябва да са с еднакъв принос или цвят.' };
      }

      if (!byContribution && byColor) {
        const groupContributions = getGroupContributions(hayduti);
        if (!groupContributions.includes(statType)) {
          return { ...state, message: 'Избраният показател не отговаря на принос на нито една карта в групата.' };
        }
      }

      const newStats = { ...player.stats, [statType]: targetValue };

      // Георги Раковски: keep 1 card from the group if committee is secret
      let newHand: Card[];
      let discarded: Card[];
      if (player.traits.includes('rakowski') && !player.isRevealed) {
        // Keep the strongest haydut from the group
        const sortedHayduti = [...hayduti].sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));
        const keptCard = sortedHayduti[0];
        discarded = hayduti.filter(c => c.id !== keptCard.id);
        newHand = player.hand.filter(c => !discarded.some(d => d.id === c.id));
      } else {
        newHand = player.hand.filter(c => !state.selectedCards.includes(c.id) || c.type !== 'haydut');
        discarded = player.hand.filter(c => state.selectedCards.includes(c.id) && c.type === 'haydut');
      }

      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, stats: newStats, hand: newHand } : p
      );

      const bonusMsg = traitBonus > 0 ? ` (бонус +${traitBonus} от Дейци)` : '';
      const rakowskiMsg = player.traits.includes('rakowski') && !player.isRevealed ? ' Раковски: запазена 1 карта.' : '';
      return {
        ...state,
        players,
        usedCards: [...state.usedCards, ...discarded],
        selectedCards: [],
        canFormGroup: false,
        message: `Подобрен показател "${statType}" до ${targetValue}!${bonusMsg}${rakowskiMsg}`,
      };
    }

    // ── FORM GROUP: RAISE CARD ─────────────────────────────────
    case 'FORM_GROUP_RAISE_CARD': {
      if (state.turnStep !== 'forming') return state;
      const { targetCardId } = action;
      
      const selectedHand = player.hand.filter(c => state.selectedCards.includes(c.id));
      const hayduti = selectedHand.filter(c => c.type === 'haydut');
      
      if (hayduti.length === 0) return state;

      const targetInField = state.field.find(c => c.id === targetCardId);
      const targetInHand = player.hand.find(c => c.id === targetCardId);
      const targetCard = targetInField || targetInHand;
      
      if (!targetCard) return state;
      if (targetCard.type !== 'voyvoda' && targetCard.type !== 'deyets') return state;

      // For raising, we use contribution-neutral strength (no statType), so use 'nabor' as default for bonus calc
      const baseStrength = getGroupStrength(hayduti);
      // Trait bonuses for raising use any-type bonuses only (hristo_botev, lyuben, rayna)
      let traitBonus = 0;
      if (player.traits.includes('hristo_botev')) traitBonus += 2;
      if (player.traits.includes('lyuben')) traitBonus += 1;
      if (player.traits.includes('rayna') && hayduti.length >= 3) traitBonus += 1;
      const effectiveStrength = baseStrength + traitBonus;

      const cost = targetCard.cost ?? 999;
      if (effectiveStrength < cost) {
        return { ...state, message: `Недостатъчна сила! Нужна: ${cost}, имаш: ${effectiveStrength}${traitBonus > 0 ? ` (базова ${baseStrength} + бонус ${traitBonus})` : ''}` };
      }

      const byContribution = canFormGroupByContribution(hayduti);
      const byColor = canFormGroupByColor(hayduti);
      if (!byContribution && !byColor) {
        return { ...state, message: 'Невалидна група!' };
      }

      // Determine new trait if raising a Деец
      const newTrait = targetCard.type === 'deyets' ? cardIdToTrait(targetCard.id) : null;

      // Георги Раковски: keep 1 card from the group if committee is secret
      let newHand: Card[];
      let discardedHayduti: Card[];
      if (player.traits.includes('rakowski') && !player.isRevealed) {
        const sortedHayduti = [...hayduti].sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));
        const keptCard = sortedHayduti[0];
        discardedHayduti = hayduti.filter(c => c.id !== keptCard.id);
        newHand = player.hand.filter(c => {
          if (discardedHayduti.some(d => d.id === c.id)) return false;
          if (c.id === targetCardId) return false;
          return true;
        });
      } else {
        newHand = player.hand.filter(c => {
          if (state.selectedCards.includes(c.id) && c.type === 'haydut') return false;
          if (c.id === targetCardId) return false;
          return true;
        });
        discardedHayduti = player.hand.filter(c => state.selectedCards.includes(c.id) && c.type === 'haydut');
      }

      const newField = state.field.filter(c => c.id !== targetCardId);
      const newFieldFaceUp = state.fieldFaceUp.filter((_, i) => state.field[i]?.id !== targetCardId);

      const isVoyvoda = targetCard.type === 'voyvoda';
      const players = state.players.map((p, i) => {
        if (i !== state.currentPlayerIndex) return p;
        const updatedTraits = newTrait && !p.traits.includes(newTrait)
          ? [...p.traits, newTrait]
          : p.traits;
        return {
          ...p,
          hand: newHand,
          raisedVoyvodas: isVoyvoda ? [...p.raisedVoyvodas, targetCard] : p.raisedVoyvodas,
          raisedDeytsi: !isVoyvoda ? [...p.raisedDeytsi, targetCard] : p.raisedDeytsi,
          traits: updatedTraits,
        };
      });

      const wasInField = state.field.some(c => c.id === targetCardId);
      const traitMsg = newTrait ? ` Придобита черта: ${targetCard.name}!` : '';
      const rakowskiMsg = player.traits.includes('rakowski') && !player.isRevealed ? ' Раковски: запазена 1 карта.' : '';
      const afterRaise = wasInField ? replenishField({
        ...state,
        players,
        field: newField,
        fieldFaceUp: newFieldFaceUp,
        usedCards: [...state.usedCards, ...discardedHayduti],
        selectedCards: [],
        canFormGroup: false,
        message: `Издигнат "${targetCard.name}"!${traitMsg}${rakowskiMsg}`,
      }) : {
        ...state,
        players,
        field: newField,
        fieldFaceUp: newFieldFaceUp,
        usedCards: [...state.usedCards, ...discardedHayduti],
        selectedCards: [],
        canFormGroup: false,
        message: `Издигнат "${targetCard.name}"!${traitMsg}${rakowskiMsg}`,
      };
      return afterRaise;
    }

    // ── SKIP FORMING ───────────────────────────────────────────
    case 'SKIP_FORMING': {
      return {
        ...state,
        turnStep: 'end',
        selectedCards: [],
        message: 'Край на хода',
      };
    }

    // ── END TURN ───────────────────────────────────────────────
    case 'END_TURN': {
      if (state.turnStep !== 'forming' && state.turnStep !== 'end') return state;
      let players = state.players;
      if (player.hand.length === 0 && player.isRevealed) {
        players = players.map((p, i) =>
          i === state.currentPlayerIndex ? { ...p, isRevealed: false } : p
        );
      }
      return advanceTurn({ ...state, players, turnStep: 'end' });
    }

    // ── ACKNOWLEDGE ZAПТИЕ ─────────────────────────────────────
    case 'ACKNOWLEDGE_ZAPTIE': {
      const zapPlayer = state.players[state.currentPlayerIndex];
      const zaptie = state.zaptieTrigger;
      const isDefeated = zaptie?.isDefeated ?? false;

      // ── DEFEAT cases ──────────────────────────────────────────
      // On defeat, always go through selection step first (discard step)
      // so the player can see what happened before the turn ends.

      // Петко Войвода triggered: player keeps 2 cards
      if (zaptie?.petkoVoyTriggered) {
        return {
          ...state,
          zaptieTrigger: undefined,
          turnStep: 'selection',
          actionsRemaining: 0,
          canFormGroup: false,
          message: `Петко Войвода: запазваш 2 карти по избор. Изхвърли останалите.`,
        };
      }

      // Поп Харитон triggered: player forms 1 group before discarding
      if (zaptie?.popHaritonTriggered) {
        return {
          ...state,
          zaptieTrigger: undefined,
          turnStep: 'forming',
          actionsRemaining: 0,
          canFormGroup: true,
          popHaritonForming: true,
          message: `Поп Харитон: можеш да сформираш група преди да изхвърлиш картите.`,
        };
      }

      // Панайот Хитов pending (defeat)
      if (state.panayotTrigger) {
        return {
          ...state,
          zaptieTrigger: undefined,
          message: `Панайот Хитов: ${state.players[state.panayotTrigger.beneficiaryPlayerIndex].name} избира 2 карти от разбития комитет!`,
        };
      }

      // Regular defeat (no special traits) — go to selection so player sees the state, then end turn
      if (isDefeated) {
        // Hand was already cleared in handleZaptieEncounter; go to selection (empty hand) then end turn
        return {
          ...state,
          zaptieTrigger: undefined,
          turnStep: 'selection',
          actionsRemaining: 0,
          canFormGroup: false,
          message: `Комитетът е разбит! Всички карти са изгубени. Натиснете "Продължи" за край на хода.`,
        };
      }

      // ── NON-DEFEAT cases ──────────────────────────────────────
      // Committee was only revealed (wasSecret) OR already revealed but survived.
      const fromRisky = zaptie?.fromRiskyRecruit ?? false;

      // Дядо Ильо: +2 hand limit active — check if hand still over limit
      const effectiveNabor = zapPlayer.stats.nabor + (zapPlayer.dyadoIlyoActive ? 2 : 0);
      const needsSelection = zapPlayer.hand.length > effectiveNabor;

      if (needsSelection) {
        // Over hand limit — go to selection first.
        // If from risky recruit: after discard, end turn (canFormGroup=false).
        // If from scout/other: after discard, player can still form groups.
        return {
          ...state,
          zaptieTrigger: undefined,
          turnStep: 'selection',
          canFormGroup: !fromRisky, // risky recruit Заптие: no forming after discard
          actionsRemaining: fromRisky ? 0 : state.actionsRemaining,
          message: fromRisky
            ? 'Заптие от рисковано вербуване! Изчисти ръката до лимита, след което ходът приключва.'
            : 'Подбор на революционери',
        };
      }

      // Hand is within limit
      if (fromRisky) {
        // Risky recruit Заптие with no discard needed — end turn immediately
        return advanceTurn({ ...state, zaptieTrigger: undefined });
      }

      // Scout/other Заптие — resume turn with remaining actions
      const resumeStep: TurnStep = state.actionsRemaining > 0 ? 'recruiting' : 'selection';
      return {
        ...state,
        zaptieTrigger: undefined,
        turnStep: resumeStep,
        message: resumeStep === 'recruiting'
          ? `Комитетът е разкрит. Продължаваш с останалите ${state.actionsRemaining} действия.`
          : 'Подбор на революционери',
      };
    }

    // ── SOFRONIY ABILITY ───────────────────────────────────────
    case 'USE_SOFRONIY_ABILITY': {
      if (state.turnStep !== 'recruiting') return state;
      if (state.sofroniyAbilityUsed) return { ...state, message: 'Способността на Софроний вече е използвана този ход.' };
      if (!player.traits.includes('sofroniy')) return state;

      // Peek the top card of the deck (place it face-up on the field without action cost)
      if (state.deck.length === 0) return { ...state, message: 'Тестето е изчерпано.' };

      const peekedCard = state.deck[0];
      const newDeck = state.deck.slice(1);

      if (peekedCard.type === 'zaptie') {
        // Заптие goes to field face-up but does NOT affect the player (per rules)
        const newField = [...state.field, peekedCard];
        const newFieldFaceUp = [...state.fieldFaceUp, true];
        return replenishField({
          ...state,
          deck: newDeck,
          field: newField,
          fieldFaceUp: newFieldFaceUp,
          sofroniyAbilityUsed: true,
          message: `Софроний: открито Заптие (сила ${peekedCard.strength}) — поставено на масата без последствия.`,
        });
      }

      // Non-Заптие: place face-up on field for safe recruit
      const newField = [...state.field, peekedCard];
      const newFieldFaceUp = [...state.fieldFaceUp, true];
      return {
        ...state,
        deck: newDeck,
        field: newField,
        fieldFaceUp: newFieldFaceUp,
        sofroniyAbilityUsed: true,
        message: `Софроний: открита карта "${peekedCard.name}" — поставена с лице нагоре без разход на ход.`,
      };
    }

    // ── ХАДЖИ ДИМИТЪР ABILITY ──────────────────────────────────
    case 'USE_HADZHI_ABILITY': {
      if (state.turnStep !== 'recruiting') return state;
      if (state.hadzhiAbilityUsed) return { ...state, message: 'Способността на Хаджи Димитър вече е използвана.' };
      if (!player.traits.includes('hadzhi')) return state;

      const { fieldIndex } = action;
      const targetCard = state.field[fieldIndex];
      if (!targetCard || targetCard.type !== 'zaptie') {
        return { ...state, message: 'Хаджи Димитър: изберете Заптие от масата.' };
      }

      const newField = state.field.filter((_, i) => i !== fieldIndex);
      const newFieldFaceUp = state.fieldFaceUp.filter((_, i) => i !== fieldIndex);

      return replenishField({
        ...state,
        field: newField,
        fieldFaceUp: newFieldFaceUp,
        hadzhiAbilityUsed: true,
        usedCards: [...state.usedCards, targetCard],
        message: `Хаджи Димитър: Заптие (сила ${targetCard.strength}) е премахнато от масата.`,
      });
    }

    // ── ПАНАЙОТ ХИТОВ: pick cards ──────────────────────────────
    case 'PANAYOT_PICK_CARD': {
      if (!state.panayotTrigger) return state;
      const { beneficiaryPlayerIndex, defeatedPlayerIndex } = state.panayotTrigger;
      const beneficiary = state.players[beneficiaryPlayerIndex];
      const defeated = state.players[defeatedPlayerIndex];

      const pickedCard = defeated.hand.find(c => c.id === action.cardId);
      if (!pickedCard) return state;

      // Count how many cards beneficiary has already picked this trigger (max 2)
      // We track this by checking if the card is still in defeated's hand
      const newDefeatedHand = defeated.hand.filter(c => c.id !== action.cardId);
      const newBeneficiaryHand = [...beneficiary.hand, pickedCard];

      const players = state.players.map((p, i) => {
        if (i === defeatedPlayerIndex) return { ...p, hand: newDefeatedHand };
        if (i === beneficiaryPlayerIndex) return { ...p, hand: newBeneficiaryHand };
        return p;
      });

      // Check if beneficiary has picked 2 cards already
      const pickedCount = newBeneficiaryHand.length - (beneficiary.hand.length);
      // We need to track picks — use a simple approach: if beneficiary already picked 2 (original hand + 2), close trigger
      // Actually count: original defeated hand minus current = cards picked
      const originalDefeatedCount = state.players[defeatedPlayerIndex].hand.length;
      const pickedSoFar = originalDefeatedCount - newDefeatedHand.length;

      const newPanayotTrigger = pickedSoFar >= 2 || newDefeatedHand.length === 0
        ? undefined
        : state.panayotTrigger;

      return {
        ...state,
        players,
        panayotTrigger: newPanayotTrigger,
        message: newPanayotTrigger
          ? `Панайот Хитов: взета карта "${pickedCard.name}". Избери още 1.`
          : `Панайот Хитов: взети 2 карти от разбития комитет.`,
      };
    }

    case 'PANAYOT_SKIP': {
      if (!state.panayotTrigger) return state;
      return { ...state, panayotTrigger: undefined, message: 'Панайот Хитов: пропуснато.' };
    }

    // ── ЛЮБЕН КАРАВЕЛОВ: choose stat for end-game boost ────────
    case 'LYUBEN_CHOOSE_STAT': {
      if (!player.traits.includes('lyuben')) return state;
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex
          ? { ...p, lyubenStatChoice: action.statType }
          : p
      );
      return {
        ...state,
        players,
        message: `Любен Каравелов: в края на играта ще се повиши показател "${action.statType}".`,
      };
    }

    // ── ПОП ХАРИТОН: form group during defeat ──────────────────
    case 'POP_HARITON_FORM_GROUP': {
      if (!state.popHaritonForming) return state;
      // After forming, clear hand and end turn
      const { statType } = action;
      const selectedHand = player.hand.filter(c => state.selectedCards.includes(c.id));
      const hayduti = selectedHand.filter(c => c.type === 'haydut');
      if (hayduti.length === 0) return state;

      const baseStrength = getGroupStrength(hayduti);
      const traitBonus = getTraitGroupBonus(player, hayduti, statType);
      const effectiveStrength = baseStrength + traitBonus;
      const currentStatValue = player.stats[statType];
      const targetValue = getMaxReachableStatValue(currentStatValue, effectiveStrength);

      if (!targetValue) {
        return { ...state, message: `Недостатъчна сила за подобрение.` };
      }

      const byContribution = canFormGroupByContribution(hayduti);
      const byColor = canFormGroupByColor(hayduti);
      if (!byContribution && !byColor) {
        return { ...state, message: 'Невалидна група!' };
      }

      const newStats = { ...player.stats, [statType]: targetValue };
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex
          ? { ...p, stats: newStats, hand: [] } // hand cleared after forming
          : p
      );

      return advanceTurn({
        ...state,
        players,
        selectedCards: [],
        popHaritonForming: false,
        turnStep: 'end',
        message: `Поп Харитон: подобрен "${statType}" до ${targetValue}. Комитетът е изчистен.`,
      });
    }

    case 'POP_HARITON_SKIP': {
      if (!state.popHaritonForming) return state;
      // Clear hand and end turn
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: [] } : p
      );
      return advanceTurn({
        ...state,
        players,
        popHaritonForming: false,
        turnStep: 'end',
        message: 'Поп Харитон: пропуснато. Комитетът е изчистен.',
      });
    }

    // ── DISMISS MESSAGE ────────────────────────────────────────
    case 'DISMISS_MESSAGE': {
      return { ...state, message: '' };
    }

    default:
      return state;
  }
}
