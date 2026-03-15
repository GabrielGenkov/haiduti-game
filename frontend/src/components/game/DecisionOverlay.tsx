import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { GameState } from '@shared/gameData';
import { contributionLabel } from '@shared/gameData';
import type { GameAction } from '@shared/gameEngine';
import type { AnyGameState } from '@/utils/view-helpers';
import GameCard from './GameCard';
import { TRAIT_META } from './constants';
import { findCardById } from './find-card';

type ActiveDecision = NonNullable<GameState['pendingDecision']>;

export default function DecisionOverlay({ state, dispatch }: { state: AnyGameState; dispatch: React.Dispatch<GameAction> }) {
  const decision = state.pendingDecision as ActiveDecision | undefined;
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedCardIds([]);
  }, [decision?.id]);

  if (!decision) return null;

  const submit = (payload: Partial<Extract<GameAction, { type: 'RESOLVE_DECISION' }>> = {}) => {
    dispatch({
      type: 'RESOLVE_DECISION',
      decisionId: decision.id,
      ...payload,
    } as GameAction);
  };

  const title =
    decision.kind === 'trait_choice'
      ? 'Избор на черта'
      : decision.kind === 'card_choice'
      ? 'Избор на карти'
      : decision.kind === 'contribution_choice'
      ? 'Избор на принос'
      : decision.kind === 'stat_choice'
      ? 'Избор на показател'
      : 'Потвърждение';

  const toggleCard = (cardId: string, maxChoices: number) => {
    setSelectedCardIds(current => {
      if (current.includes(cardId)) return current.filter(id => id !== cardId);
      if (maxChoices <= 1) return [cardId];
      if (current.length >= maxChoices) return current;
      return [...current, cardId];
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
    >
      <div
        className="w-full max-w-2xl rounded-2xl border-2 p-6"
        style={{ background: 'oklch(0.18 0.04 55)', borderColor: '#fbbf24' }}
      >
        <div className="text-center mb-5">
          <h3 className="font-cinzel text-xl font-bold" style={{ color: '#fbbf24' }}>
            {title}
          </h3>
          <p className="font-source text-sm mt-2" style={{ color: 'oklch(0.78 0.03 75)' }}>
            {decision.prompt}
          </p>
        </div>

        {decision.kind === 'trait_choice' && (
          <div className="flex flex-wrap justify-center gap-3">
            {decision.options.map(traitId => (
              <button
                key={traitId}
                onClick={() => submit({ traitId })}
                className="rounded-xl border px-4 py-3 text-left transition-all hover:opacity-90"
                style={{ background: 'oklch(0.23 0.04 55)', borderColor: `${TRAIT_META[traitId].color}80` }}
              >
                <div className="font-cinzel text-sm font-semibold" style={{ color: TRAIT_META[traitId].color }}>
                  {TRAIT_META[traitId].icon} {TRAIT_META[traitId].label}
                </div>
                <div className="font-source text-xs mt-1" style={{ color: 'oklch(0.65 0.03 70)' }}>
                  {TRAIT_META[traitId].shortDesc}
                </div>
              </button>
            ))}
          </div>
        )}

        {decision.kind === 'card_choice' && (
          <>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {decision.selectableCardIds.map(cardId => {
                const card = findCardById(state, cardId);
                if (!card) return null;
                const isSelected = selectedCardIds.includes(cardId);
                return (
                  <GameCard
                    key={cardId}
                    card={card}
                    isSelected={isSelected}
                    isSelectable
                    highlight={isSelected ? 'pick' : undefined}
                    onClick={() => toggleCard(cardId, decision.maxChoices)}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="font-source text-xs" style={{ color: 'oklch(0.60 0.03 68)' }}>
                Избрани: {selectedCardIds.length}/{decision.maxChoices}
              </div>
              <div className="flex gap-2">
                {decision.minChoices === 0 && (
                  <button
                    onClick={() => submit({ cardIds: [] })}
                    className="px-4 py-2 rounded-lg font-source text-sm border transition-all hover:opacity-80"
                    style={{ borderColor: 'oklch(0.40 0.04 55)', color: 'oklch(0.65 0.03 70)', background: 'oklch(0.24 0.03 55)' }}
                  >
                    Пропусни
                  </button>
                )}
                <button
                  onClick={() => submit({ cardIds: selectedCardIds })}
                  disabled={selectedCardIds.length < decision.minChoices}
                  className="btn-action px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Потвърди
                </button>
              </div>
            </div>
          </>
        )}

        {decision.kind === 'contribution_choice' && (
          <div className="flex flex-wrap justify-center gap-3">
            {decision.selectableContributions.map(contribution => (
              <button
                key={contribution}
                onClick={() => submit({ contribution })}
                className="rounded-xl border px-4 py-3 font-cinzel text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'oklch(0.23 0.04 55)', borderColor: 'oklch(0.48 0.09 148)', color: 'oklch(0.88 0.02 80)' }}
              >
                {contributionLabel(contribution)}
              </button>
            ))}
          </div>
        )}

        {decision.kind === 'stat_choice' && (
          <div className="flex flex-wrap justify-center gap-3">
            {decision.selectableStats.map(statType => (
              <button
                key={statType}
                onClick={() => submit({ statType })}
                className="rounded-xl border px-4 py-3 font-cinzel text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'oklch(0.23 0.04 55)', borderColor: 'oklch(0.48 0.09 78)', color: '#fbbf24' }}
              >
                {contributionLabel(statType)}
              </button>
            ))}
          </div>
        )}

        {decision.kind === 'acknowledge' && (
          <div className="text-center">
            <button onClick={() => submit()} className="btn-action px-6 py-2 rounded-lg text-sm">
              Продължи
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
