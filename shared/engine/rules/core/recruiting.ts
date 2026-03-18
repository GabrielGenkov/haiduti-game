import { registerRule } from '../rule-registry';
import { TurnStep } from '../../../types/state';
import { replenishFieldEffects } from '../helpers/field-helpers';
import { buildZaptieEncounterEffects } from '../helpers/zaptie-helpers';
import { getTotalZaptieBoyna } from '../../../utils/field';
import { applyEffects } from '../../effects/apply-effect';
import { emitEvent } from '../../event-collector';
import type { Effect } from '../../effects/types';

registerRule({
  id: 'scout',
  priority: 20,
  when: ({ state, action }) =>
    action.type === 'SCOUT' && state.turnStep === 'recruiting' && state.actionsRemaining > 0,
  execute: ({ state, action }) => {
    const { fieldIndex, zone: actionZone } = action as { type: 'SCOUT'; fieldIndex: number; zone?: 'field' | 'sideField' };
    const zone = actionZone ?? 'field';
    const faceUpArr = zone === 'field' ? state.fieldFaceUp : state.sideFieldFaceUp;
    const cardArr = zone === 'field' ? state.field : state.sideField;
    if (faceUpArr[fieldIndex]) return [];

    const player = state.players[state.currentPlayerIndex];
    const card = cardArr[fieldIndex];
    if (!card) return [];
    const scoutActionsRemaining = state.actionsRemaining - 1;
    const scoutActionsUsed = state.actionsUsed + 1;
    const scoutNextStep: TurnStep = scoutActionsRemaining <= 0 ? 'selection' : 'recruiting';

    emitEvent({
      type: 'CARD_SCOUTED', fieldIndex, cardId: card.id, cardName: card.name,
      cardType: card.type, isZaptie: card.type === 'zaptie',
    });

    const effects: Effect[] = [
      { type: 'SET_FIELD_VISIBILITY', fieldZone: zone, indices: [fieldIndex], visible: true },
      { type: 'SET_TURN_FLOW', updates: { actionsRemaining: scoutActionsRemaining, actionsUsed: scoutActionsUsed, turnStep: scoutNextStep } },
      {
        type: 'SET_MESSAGE',
        message: card.type === 'zaptie'
          ? `Проучване: открито Заптие (сила ${card.strength})!`
          : `Проучване: открита карта "${card.name}"`,
      },
    ];

    if (card.type === 'zaptie') {
      if (!player.isRevealed) {
        const intermediate = applyEffects(state, effects);
        effects.push(...buildZaptieEncounterEffects(intermediate, card));
      } else {
        // Already revealed — check total zaptie power vs player boyna
        const intermediate = applyEffects(state, effects);
        const totalZaptieBoyna =
          getTotalZaptieBoyna(intermediate.field, intermediate.fieldFaceUp) +
          getTotalZaptieBoyna(intermediate.sideField, intermediate.sideFieldFaceUp);
        if (totalZaptieBoyna > player.stats.boyna) {
          effects.push(...buildZaptieEncounterEffects(intermediate, card));
        }
      }
    }

    return effects;
  },
});

registerRule({
  id: 'safe-recruit',
  priority: 20,
  when: ({ state, action }) =>
    action.type === 'SAFE_RECRUIT' && state.turnStep === 'recruiting' && state.actionsRemaining > 0,
  execute: ({ state, action }) => {
    const { fieldIndex, zone: actionZone } = action as { type: 'SAFE_RECRUIT'; fieldIndex: number; zone?: 'field' | 'sideField' };
    const zone = actionZone ?? 'field';
    const faceUpArr = zone === 'field' ? state.fieldFaceUp : state.sideFieldFaceUp;
    const cardArr = zone === 'field' ? state.field : state.sideField;
    if (!faceUpArr[fieldIndex]) return [];
    const card = cardArr[fieldIndex];
    if (!card || card.type === 'zaptie') return [];

    const newActionsRemaining = state.actionsRemaining - 1;
    const newActionsUsed = state.actionsUsed + 1;
    const newTurnStep: TurnStep = newActionsRemaining <= 0 ? 'selection' : 'recruiting';

    emitEvent({ type: 'CARD_RECRUITED_SAFE', fieldIndex, cardId: card.id, cardName: card.name });

    const moveEffects: Effect[] = [
      { type: 'MOVE_CARDS', cardIds: [card.id], from: { zone }, to: { zone: 'hand', playerIndex: state.currentPlayerIndex } },
      { type: 'SET_TURN_FLOW', updates: { actionsRemaining: newActionsRemaining, actionsUsed: newActionsUsed, turnStep: newTurnStep } },
      { type: 'SET_MESSAGE', message: `Сигурно вербуване: взета карта "${card.name}"` },
    ];

    const intermediate = applyEffects(state, moveEffects);
    // Only replenish the main field (sideField is never auto-replenished)
    return [...moveEffects, ...(zone === 'field' ? replenishFieldEffects(intermediate) : [])];
  },
});

