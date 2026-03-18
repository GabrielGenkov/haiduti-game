import type { Card, Player, ContributionType, CardColor } from '@shared/gameData';
import { contributionLabel, colorLabel } from '@shared/gameData';
import type { GameAction } from '@shared/gameEngine';
import { getTraitGroupBonus } from '@shared/gameEngine';
import type { AnyGameState } from '@/utils/view-helpers';
import { getPlayerHand, getPlayerHandCount } from '@/utils/view-helpers';
import type { PlayerView } from '@shared/gameData';
import GameCard from './GameCard';

interface PlayerHandProps {
  state: AnyGameState;
  handPlayer: Player | PlayerView;
  player: Player | PlayerView;
  isMyTurn: boolean;
  isMultiplayer: boolean;
  isFormingStep: boolean;
  isSelectionStep: boolean;
  isValidGroup: boolean;
  needsDiscard: boolean;
  isPetkoSelection: boolean;
  effectiveNabor: number;
  selectedHayduti: Card[];
  baseGroupStrength: number;
  groupByContrib: ContributionType | null;
  groupByColor: CardColor | null;
  dispatch: (action: GameAction) => void;
  /** IDs of cards staged for discard (selection phase staging) */
  stagedDiscardIds?: string[];
  /** Toggle a card in/out of the staging area */
  onToggleStage?: (cardId: string) => void;
}

export default function PlayerHand({
  state, handPlayer, player, isMyTurn, isMultiplayer,
  isFormingStep, isSelectionStep, isValidGroup, needsDiscard, isPetkoSelection,
  effectiveNabor, selectedHayduti, baseGroupStrength, groupByContrib, groupByColor,
  dispatch, stagedDiscardIds = [], onToggleStage,
}: PlayerHandProps) {
  // Filter out staged cards from display during selection
  const visibleHand = isSelectionStep && onToggleStage
    ? getPlayerHand(handPlayer).filter(c => !stagedDiscardIds.includes(c.id))
    : getPlayerHand(handPlayer);
  const visibleCount = isSelectionStep && onToggleStage
    ? visibleHand.length
    : getPlayerHandCount(handPlayer);
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: 'oklch(0.20 0.03 55)', borderColor: 'oklch(0.30 0.03 55)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-cinzel text-sm font-semibold tracking-wider" style={{ color: 'oklch(0.60 0.05 78)' }}>
          {isMultiplayer && !isMyTurn ? `${handPlayer.name} — ` : ''}РЪКА ({visibleCount}/{isMyTurn ? effectiveNabor : handPlayer.stats.nabor})
          {needsDiscard && <span className="ml-2 text-red-400">— изчисти {getPlayerHandCount(player) - effectiveNabor}</span>}
          {isPetkoSelection && <span className="ml-2" style={{ color: '#fca5a5' }}>— запазваш 2</span>}
        </h3>
        {isFormingStep && selectedHayduti.length > 0 && (
          <div className="font-source text-xs text-right" style={{ color: 'oklch(0.65 0.03 70)' }}>
            {(() => {
              const bonuses = (['nabor', 'deynost', 'boyna'] as ContributionType[]).map(st => {
                const b = getTraitGroupBonus(player as Player, selectedHayduti, st);
                return b > 0 ? `${st === 'nabor' ? '🎴' : st === 'deynost' ? '⚡' : '⚔️'}+${b}` : null;
              }).filter(Boolean);
              return (
                <span>
                  Сила: <strong style={{ color: '#6ee7a0' }}>{baseGroupStrength}</strong>
                  {bonuses.length > 0 && <span style={{ color: '#fbbf24' }}> +Черти({bonuses.join(' ')})</span>}
                  {isValidGroup && (
                    <span className="ml-1 text-emerald-400">
                      ({groupByContrib ? contributionLabel(groupByContrib) : groupByColor ? colorLabel(groupByColor as CardColor) : ''})
                    </span>
                  )}
                </span>
              );
            })()}
          </div>
        )}
      </div>

      {visibleCount === 0 ? (
        <p className="font-source text-sm italic" style={{ color: 'oklch(0.45 0.03 65)' }}>
          {isSelectionStep && stagedDiscardIds.length > 0 ? 'Всички карти са маркирани за изчистване' : 'Ръката е празна'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {visibleHand.map(card => {
            const isSelected = isMyTurn && state.selectedCards.includes(card.id);
            const isSelectable = isFormingStep && card.type === 'haydut';
            const isDiscardable = isSelectionStep;
            const isRaisableFromHand = isFormingStep && isValidGroup && (card.type === 'voyvoda' || card.type === 'deyets');

            return (
              <GameCard
                key={card.id}
                card={card}
                isSelected={isSelected}
                isSelectable={isSelectable || isDiscardable || isRaisableFromHand}
                onClick={() => {
                  if (isSelectable) {
                    dispatch({ type: 'TOGGLE_SELECT_CARD', cardId: card.id });
                  } else if (isDiscardable && onToggleStage) {
                    onToggleStage(card.id);
                  } else if (isDiscardable) {
                    dispatch({ type: 'DISCARD_CARD', cardId: card.id });
                  } else if (isRaisableFromHand) {
                    dispatch({ type: 'FORM_GROUP_RAISE_CARD', targetCardId: card.id });
                  }
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
