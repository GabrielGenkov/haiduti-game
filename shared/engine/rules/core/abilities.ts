import { registerRule } from '../rule-registry';
import { replenishFieldEffects } from '../helpers/field-helpers';
import { applyEffects } from '../../effects/apply-effect';
import { emitEvent } from '../../event-collector';
import type { Effect } from '../../effects/types';

registerRule({
  id: 'sofroniy-ability',
  priority: 70,
  when: ({ state, action }) => {
    if (action.type !== 'USE_SOFRONIY_ABILITY') return false;
    if (state.turnStep !== 'recruiting') return false;
    const player = state.players[state.currentPlayerIndex];
    return player.traits.includes('sofroniy');
  },
  execute: ({ state }) => {
    if (state.sofroniyAbilityUsed) {
      return [{ type: 'SET_MESSAGE', message: 'Способността на Софроний вече е използвана този ход.' }];
    }
    if (state.deck.length === 0) {
      return [{ type: 'SET_MESSAGE', message: 'Тестето е изчерпано.' }];
    }

    const peekedCard = state.deck[0];
    emitEvent({ type: 'SOFRONIY_ABILITY_USED', revealedCardId: peekedCard.id, revealedCardName: peekedCard.name, isZaptie: peekedCard.type === 'zaptie' });

    const newSideFieldIndex = state.sideField.length;
    return [
      { type: 'MOVE_CARDS', cardIds: [peekedCard.id], from: { zone: 'deck' }, to: { zone: 'sideField' } },
      { type: 'SET_FIELD_VISIBILITY', fieldZone: 'sideField', indices: [newSideFieldIndex], visible: true },
      { type: 'SET_TURN_FLOW', updates: { sofroniyAbilityUsed: true } },
      { type: 'SET_MESSAGE', message: peekedCard.type === 'zaptie'
        ? `Софроний Врачански откри Заптие (сила ${peekedCard.strength}) — поставено встрани без последствия.`
        : `Софроний Врачански разкри "${peekedCard.name}" — поставена встрани с лице нагоре.` },
    ];
  },
});

registerRule({
  id: 'hadzhi-ability',
  priority: 70,
  when: ({ state, action }) => {
    if (action.type !== 'USE_HADZHI_ABILITY') return false;
    if (state.turnStep !== 'recruiting') return false;
    const player = state.players[state.currentPlayerIndex];
    return player.traits.includes('hadzhi');
  },
  execute: ({ state, action }) => {
    if (state.hadzhiAbilityUsed) {
      return [{ type: 'SET_MESSAGE', message: 'Способността на Хаджи Димитър вече е използвана.' }];
    }

    const { fieldIndex } = action as { type: 'USE_HADZHI_ABILITY'; fieldIndex: number };
    const targetCard = state.field[fieldIndex];
    if (!targetCard || targetCard.type !== 'zaptie') {
      return [{ type: 'SET_MESSAGE', message: 'Хаджи Димитър: изберете Заптие от масата.' }];
    }

    emitEvent({ type: 'HADZHI_ABILITY_USED', removedZaptieCardId: targetCard.id, removedZaptieStrength: targetCard.strength ?? 0, fieldIndex });

    const moveEffects: Effect[] = [
      { type: 'MOVE_CARDS', cardIds: [targetCard.id], from: { zone: 'field' }, to: { zone: 'usedCards' } },
      { type: 'SET_TURN_FLOW', updates: { hadzhiAbilityUsed: true } },
      { type: 'SET_MESSAGE', message: `Хаджи Димитър: Заптие (сила ${targetCard.strength}) е премахнато от масата.` },
    ];

    const intermediate = applyEffects(state, moveEffects);
    return [...moveEffects, ...replenishFieldEffects(intermediate)];
  },
});
