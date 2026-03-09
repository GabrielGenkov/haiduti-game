import { GameState, TurnStep } from '../../types/state';
import { Card } from '../../types/card';
import { getActiveTraits } from '../../traits/trait-registry';
import { getTotalZaptieBoyna } from '../../utils/field';
import { replenishField } from './replenish-field';

export function handleZaptieEncounter(state: GameState, zaptieCard: Card): GameState {
  const player = state.players[state.currentPlayerIndex];

  // Let traits intercept the Zaptie (Vasil Levski, Dyado Ilyo)
  for (const trait of getActiveTraits(player)) {
    if (trait.onZaptieEncounter) {
      const result = trait.onZaptieEncounter(state, zaptieCard);
      if (result) return replenishField(result);
    }
  }

  const wasSecret = !player.isRevealed;

  if (wasSecret) {
    // Normal reveal
    const players = state.players.map((p, i) =>
      i === state.currentPlayerIndex ? { ...p, isRevealed: true } : p
    );
    return {
      ...state,
      players,
      zaptieTrigger: { wasSecret: true, isDefeated: false, zaptieCards: [zaptieCard] },
      message: `Заптие! Комитетът на ${player.name} е разкрит!`,
    };
  } else {
    // Already revealed — check if defeated
    const totalZaptieBoyna = getTotalZaptieBoyna(state.field, state.fieldFaceUp);
    const playerBoyna = player.stats.boyna;

    if (totalZaptieBoyna > playerBoyna) {
      // Committee defeated
      const newField = state.field.filter((c, i) => !(state.fieldFaceUp[i] && c.type === 'zaptie'));
      const keptIndices = state.field.reduce<number[]>((acc, c, i) => {
        if (!(state.fieldFaceUp[i] && c.type === 'zaptie')) acc.push(i);
        return acc;
      }, []);
      const newFieldFaceUp = keptIndices.map(() => false);

      // Check defeat traits
      let hasPetko = false;
      let hasPop = false;
      for (const trait of getActiveTraits(player)) {
        if (trait.onDefeat) {
          const result = trait.onDefeat(state, player);
          if (result) {
            if ('keepCards' in result) hasPetko = true;
            if ('allowFormGroup' in result) hasPop = true;
          }
        }
      }

      // Check Panayot (cross-player trait)
      const panayotPlayerIndex = state.players.findIndex(
        (p, i) => i !== state.currentPlayerIndex && p.traits.includes('panayot')
      );

      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex
          ? { ...p, isRevealed: true, hand: (hasPetko || hasPop) ? p.hand : [] }
          : p
      );

      const panayotTrigger = panayotPlayerIndex >= 0 && player.hand.length > 0
        ? { beneficiaryPlayerIndex: panayotPlayerIndex, defeatedPlayerIndex: state.currentPlayerIndex, availableCards: [...player.hand] }
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
      // Already revealed but not defeated
      return {
        ...state,
        zaptieTrigger: { wasSecret: false, isDefeated: false, zaptieCards: [zaptieCard] },
        message: `Заптие! Комитетът на ${player.name} вече е разкрит. Продължаваш.`,
      };
    }
  }
}
