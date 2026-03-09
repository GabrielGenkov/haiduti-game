import { TraitStrategy, registerTrait } from './trait-registry';
import { TurnStep } from '../types/state';

const vasilLevskiTrait: TraitStrategy = {
  id: 'vasil_levski',

  onZaptieEncounter(state, zaptieCard) {
    const player = state.players[state.currentPlayerIndex];
    if (player.zaptieTurnIgnored) return null;

    const players = state.players.map((p, i) =>
      i === state.currentPlayerIndex ? { ...p, zaptieTurnIgnored: true } : p
    );
    const levskyStep: TurnStep = state.actionsRemaining > 0 ? 'recruiting' : 'selection';
    return {
      ...state,
      players,
      turnStep: levskyStep,
      message: `Васил Левски: Заптието (сила ${zaptieCard.strength}) е игнорирано! Продължаваш хода.`,
    };
  },

  getEndGameBonusPoints(_player, effectiveStats, allEffectiveStats) {
    const maxNabor = Math.max(...allEffectiveStats.map(s => s.nabor));
    const maxDeynost = Math.max(...allEffectiveStats.map(s => s.deynost));
    const maxBoyna = Math.max(...allEffectiveStats.map(s => s.boyna));
    let bonus = 0;
    if (effectiveStats.nabor === maxNabor) bonus += 6;
    if (effectiveStats.deynost === maxDeynost) bonus += 6;
    if (effectiveStats.boyna === maxBoyna) bonus += 6;
    if (bonus > 0) {
      return { points: bonus, label: `Васил Левски: +${bonus} (водещ по показател)` };
    }
    return null;
  },

  resetTurnState() {
    return { zaptieTurnIgnored: false };
  },
};

registerTrait(vasilLevskiTrait);
