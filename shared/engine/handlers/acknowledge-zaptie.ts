import { registerAction } from '../action-registry';
import { TurnStep } from '../../types/state';
import { advanceTurn } from '../helpers/advance-turn';

registerAction('ACKNOWLEDGE_ZAPTIE', (state) => {
  const zapPlayer = state.players[state.currentPlayerIndex];
  const zaptie = state.zaptieTrigger;
  const isDefeated = zaptie?.isDefeated ?? false;

  // ── DEFEAT cases ──

  // Petko Voyvoda: player keeps 2 cards
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

  // Pop Hariton: form 1 group before discarding
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

  // Panayot pending (defeat)
  if (state.panayotTrigger) {
    return {
      ...state,
      zaptieTrigger: undefined,
      message: `Панайот Хитов: ${state.players[state.panayotTrigger.beneficiaryPlayerIndex].name} избира 2 карти от разбития комитет!`,
    };
  }

  // Regular defeat
  if (isDefeated) {
    return {
      ...state,
      zaptieTrigger: undefined,
      turnStep: 'selection',
      actionsRemaining: 0,
      canFormGroup: false,
      message: `Комитетът е разбит! Всички карти са изгубени. Натиснете "Продължи" за край на хода.`,
    };
  }

  // ── NON-DEFEAT cases ──
  const fromRisky = zaptie?.fromRiskyRecruit ?? false;
  const effectiveNabor = zapPlayer.stats.nabor + (zapPlayer.dyadoIlyoActive ? 2 : 0);
  const needsSelection = zapPlayer.hand.length > effectiveNabor;

  if (needsSelection) {
    return {
      ...state,
      zaptieTrigger: undefined,
      turnStep: 'selection',
      canFormGroup: !fromRisky,
      actionsRemaining: fromRisky ? 0 : state.actionsRemaining,
      message: fromRisky
        ? 'Заптие от рисковано вербуване! Изчисти ръката до лимита, след което ходът приключва.'
        : 'Подбор на революционери',
    };
  }

  // Hand is within limit
  if (fromRisky) {
    return advanceTurn({ ...state, zaptieTrigger: undefined });
  }

  // Resume turn with remaining actions
  const resumeStep: TurnStep = state.actionsRemaining > 0 ? 'recruiting' : 'selection';
  return {
    ...state,
    zaptieTrigger: undefined,
    turnStep: resumeStep,
    message: resumeStep === 'recruiting'
      ? `Комитетът е разкрит. Продължаваш с останалите ${state.actionsRemaining} действия.`
      : 'Подбор на революционери',
  };
});
