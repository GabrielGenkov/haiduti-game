import { GameState } from '../../../types/state';
import { Card, DeyetsTraitId } from '../../../types/card';
import { getTotalZaptieBoyna } from '../../../utils/field';
import { replenishFieldEffects } from './field-helpers';
import { applyEffects } from '../../effects/apply-effect';
import { emitEvent } from '../../event-collector';
import type { Effect } from '../../effects/types';

// ── Trait interceptors (inlined from vasil-levski.ts and dyado-ilyo.ts) ──

interface TraitInterception {
  id: DeyetsTraitId;
  effects: Effect[];
}

function vasilLevskiIntercept(state: GameState, _zaptieCard: Card): Effect[] | null {
  const player = state.players[state.currentPlayerIndex];
  if (player.zaptieTurnIgnored) return null;

  return [
    { type: 'UPDATE_PLAYER', playerIndex: state.currentPlayerIndex, updates: { zaptieTurnIgnored: true } },
    { type: 'SET_TURN_FLOW', updates: { turnStep: state.actionsRemaining > 0 ? 'recruiting' as const : 'selection' as const } },
    { type: 'SET_MESSAGE', message: `Васил Левски: Заптието (сила ${_zaptieCard.strength}) е игнорирано! Продължаваш хода.` },
  ];
}

function dyadoIlyoIntercept(state: GameState, zaptieCard: Card): Effect[] | null {
  const player = state.players[state.currentPlayerIndex];
  if (player.isRevealed) return null;

  return [
    { type: 'MOVE_CARDS', cardIds: [zaptieCard.id], from: { zone: 'field' }, to: { zone: 'usedCards' } },
    { type: 'UPDATE_PLAYER', playerIndex: state.currentPlayerIndex, updates: { isRevealed: true, dyadoIlyoActive: true } },
    { type: 'SET_TURN_FLOW', updates: { actionsRemaining: 0, canFormGroup: false } },
    { type: 'SET_ZAPTIE_TRIGGER', zaptieTrigger: { wasSecret: true, isDefeated: false, zaptieCards: [zaptieCard], dyadoIlyoTriggered: true } },
    { type: 'SET_MESSAGE', message: `Дядо Ильо: Заптието е отстранено! Комитетът е разкрит, но можеш да задържиш 2 карти повече.` },
  ];
}

function collectInterceptions(state: GameState, zaptieCard: Card): TraitInterception[] {
  const player = state.players[state.currentPlayerIndex];
  const result: TraitInterception[] = [];

  if (player.traits.includes('vasil_levski')) {
    const effs = vasilLevskiIntercept(state, zaptieCard);
    if (effs) result.push({ id: 'vasil_levski', effects: effs });
  }

  if (player.traits.includes('dyado_ilyo')) {
    const effs = dyadoIlyoIntercept(state, zaptieCard);
    if (effs) result.push({ id: 'dyado_ilyo', effects: effs });
  }

  return result;
}

// ── Main zaptie encounter ──

