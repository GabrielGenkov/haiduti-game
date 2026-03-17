import { registerRule } from '../rule-registry';
import { TurnStep } from '../../../types/state';
import { advanceTurnEffects } from '../helpers/turn-helpers';
import { applyEffects } from '../../effects/apply-effect';
import { emitEvent } from '../../event-collector';
import type { Effect } from '../../effects/types';

registerRule({
  id: 'acknowledge-zaptie',
  priority: 25,
  when: ({ state, action }) => action.type === 'ACKNOWLEDGE_ZAPTIE' && !!state.zaptieTrigger,
  execute: ({ state }) => {
    const zapPlayer = state.players[state.currentPlayerIndex];
    const zaptie = state.zaptieTrigger!;
    const isDefeated = zaptie.isDefeated;

    emitEvent({
      type: 'ZAPTIE_ACKNOWLEDGED',
      wasDefeated: isDefeated,
      resumeStep: isDefeated ? 'selection' : (state.actionsRemaining > 0 ? 'recruiting' : 'selection'),
    });

    // ── DEFEAT cases ──

    // Petko Voyvoda: player keeps 2 cards
    if (zaptie.petkoVoyTriggered) {
      return [
        { type: 'SET_ZAPTIE_TRIGGER', zaptieTrigger: undefined },
        { type: 'SET_TURN_FLOW', updates: { turnStep: 'selection' as TurnStep, actionsRemaining: 0, canFormGroup: false } },
        { type: 'SET_MESSAGE', message: `Петко Войвода: запазваш 2 карти по избор. Изхвърли останалите.` },
      ];
    }

    // Pop Hariton: form 1 group before discarding
    if (zaptie.popHaritonTriggered) {
      return [
        { type: 'SET_ZAPTIE_TRIGGER', zaptieTrigger: undefined },
        { type: 'SET_TURN_FLOW', updates: { turnStep: 'forming' as TurnStep, actionsRemaining: 0, canFormGroup: true, popHaritonForming: true } },
        { type: 'SET_MESSAGE', message: `Поп Харитон: можеш да сформираш група преди да изхвърлиш картите.` },
      ];
    }

    // Panayot pending (defeat)
    if (state.panayotTrigger) {
      return [
        { type: 'SET_ZAPTIE_TRIGGER', zaptieTrigger: undefined },
        { type: 'SET_MESSAGE', message: `Панайот Хитов: ${state.players[state.panayotTrigger.beneficiaryPlayerIndex].name} избира 2 карти от разбития комитет!` },
      ];
    }

    // Regular defeat — hand already cleared, hide player and skip to end
    if (isDefeated) {
      return [
        { type: 'SET_ZAPTIE_TRIGGER', zaptieTrigger: undefined },
        { type: 'UPDATE_PLAYER', playerIndex: state.currentPlayerIndex, updates: { isRevealed: false } },
        { type: 'SET_TURN_FLOW', updates: { turnStep: 'end' as TurnStep, actionsRemaining: 0, canFormGroup: false } },
        { type: 'SET_MESSAGE', message: `Комитетът е разбит! Всички карти са изгубени.` },
      ];
    }

    // ── NON-DEFEAT cases ──
    const fromRisky = zaptie.fromRiskyRecruit ?? false;
    const effectiveNabor = zapPlayer.stats.nabor + (zapPlayer.dyadoIlyoActive ? 2 : 0);
    const needsSelection = zapPlayer.hand.length > effectiveNabor;

    if (needsSelection) {
      return [
        { type: 'SET_ZAPTIE_TRIGGER', zaptieTrigger: undefined },
        {
          type: 'SET_TURN_FLOW',
          updates: {
            turnStep: 'selection' as TurnStep,
            canFormGroup: !fromRisky,
            actionsRemaining: fromRisky ? 0 : state.actionsRemaining,
          },
        },
        {
          type: 'SET_MESSAGE',
          message: fromRisky
            ? 'Заптие от рисковано вербуване! Изчисти ръката до лимита, след което ходът приключва.'
            : 'Подбор на революционери',
        },
      ];
    }

    // Hand is within limit
    if (fromRisky) {
      const clearEffects: Effect[] = [
        { type: 'SET_ZAPTIE_TRIGGER', zaptieTrigger: undefined },
      ];
      const intermediate = applyEffects(state, clearEffects);
      return [...clearEffects, ...advanceTurnEffects(intermediate)];
    }

    // Resume turn with remaining actions
    const resumeStep: TurnStep = state.actionsRemaining > 0 ? 'recruiting' : 'selection';
    return [
      { type: 'SET_ZAPTIE_TRIGGER', zaptieTrigger: undefined },
      { type: 'SET_TURN_FLOW', updates: { turnStep: resumeStep } },
      {
        type: 'SET_MESSAGE',
        message: resumeStep === 'recruiting'
          ? `Комитетът е разкрит. Продължаваш с останалите ${state.actionsRemaining} действия.`
          : 'Подбор на революционери',
      },
    ];
  },
});
