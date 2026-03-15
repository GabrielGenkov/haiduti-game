import type { Card, Player, ContributionType, CardColor } from '@shared/gameData';
import { contributionLabel, getUpgradeCost, getNextStatValue, getMaxReachableStatValue } from '@shared/gameData';
import type { GameAction } from '@shared/gameEngine';
import { getTraitGroupBonus } from '@shared/gameEngine';
import type { PlayerView } from '@shared/gameData';

interface FormingActionsProps {
  player: Player | PlayerView;
  selectedHayduti: Card[];
  baseGroupStrength: number;
  groupByContrib: ContributionType | null;
  groupByColor: CardColor | null;
  groupContributions: ContributionType[];
  raisableFromField: Card[];
  maxRaiseStrength: number;
  popHaritonForming: boolean;
  dispatch: (action: GameAction) => void;
}

export default function FormingActions({
  player, selectedHayduti, baseGroupStrength,
  groupByContrib, groupByColor, groupContributions,
  raisableFromField, maxRaiseStrength, popHaritonForming, dispatch,
}: FormingActionsProps) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: 'oklch(0.20 0.04 55)', borderColor: 'oklch(0.40 0.08 148)' }}
    >
      <h3 className="font-cinzel text-sm font-semibold mb-2" style={{ color: 'oklch(0.72 0.12 78)' }}>
        Сформирай група
      </h3>
      {baseGroupStrength < 4 && (
        <p className="font-source text-xs mb-3" style={{ color: 'oklch(0.60 0.04 50)' }}>
          Нужна мин. сила 4 за най-евтиното подобрение. Добави още Хайдути.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {(['nabor', 'deynost', 'boyna'] as ContributionType[]).map(stat => {
          const traitBonus = getTraitGroupBonus(player as Player, selectedHayduti, stat);
          const effectiveStrength = baseGroupStrength + traitBonus;
          const currentVal = player.stats[stat];
          const nextVal = getNextStatValue(currentVal);
          const maxVal = getMaxReachableStatValue(currentVal, effectiveStrength);
          const minCost = nextVal ? getUpgradeCost(nextVal) : 999;
          const canImprove = maxVal !== null &&
            (groupByContrib === stat || (groupByColor !== null && groupContributions.includes(stat)));

          return (
            <button
              key={stat}
              disabled={!canImprove}
              onClick={() => dispatch({ type: 'FORM_GROUP_IMPROVE_STAT', statType: stat })}
              className="px-3 py-2 rounded-lg font-cinzel text-xs font-semibold border transition-all"
              style={canImprove ? {
                background: 'oklch(0.28 0.06 148)',
                borderColor: 'oklch(0.55 0.12 148)',
                color: 'oklch(0.90 0.02 80)',
              } : {
                background: 'oklch(0.22 0.02 55)',
                borderColor: 'oklch(0.30 0.03 55)',
                color: 'oklch(0.40 0.02 65)',
                cursor: 'not-allowed',
              }}
            >
              {stat === 'nabor' ? '🎴' : stat === 'deynost' ? '⚡' : '⚔️'} {contributionLabel(stat)}
              {traitBonus > 0 && <span className="ml-1 text-yellow-400">+{traitBonus}</span>}
              {maxVal
                ? <span className="ml-1 opacity-70">{currentVal}→{maxVal} (нужна: {getUpgradeCost(maxVal)})</span>
                : nextVal
                  ? <span className="ml-1 opacity-70">(нужна: {minCost})</span>
                  : <span className="ml-1 opacity-70">(макс.)</span>
              }
            </button>
          );
        })}

        {!popHaritonForming && raisableFromField.map(card => {
          const canRaise = maxRaiseStrength >= (card.cost ?? 999);
          return (
            <button
              key={card.id}
              disabled={!canRaise}
              onClick={() => dispatch({ type: 'FORM_GROUP_RAISE_CARD', targetCardId: card.id })}
              className="px-3 py-2 rounded-lg font-cinzel text-xs font-semibold border transition-all"
              style={canRaise ? {
                background: 'oklch(0.26 0.06 78)',
                borderColor: 'oklch(0.60 0.12 78)',
                color: '#fbbf24',
              } : {
                background: 'oklch(0.22 0.02 55)',
                borderColor: 'oklch(0.30 0.03 55)',
                color: 'oklch(0.40 0.02 65)',
                cursor: 'not-allowed',
              }}
            >
              {card.type === 'voyvoda' ? '🏴' : '📜'} {card.name.slice(0, 12)} ({card.cost})
            </button>
          );
        })}
      </div>
    </div>
  );
}