export function buildZaptieEncounterEffects(state: GameState, zaptieCard: Card): Effect[] {
  const player = state.players[state.currentPlayerIndex];
  const interceptions = collectInterceptions(state, zaptieCard);

  // Multiple traits can intercept → open choice decision
  if (interceptions.length > 1) {
    emitEvent({ type: 'TRAIT_CHOICE_OPENED', options: interceptions.map(t => t.id), zaptieCardId: zaptieCard.id });
    return [
      {
        type: 'SET_DECISION',
        decision: {
          id: `trait-choice-${Date.now()}`,
          kind: 'trait_choice',
          ownerPlayerIndex: state.currentPlayerIndex,
          prompt: 'Избери коя способност да приложиш срещу Заптието.',
          options: interceptions.map(t => t.id),
          context: { encounteredCardId: zaptieCard.id },
        },
      },
      { type: 'SET_MESSAGE', message: 'Няколко способности могат да се приложат. Избери една.' },
    ];
  }

  // Single trait intercept → apply it + replenish
  if (interceptions.length === 1) {
    const interceptEffects = interceptions[0].effects;
    emitEvent({
      type: 'ZAPTIE_ENCOUNTERED', zaptieCardId: zaptieCard.id,
      zaptieStrength: zaptieCard.strength ?? 0, wasSecret: !player.isRevealed,
      isDefeated: false, traitIntercepted: interceptions[0].id,
      petkoTriggered: false, popHaritonTriggered: false,
    });
    const intermediate = applyEffects(state, interceptEffects);
    return [...interceptEffects, ...replenishFieldEffects(intermediate)];
  }

  // No interception — normal zaptie encounter
  const wasSecret = !player.isRevealed;

  if (wasSecret) {
    // Normal reveal
    emitEvent({
      type: 'ZAPTIE_ENCOUNTERED', zaptieCardId: zaptieCard.id,
      zaptieStrength: zaptieCard.strength ?? 0, wasSecret: true,
      isDefeated: false, traitIntercepted: undefined,
      petkoTriggered: false, popHaritonTriggered: false,
    });
    return [
      { type: 'UPDATE_PLAYER', playerIndex: state.currentPlayerIndex, updates: { isRevealed: true } },
      { type: 'SET_ZAPTIE_TRIGGER', zaptieTrigger: { wasSecret: true, isDefeated: false, zaptieCards: [zaptieCard] } },
      { type: 'SET_MESSAGE', message: `Заптие! Комитетът на ${player.name} е разкрит!` },
    ];
  }

  // Already revealed — check if defeated
  const totalZaptieBoyna = getTotalZaptieBoyna(state.field, state.fieldFaceUp);
  const playerBoyna = player.stats.boyna;

  if (totalZaptieBoyna > playerBoyna) {
    // Committee defeated — check defeat traits
    const hasPetko = player.traits.includes('petko_voy') && player.hand.length > 0;
    const hasPop = player.traits.includes('pop_hariton') && player.hand.length > 0;

    // Find Panayot beneficiary
    const panayotPlayerIndex = state.players.findIndex(
      (p, i) => i !== state.currentPlayerIndex && p.traits.includes('panayot')
    );

    // Remove face-up zapties from field
    const keptFieldIds: string[] = [];
    const removedZaptieIds: string[] = [];
    state.field.forEach((c, i) => {
      if (state.fieldFaceUp[i] && c.type === 'zaptie') {
        removedZaptieIds.push(c.id);
      } else {
        keptFieldIds.push(c.id);
      }
    });

    const effects: Effect[] = [];

    if (removedZaptieIds.length > 0) {
      effects.push({ type: 'MOVE_CARDS', cardIds: removedZaptieIds, from: { zone: 'field' }, to: { zone: 'usedCards' } });
    }

    // Reset all field visibility to face-down (for remaining cards)
    const remainingFieldCount = keptFieldIds.length;
    if (remainingFieldCount > 0) {
      effects.push({ type: 'SET_FIELD_VISIBILITY', fieldZone: 'field', indices: 'all', visible: false });
    }

    // Update player: revealed, clear hand unless petko/pop
    if (hasPetko || hasPop) {
      effects.push({ type: 'UPDATE_PLAYER', playerIndex: state.currentPlayerIndex, updates: { isRevealed: true } });
    } else {
      // Clear hand — move all to usedCards
      if (player.hand.length > 0) {
        effects.push({
          type: 'MOVE_CARDS',
          cardIds: player.hand.map(c => c.id),
          from: { zone: 'hand', playerIndex: state.currentPlayerIndex },
          to: { zone: 'usedCards' },
        });
      }
      effects.push({ type: 'UPDATE_PLAYER', playerIndex: state.currentPlayerIndex, updates: { isRevealed: true } });
    }

    effects.push(
      { type: 'SET_TURN_FLOW', updates: { actionsRemaining: 0, canFormGroup: false } },
      {
        type: 'SET_ZAPTIE_TRIGGER',
        zaptieTrigger: {
          wasSecret: false, isDefeated: true, zaptieCards: [zaptieCard],
          petkoVoyTriggered: hasPetko, popHaritonTriggered: hasPop,
        },
      },
    );

    if (panayotPlayerIndex >= 0 && player.hand.length > 0) {
      effects.push({
        type: 'SET_PANAYOT_TRIGGER',
        panayotTrigger: {
          beneficiaryPlayerIndex: panayotPlayerIndex,
          defeatedPlayerIndex: state.currentPlayerIndex,
          availableCards: [...player.hand],
        },
      });
    }

    emitEvent({
      type: 'ZAPTIE_ENCOUNTERED', zaptieCardId: zaptieCard.id,
      zaptieStrength: zaptieCard.strength ?? 0, wasSecret: false,
      isDefeated: true, traitIntercepted: undefined,
      petkoTriggered: hasPetko, popHaritonTriggered: hasPop,
    });

    effects.push({
      type: 'SET_MESSAGE',
      message: hasPetko
        ? `Заптие! Комитетът на ${player.name} е разбит! Петко Войвода: запазваш 2 карти по избор.`
        : hasPop
        ? `Заптие! Комитетът на ${player.name} е разбит! Поп Харитон: можеш да сформираш група преди да изхвърлиш.`
        : `Заптие! Комитетът на ${player.name} е разбит! Загубени всички карти.`,
    });

    return effects;
  }

  // Already revealed but not defeated
  emitEvent({
    type: 'ZAPTIE_ENCOUNTERED', zaptieCardId: zaptieCard.id,
    zaptieStrength: zaptieCard.strength ?? 0, wasSecret: false,
    isDefeated: false, traitIntercepted: undefined,
    petkoTriggered: false, popHaritonTriggered: false,
  });
  return [
    { type: 'SET_ZAPTIE_TRIGGER', zaptieTrigger: { wasSecret: false, isDefeated: false, zaptieCards: [zaptieCard] } },
    { type: 'SET_MESSAGE', message: `Заптие! Комитетът на ${player.name} вече е разкрит. Продължаваш.` },
  ];
}