registerRule({
  id: 'risky-recruit',
  priority: 20,
  when: ({ state, action }) =>
    action.type === 'RISKY_RECRUIT' && state.turnStep === 'recruiting' && state.actionsRemaining > 0,
  execute: ({ state }) => {
    if (state.deck.length === 0) {
      return [{ type: 'SET_MESSAGE', message: 'Тестето е изчерпано! Не може рисковано вербуване.' }];
    }

    const card = state.deck[0];
    const riskyActionsRemaining = state.actionsRemaining - 1;

    if (card.type === 'zaptie') {
      emitEvent({ type: 'CARD_RECRUITED_RISKY', cardId: card.id, cardName: card.name, cardType: card.type, drawnZaptie: true });

      // Place zaptie in main field (null slot) or sideField if field is full
      const nullIdx = state.field.findIndex(c => c === null);
      const zapZone: 'field' | 'sideField' = nullIdx >= 0 ? 'field' : 'sideField';
      const zapIdx = nullIdx >= 0 ? nullIdx : state.sideField.length;

      const effects: Effect[] = [
        { type: 'MOVE_CARDS', cardIds: [card.id], from: { zone: 'deck' }, to: { zone: zapZone } },
        { type: 'SET_FIELD_VISIBILITY', fieldZone: zapZone, indices: [zapIdx], visible: true },
        { type: 'SET_TURN_FLOW', updates: { actionsUsed: state.actionsUsed + 1, actionsRemaining: riskyActionsRemaining } },
      ];

      const intermediate = applyEffects(state, effects);
      const zapEffects = buildZaptieEncounterEffects(intermediate, card);
      effects.push(...zapEffects);

      // Tag zaptieTrigger with fromRiskyRecruit if present
      const combined = [...effects];
      const zapTriggerIdx = combined.findIndex(
        (e, i) => i >= effects.length - zapEffects.length && e.type === 'SET_ZAPTIE_TRIGGER' && (e as any).zaptieTrigger
      );
      if (zapTriggerIdx >= 0) {
        const zt = (combined[zapTriggerIdx] as any);
        if (zt.zaptieTrigger) {
          combined[zapTriggerIdx] = {
            ...zt,
            zaptieTrigger: { ...zt.zaptieTrigger, fromRiskyRecruit: true },
          };
        }
      }
      return combined;
    }

    // Normal card
    emitEvent({ type: 'CARD_RECRUITED_RISKY', cardId: card.id, cardName: card.name, cardType: card.type, drawnZaptie: false });

    const riskyNextStep: TurnStep = riskyActionsRemaining <= 0 ? 'selection' : 'recruiting';
    return [
      { type: 'MOVE_CARDS', cardIds: [card.id], from: { zone: 'deck' }, to: { zone: 'hand', playerIndex: state.currentPlayerIndex } },
      { type: 'SET_TURN_FLOW', updates: { actionsRemaining: riskyActionsRemaining, actionsUsed: state.actionsUsed + 1, turnStep: riskyNextStep } },
      { type: 'SET_MESSAGE', message: `Рисковано вербуване: взета карта "${card.name}"`, publicMessage: `Рисковано вербуване: взета карта от тестето.` },
    ];
  },
});
