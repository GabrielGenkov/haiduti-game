import { registerAction } from '../action-registry';
import { GameAction } from '../../types/action';
import { getTrait, getTraitGroupBonus } from '../../traits/trait-registry';
import { getGroupStrength } from '../../utils/groups';
import { currentPlayer, withCurrentPlayer, pushNotification, getSelectedHayduti } from '../helpers/state-utils';
import { finalizeGroup } from '../helpers/finalize-group';
import { continueDefeatResolution } from '../helpers/defeat-resolution';
import { replenishField } from '../helpers/replenish-field';

registerAction('RESOLVE_DECISION', (state, action) => {
  const { decisionId, cardIds, contribution, statType, traitId } =
    action as Extract<GameAction, { type: 'RESOLVE_DECISION' }>;
  const decision = state.pendingDecision;
  if (!decision || decision.id !== decisionId) return state;

  switch (decision.kind) {
    case 'trait_choice': {
      const zaptie =
        state.field.find(card => card.id === decision.context.encounteredCardId) ??
        state.sideField.find(card => card.id === decision.context.encounteredCardId);
      if (!zaptie || zaptie.type !== 'zaptie' || !traitId) return state;

      const trait = getTrait(traitId);
      if (!trait?.onZaptieEncounter) return state;

      const result = trait.onZaptieEncounter(
        { ...state, pendingDecision: undefined },
        zaptie
      );
      return result ? replenishField(result) : state;
    }

    case 'card_choice': {
      if (decision.purpose === 'rakowski_keep' && state.pendingGroup) {
        const kept = (cardIds ?? [])
          .filter(cardId => decision.selectableCardIds.includes(cardId))
          .slice(0, 1);
        return finalizeGroup({ ...state, pendingDecision: undefined }, state.pendingGroup, kept);
      }

      if (decision.purpose === 'petko_keep' && state.defeatContext) {
        const keepIds = new Set(
          (cardIds ?? [])
            .filter(cardId => decision.selectableCardIds.includes(cardId))
            .slice(0, decision.maxChoices)
        );
        const player = currentPlayer(state);
        const nextHand = player.hand.filter(card => keepIds.has(card.id));
        const remainingCardIds = player.hand
          .filter(card => !keepIds.has(card.id))
          .map(card => card.id);
        const nextState = withCurrentPlayer(
          {
            ...state,
            pendingDecision: undefined,
            panayotTrigger: undefined,
            defeatContext: { ...state.defeatContext, remainingCardIds },
          },
          current => ({
            ...current,
            hand: nextHand,
            isRevealed: false,
          })
        );
        return continueDefeatResolution(nextState);
      }

      if (decision.purpose === 'panayot_take' && state.defeatContext) {
        const selected = new Set(
          (cardIds ?? [])
            .filter(cardId => decision.selectableCardIds.includes(cardId))
            .slice(0, decision.maxChoices)
        );
        const defeated = currentPlayer(state);
        const stolenCards = defeated.hand.filter(card => selected.has(card.id));
        const remainingCardIds = defeated.hand
          .filter(card => !selected.has(card.id))
          .map(card => card.id);

        const nextState = {
          ...state,
          pendingDecision: undefined,
          panayotTrigger: undefined,
          players: state.players.map((player, index) => {
            if (index === state.currentPlayerIndex) {
              return {
                ...player,
                hand: player.hand.filter(card => !selected.has(card.id)),
              };
            }
            if (index === decision.ownerPlayerIndex) {
              return {
                ...player,
                hand: [...player.hand, ...stolenCards],
              };
            }
            return player;
          }),
          defeatContext: { ...state.defeatContext, remainingCardIds },
        };

        return continueDefeatResolution(nextState);
      }

      return state;
    }

    case 'contribution_choice': {
      if (!state.pendingGroup || !contribution) return state;
      const player = currentPlayer(state);
      const hayduti = getSelectedHayduti(player, state.pendingGroup.selectedCardIds);
      const traitBonus = getTraitGroupBonus(player, hayduti, contribution);
      return finalizeGroup(
        { ...state, pendingDecision: undefined },
        {
          ...state.pendingGroup,
          chosenContribution: contribution,
          traitBonus,
          effectiveStrength: getGroupStrength(hayduti) + traitBonus,
        }
      );
    }

    case 'stat_choice': {
      if (!statType || !decision.selectableStats.includes(statType)) return state;
      return pushNotification(
        withCurrentPlayer({ ...state, pendingDecision: undefined }, player => ({
          ...player,
          lyubenStatChoice: statType,
        })),
        `Любен Каравелов ще повиши ${statType} в края на играта.`,
        'success'
      );
    }

    case 'acknowledge':
      return { ...state, pendingDecision: undefined };

    default:
      return state;
  }
});
