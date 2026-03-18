import { motion, AnimatePresence } from 'framer-motion';
import type { Card } from '@shared/gameData';
import GameCard from './GameCard';

interface DiscardStagingProps {
  stagedCards: Card[];
  onReturn: (cardId: string) => void;
}

export default function DiscardStaging({ stagedCards, onReturn }: DiscardStagingProps) {
  return (
    <div
      className="rounded-xl border-2 border-dashed p-4"
      style={{
        background: 'oklch(0.16 0.04 22)',
        borderColor: 'oklch(0.35 0.08 22)',
        minHeight: 80,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span style={{ fontSize: 14 }}>🗑️</span>
        <h3 className="font-cinzel text-sm font-semibold tracking-wider" style={{ color: '#fca5a5' }}>
          ЗА ИЗЧИСТВАНЕ ({stagedCards.length})
        </h3>
        <span className="font-source text-xs" style={{ color: 'oklch(0.50 0.04 22)' }}>
          — кликни карта за връщане в ръката
        </span>
      </div>

      {stagedCards.length === 0 ? (
        <p className="font-source text-sm italic" style={{ color: 'oklch(0.40 0.04 22)' }}>
          Кликни карти от ръката за да ги маркираш за изчистване
        </p>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="flex flex-wrap gap-2">
            {stagedCards.map(card => (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <GameCard
                  card={card}
                  isSelectable
                  highlight="remove"
                  onClick={() => onReturn(card.id)}
                />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
