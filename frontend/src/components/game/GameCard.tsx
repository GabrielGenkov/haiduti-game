import { motion } from 'framer-motion';
import type { Card } from '@shared/gameData';
import CardBack from './CardBack';
import { COLOR_STYLES } from './constants';

export default function GameCard({
  card,
  isSelected = false,
  isSelectable = false,
  onClick,
  small = false,
  showBack = false,
  highlight,
}: {
  card: Card;
  isSelected?: boolean;
  isSelectable?: boolean;
  onClick?: () => void;
  small?: boolean;
  showBack?: boolean;
  highlight?: 'remove' | 'pick';
}) {
  const w = small ? 64 : 84;
  const h = small ? 100 : 132;

  if (showBack) return <CardBack small={small} />;

  const color = card.color ? COLOR_STYLES[card.color] : null;
  const isZaptie = card.type === 'zaptie';

  const borderColor = highlight === 'remove'
    ? '#ef4444'
    : highlight === 'pick'
    ? '#fbbf24'
    : isSelected
    ? '#fbbf24'
    : isZaptie
    ? '#c0392b'
    : color?.border ?? '#8b7355';

  const bgColor = isZaptie ? '#2d0a0a' : color?.bg ?? '#2a1f0e';

  return (
    <motion.div
      onClick={onClick}
      className={`rounded-lg border-2 overflow-hidden shadow-lg flex-shrink-0 ${isSelectable ? 'cursor-pointer' : ''}`}
      style={{
        width: w,
        height: h,
        borderColor,
        background: bgColor,
        boxShadow: isSelected ? `0 0 12px ${borderColor}80` : highlight ? `0 0 10px ${borderColor}60` : undefined,
      }}
      whileHover={isSelectable ? { y: -4, scale: 1.04 } : {}}
      whileTap={isSelectable ? { scale: 0.97 } : {}}
      animate={isSelected ? { y: -8 } : { y: 0 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="h-full flex flex-col p-1.5">
        <div className="flex justify-between items-start mb-1">
          {card.strength !== undefined && (
            <span className="text-xs font-bold font-cinzel rounded px-1 bg-black/40"
              style={{ color: isZaptie ? '#fca5a5' : '#fde68a' }}>
              {card.strength}
            </span>
          )}
          {card.cost !== undefined && (
            <span className="text-xs font-bold font-cinzel rounded px-1 bg-black/40 text-amber-300">
              {card.cost}
            </span>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center text-2xl">
          {isZaptie ? '🔴' : card.type === 'haydut' ? '🗡️' : card.type === 'voyvoda' ? '🏴' : '📜'}
        </div>

        <div className="text-center" style={{ fontSize: 9, color: isZaptie ? '#fca5a5' : '#fde68a', fontFamily: 'Cinzel, serif', lineHeight: 1.2 }}>
          {card.type === 'haydut' && card.color
            ? `${card.color === 'green' ? 'З' : card.color === 'blue' ? 'С' : card.color === 'red' ? 'Ч' : 'Ж'} Хайдутин`
            : card.name.length > 12 ? card.name.slice(0, 11) + '...' : card.name}
        </div>

        <div className="flex justify-center gap-1 mt-0.5">
          {card.contribution && (
            <span style={{ fontSize: 9, color: card.contribution === 'nabor' ? '#93c5fd' : card.contribution === 'deynost' ? '#fcd34d' : '#fca5a5' }}>
              {card.contribution === 'nabor' ? '🎴' : card.contribution === 'deynost' ? '⚡' : '⚔️'}
              {card.strength}
            </span>
          )}
          {card.chetaPoints !== undefined && card.chetaPoints > 0 && (
            <span style={{ fontSize: 9, color: '#fbbf24' }}>🏳️{card.chetaPoints}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
