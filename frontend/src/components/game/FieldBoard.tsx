import type { Card } from '@shared/gameData';
import type { MaskedFieldCard } from '@shared/types/player-view';
import type { AnyGameState } from '@/utils/view-helpers';
import { getDeckCount, getMaskedField, getMaskedSideField } from '@/utils/view-helpers';
import GameCard from './GameCard';
import { CARD_BACK } from './constants';

interface FieldBoardProps {
  state: AnyGameState;
  canDoActions: boolean;
  isFormingStep: boolean;
  isValidGroup: boolean;
  hadzhiMode: boolean;
  onScout: (fieldIndex: number) => void;
  onSafeRecruit: (fieldIndex: number) => void;
  onRiskyRecruit: () => void;
  onHadzhiTarget: (fieldIndex: number) => void;
  onRaiseCard: (cardId: string) => void;
}

export default function FieldBoard({
  state, canDoActions, isFormingStep, isValidGroup, hadzhiMode,
  onScout, onSafeRecruit, onRiskyRecruit, onHadzhiTarget, onRaiseCard,
}: FieldBoardProps) {
  const maskedField = getMaskedField(state);
  const maskedSideField = getMaskedSideField(state);
  const mainSlots = maskedField.slice(0, 16);
  const sideSlots = maskedSideField;

  const cardCount = mainSlots.filter(s => s !== 'empty').length;

  const renderFieldSlot = (slot: MaskedFieldCard, fieldIndex: number) => {
    // Empty slot — no card
    if (slot === 'empty') {
      return (
        <div key={`empty_${fieldIndex}`} className="flex items-center justify-center">
          <div
            className="rounded-lg border border-dashed"
            style={{ width: 100, height: 156, borderColor: 'oklch(0.25 0.02 55)', opacity: 0.4 }}
          />
        </div>
      );
    }

    // Face-down card (slot === null)
    if (slot === null) {
      return (
        <div key={`hidden_${fieldIndex}`} className="relative flex items-center justify-center">
          <div
            className={`rounded-lg overflow-hidden border shadow-md ${canDoActions && !hadzhiMode ? 'cursor-pointer' : ''}`}
            style={{ width: 100, height: 156, borderColor: canDoActions && !hadzhiMode ? 'oklch(0.45 0.08 148)' : 'oklch(0.30 0.03 55)' }}
            onClick={() => {
              if (canDoActions && !hadzhiMode) onScout(fieldIndex);
            }}
          >
            <img src={CARD_BACK} alt="Face down" className="w-full h-full object-cover" />
          </div>
        </div>
      );
    }

    // Face-up card
    const card = slot as Card;
    const isRaisable = isFormingStep && isValidGroup && (card.type === 'voyvoda' || card.type === 'deyets');
    const isHadzhiTarget = hadzhiMode && card.type === 'zaptie';
    return (
      <div key={`${card.id}_${fieldIndex}`} className="relative flex items-center justify-center">
        <GameCard
          card={card}
          isSelectable={(canDoActions && card.type !== 'zaptie' && !hadzhiMode) || isRaisable || isHadzhiTarget}
          highlight={isHadzhiTarget ? 'remove' : undefined}
          onClick={() => {
            if (isHadzhiTarget) {
              onHadzhiTarget(fieldIndex);
            } else if (canDoActions && card.type !== 'zaptie') {
              onSafeRecruit(fieldIndex);
            } else if (isRaisable) {
              onRaiseCard(card.id);
            }
          }}
        />
        {card.type === 'zaptie' && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-xs">
            ⚔️
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: 'oklch(0.20 0.03 55)', borderColor: hadzhiMode ? '#fca5a5' : 'oklch(0.30 0.03 55)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-cinzel text-sm font-semibold tracking-wider" style={{ color: hadzhiMode ? '#fca5a5' : 'oklch(0.60 0.05 78)' }}>
          {hadzhiMode ? '🗡️ ИЗБЕРИ ЗАПТИЕ ЗА ПРЕМАХВАНЕ' : `ПОЛЕ (${cardCount} карти)`}
        </h3>
        {canDoActions && getDeckCount(state) > 0 && !hadzhiMode && (
          <button
            onClick={onRiskyRecruit}
            className="px-3 py-1.5 rounded-lg font-cinzel text-xs font-semibold border transition-all"
            style={{ borderColor: '#c0392b', color: '#fca5a5', background: 'oklch(0.18 0.06 22)' }}
          >
            🎲 Рисковано вербуване
          </button>
        )}
      </div>

      {/* Main 4x4 grid */}
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        {mainSlots.map((slot, i) => renderFieldSlot(slot, i))}
      </div>

      {/* Side field */}
      {sideSlots.some(s => s !== 'empty') && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'oklch(0.28 0.03 55)' }}>
          <p className="font-cinzel text-xs mb-2" style={{ color: 'oklch(0.55 0.04 78)' }}>ДОПЪЛНИТЕЛНИ КАРТИ</p>
          <div className="flex flex-wrap gap-2">
            {sideSlots.map((slot, j) => slot !== 'empty' ? renderFieldSlot(slot, state.field.length + j) : null)}
          </div>
        </div>
      )}
    </div>
  );
}
