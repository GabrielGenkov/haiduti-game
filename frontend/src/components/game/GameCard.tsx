import { motion } from 'framer-motion';
import type { Card } from '@shared/gameData';
import CardBack from './CardBack';
import { COLOR_STYLES, HAYDUT_IMAGES, DEYETS_IMAGES, VOYVODA_IMG, ZAPTIE_IMG, TRAIT_META } from './constants';

export default function GameCard({
  card,
  isSelected = false,
  isSelectable = false,
  onClick,
  showBack = false,
  highlight,
}: {
  card: Card;
  isSelected?: boolean;
  isSelectable?: boolean;
  onClick?: () => void;
  showBack?: boolean;
  highlight?: 'remove' | 'pick';
}) {
  const w = 100;
  const h = 156;

  if (showBack) return <CardBack />;

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

  const imgSrc = isZaptie ? ZAPTIE_IMG
    : card.type === 'haydut' && card.color ? HAYDUT_IMAGES[card.color]
    : card.type === 'voyvoda' ? VOYVODA_IMG
    : card.type === 'deyets' && card.traitId ? DEYETS_IMAGES[card.traitId]
    : undefined;

  return (
    <motion.div
      onClick={onClick}
      className={`relative rounded-lg border-2 overflow-hidden shadow-lg flex-shrink-0 ${isSelectable ? 'cursor-pointer' : ''}`}
      style={{
        width: w,
        height: h,
        borderColor,
        boxShadow: isSelected ? `0 0 12px ${borderColor}80` : highlight ? `0 0 10px ${borderColor}60` : undefined,
      }}
      whileHover={isSelectable ? { y: -4, scale: 1.04 } : {}}
      whileTap={isSelectable ? { scale: 0.97 } : {}}
      animate={isSelected ? { y: -8 } : { y: 0 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      {imgSrc && <img src={imgSrc} alt={card.name} className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-1 py-0.5">
        <div className="text-center font-cinzel" style={{ fontSize: 8, color: isZaptie ? '#fca5a5' : '#fde68a', lineHeight: 1.2 }}>
          {card.name.length > 12 ? card.name.slice(0, 11) + '...' : card.name}
        </div>
        <div className="flex justify-center items-center gap-1 mt-0.5 flex-wrap">
          {card.type === 'deyets' && card.traitId ? (
            <>
              <span style={{ fontSize: 10, color: TRAIT_META[card.traitId].color }}>{TRAIT_META[card.traitId].icon}</span>
              {card.cost !== undefined && (
                <span className="font-cinzel" style={{ fontSize: 8, color: '#fde68a' }}>💰{card.cost}</span>
              )}
              {(card.silverDiamond || card.goldDiamond) && (
                <span style={{ fontSize: 8, color: card.goldDiamond ? '#fbbf24' : '#94a3b8' }}>
                  {card.goldDiamond ? '◆Злато' : '◆Сребро'}
                </span>
              )}
            </>
          ) : (
            <>
              {card.type !== 'haydut' && card.strength !== undefined && (
                <span className="font-cinzel" style={{ fontSize: 8, color: isZaptie ? '#fca5a5' : '#fde68a' }}>⚔️{card.strength}</span>
              )}
              {card.cost !== undefined && (
                <span className="font-cinzel" style={{ fontSize: 8, color: '#fde68a' }}>💰{card.cost}</span>
              )}
              {card.contribution && (
                <span style={{ fontSize: 8, color: card.contribution === 'nabor' ? '#93c5fd' : card.contribution === 'deynost' ? '#fcd34d' : '#fca5a5' }}>
                  {card.contribution === 'nabor' ? '🎴' : card.contribution === 'deynost' ? '⚡' : '⚔️'}{card.type === 'haydut' ? card.strength : ''}
                </span>
              )}
              {card.chetaPoints !== undefined && card.chetaPoints > 0 && (
                <span style={{ fontSize: 8, color: '#fbbf24' }}>🏳️{card.chetaPoints}</span>
              )}
              {(card.silverDiamond || card.goldDiamond) && (
                <span style={{ fontSize: 8, color: card.goldDiamond ? '#fbbf24' : '#94a3b8' }}>
                  {card.goldDiamond ? '◆Злато' : '◆Сребро'}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
