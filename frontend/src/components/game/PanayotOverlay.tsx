import { motion } from 'framer-motion';
import type { GameState } from '@shared/gameData';
import type { GameAction } from '@shared/gameEngine';
import GameCard from './GameCard';

export default function PanayotOverlay({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  const trigger = state.panayotTrigger!;
  const defeated = state.players[trigger.defeatedPlayerIndex];
  const beneficiary = state.players[trigger.beneficiaryPlayerIndex];
  const { availableCards } = trigger;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    >
      <div className="rounded-2xl border-2 p-6 max-w-lg w-full mx-4"
        style={{ background: 'oklch(0.18 0.04 55)', borderColor: '#fdba74' }}>
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">🦊</div>
          <h3 className="font-cinzel text-xl font-bold" style={{ color: '#fdba74' }}>
            Панайот Хитов
          </h3>
          <p className="font-source text-sm mt-1" style={{ color: 'oklch(0.70 0.03 70)' }}>
            {beneficiary.name} избира до 2 карти от разбития комитет на {defeated.name}
          </p>
          <p className="font-source text-xs mt-1" style={{ color: 'oklch(0.55 0.03 65)' }}>
            Остават: {availableCards.length} карти
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {availableCards.map(card => (
            <GameCard
              key={card.id}
              card={card}
              isSelectable
              highlight="pick"
              onClick={() => dispatch({ type: 'PANAYOT_PICK_CARD', cardId: card.id })}
            />
          ))}
        </div>
        <div className="text-center">
          <button
            onClick={() => dispatch({ type: 'PANAYOT_SKIP' })}
            className="px-6 py-2 rounded-lg font-source text-sm border transition-all hover:opacity-80"
            style={{ borderColor: 'oklch(0.40 0.04 55)', color: 'oklch(0.65 0.03 70)', background: 'oklch(0.24 0.03 55)' }}
          >
            Пропусни
          </button>
        </div>
      </div>
    </motion.div>
  );
}
