import { registerRule } from '../rule-registry';
import { TurnStep } from '../../../types/state';
import { advanceTurnEffects } from '../helpers/turn-helpers';
import { continueDefeatResolutionEffects } from '../helpers/defeat-helpers';
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

    // ── DEFEAT: delegate to defeat resolution pipeline ──
    if (isDefeated) {
      const player = state.players[state.currentPlayerIndex];
      const source: 'scout' | 'risky_recruit' = zaptie.fromRiskyRecruit ? 'risky_recruit' : 'scout';

      const panayotPlayerIndex = state.players.findIndex(
        (p, i) => i !== state.currentPlayerIndex && p.traits.includes('panayot')
      );

      const effects: Effect[] = [
        { type: 'SET_ZAPTIE_TRIGGER', zaptieTrigger: undefined },
        { type: 'SET_PANAYOT_TRIGGER', panayotTrigger: undefined },
        {
          type: 'SET_DEFEAT_CONTEXT',
          defeatContext: {
            source,
            defeatedPlayerIndex: state.currentPlayerIndex,
            popAvailable: source !== 'risky_recruit' && !!(zaptie.popHaritonTriggered) && player.hand.length > 0,
            petkoAvailable: !!(zaptie.petkoVoyTriggered) && player.hand.length > 0,
            panayotBeneficiaryIndex: (panayotPlayerIndex >= 0 && player.hand.length > 0) ? panayotPlayerIndex : undefined,
            remainingCardIds: player.hand.map(c => c.id),
          },
        },
      ];

      const intermediate = applyEffects(state, effects);
      effects.push(...continueDefeatResolutionEffects(intermediate));

      return effects;
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
