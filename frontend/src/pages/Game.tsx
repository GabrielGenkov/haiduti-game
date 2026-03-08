// ============================================================
// ХАЙДУТИ — Game Page
// Design: Хайдушка чета — warm board-game aesthetic
// Full pass-and-play game with field, hand, stats, actions, traits
// ============================================================

import { useEffect, useReducer, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GameState,
  GameLength,
  Card,
  ContributionType,
  CardColor,
  DeyetsTraitId,
  createInitialGameState,
  calculateScores,
  contributionLabel,
  colorLabel,
  canFormGroupByContribution,
  canFormGroupByColor,
  getGroupStrength,
  getUpgradeCost,
  getNextStatValue,
  getMaxReachableStatValue,
  getGroupContributions,
  getTotalZaptieBoyna,
} from '@shared/gameData';
import { gameReducer, getTraitGroupBonus, GameAction } from '@shared/gameEngine';
import { CDN_BASE } from '@/config';

const CARD_BACK = `${CDN_BASE}/haiduti-card-back-B4aTCoJT5z8NC5YoWEzuee.webp`;
const TABLE_BG = `${CDN_BASE}/haiduti-table-bg-3gp2hdrBo9Wp4k5QjKnMim.webp`;

const COLOR_STYLES: Record<CardColor, { bg: string; border: string; text: string }> = {
  green:  { bg: '#1a3d2b', border: '#2d7a4f', text: '#6ee7a0' },
  blue:   { bg: '#1a2a4d', border: '#3b6fd4', text: '#93c5fd' },
  red:    { bg: '#3d1a1a', border: '#c0392b', text: '#fca5a5' },
  yellow: { bg: '#3d3000', border: '#d4a017', text: '#fde68a' },
};

const PLAYER_COLORS = [
  '#2d7a4f', '#3b6fd4', '#c0392b', '#d4a017', '#8b5cf6', '#06b6d4',
];

// Trait display metadata
const TRAIT_META: Record<DeyetsTraitId, { label: string; icon: string; color: string; shortDesc: string }> = {
  hristo_botev:    { label: 'Христо Ботев',    icon: '🌟', color: '#fbbf24', shortDesc: '+2 сила на групи; +1 всички показатели в края' },
  vasil_levski:    { label: 'Васил Левски',     icon: '🛡️', color: '#6ee7a0', shortDesc: 'Игнорира 1-во Заптие/ход; +6т за водещ показател' },
  sofroniy:        { label: 'Софроний',         icon: '👁️', color: '#93c5fd', shortDesc: 'Безплатно проучване в началото на хода' },
  rakowski:        { label: 'Г. Раковски',      icon: '🦅', color: '#fde68a', shortDesc: 'Запазва 1 карта от групата (таен комитет)' },
  evlogi:          { label: 'Евлоги',           icon: '💰', color: '#fbbf24', shortDesc: '+2 сила за Набор групи; +1 Набор в края' },
  petko_voy:       { label: 'Петко Войвода',    icon: '⚔️', color: '#fca5a5', shortDesc: 'При разгром — запазва 2 карти; +2т/Деец в края' },
  lyuben:          { label: 'Л. Каравелов',     icon: '📚', color: '#c4b5fd', shortDesc: '+1 сила на групи; +1 избран показател в края' },
  rayna:           { label: 'Райна Княгиня',    icon: '🏴', color: '#f9a8d4', shortDesc: '+1 сила ако 3+ Хайдути в група' },
  benkovski:       { label: 'Г. Бенковски',     icon: '🔥', color: '#fb923c', shortDesc: '+2 действия ако ≥3 Заптие сила; +2т/Войвода в края' },
  pop_hariton:     { label: 'Поп Харитон',      icon: '✝️', color: '#a78bfa', shortDesc: 'При разгром — сформира 1 група преди изчистване' },
  hadzhi:          { label: 'Хаджи Димитър',    icon: '🗡️', color: '#fca5a5', shortDesc: 'Премахва 1 Заптие от полето; +4т ако води Бойна' },
  dyado_ilyo:      { label: 'Дядо Ильо',        icon: '🧓', color: '#86efac', shortDesc: 'При разкриване — Заптието се премахва; +2 Набор за хода' },
  filip_totyu:     { label: 'Филип Тотю',       icon: '⚡', color: '#fcd34d', shortDesc: '+2 сила за Дейност групи; +1 Дейност в края' },
  panayot:         { label: 'П. Хитов',         icon: '🦊', color: '#fdba74', shortDesc: 'При чужд разгром — взима 2 карти от разбития' },
  stefan_karadzha: { label: 'Ст. Каража',       icon: '🏹', color: '#fca5a5', shortDesc: '+2 сила за Бойна групи; +1 Бойна в края' },
};

function CardBack({ small = false }: { small?: boolean }) {
  return (
    <div className="rounded-lg overflow-hidden border border-amber-800/60 shadow-md flex-shrink-0"
      style={{ width: small ? 56 : 80, height: small ? 88 : 128 }}>
      <img src={CARD_BACK} alt="Card back" className="w-full h-full object-cover" />
    </div>
  );
}

function GameCard({
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
              💰{card.cost}
            </span>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center text-2xl">
          {isZaptie ? '🔴' : card.type === 'haydut' ? '🗡️' : card.type === 'voyvoda' ? '🏴' : '📜'}
        </div>

        <div className="text-center" style={{ fontSize: 9, color: isZaptie ? '#fca5a5' : '#fde68a', fontFamily: 'Cinzel, serif', lineHeight: 1.2 }}>
          {card.type === 'haydut' && card.color
            ? `${card.color === 'green' ? 'З' : card.color === 'blue' ? 'С' : card.color === 'red' ? 'Ч' : 'Ж'} Хайдутин`
            : card.name.length > 12 ? card.name.slice(0, 11) + '…' : card.name}
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

function StatTrack({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const steps = [4, 5, 6, 7, 8, 9, 10];
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm w-4">{icon}</span>
      <div className="flex gap-0.5">
        {steps.map(v => (
          <div
            key={v}
            className="w-5 h-5 rounded-sm flex items-center justify-center"
            style={{
              background: v <= value ? color : 'oklch(0.25 0.03 55)',
              border: `1px solid ${v === value ? color : 'oklch(0.30 0.03 55)'}`,
              fontSize: 8,
              color: v <= value ? 'white' : 'oklch(0.45 0.03 65)',
              fontFamily: 'Cinzel, serif',
              fontWeight: 'bold',
            }}
          >
            {v}
          </div>
        ))}
      </div>
      <span className="font-cinzel text-xs font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

function TraitBadge({ traitId }: { traitId: DeyetsTraitId }) {
  const meta = TRAIT_META[traitId];
  return (
    <div
      className="group relative"
      title={`${meta.label}: ${meta.shortDesc}`}
    >
      <span
        className="text-xs px-1.5 py-0.5 rounded font-source cursor-help"
        style={{ background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}40` }}
      >
        {meta.icon} {meta.label.split(' ')[0]}
      </span>
    </div>
  );
}

function PlayerBoard({ state, playerIndex }: { state: GameState; playerIndex: number }) {
  const player = state.players[playerIndex];
  const isActive = playerIndex === state.currentPlayerIndex;

  return (
    <div
      className="rounded-xl border p-3 transition-all"
      style={{
        background: isActive ? 'oklch(0.24 0.04 55)' : 'oklch(0.20 0.02 55)',
        borderColor: isActive ? PLAYER_COLORS[playerIndex] : 'oklch(0.28 0.03 55)',
        boxShadow: isActive ? `0 0 16px ${PLAYER_COLORS[playerIndex]}40` : 'none',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-cinzel"
          style={{ background: PLAYER_COLORS[playerIndex], color: 'white' }}
        >
          {playerIndex + 1}
        </div>
        <span className="font-cinzel text-sm font-semibold" style={{ color: 'oklch(0.88 0.03 75)' }}>
          {player.name}
        </span>
        <span
          className="ml-auto text-xs px-2 py-0.5 rounded font-source"
          style={{
            background: player.isRevealed ? 'oklch(0.40 0.15 22)' : 'oklch(0.30 0.10 148)',
            color: player.isRevealed ? '#fca5a5' : '#6ee7a0',
          }}
        >
          {player.isRevealed ? '🔴 Разкрит' : '🟢 Таен'}
        </span>
      </div>

      <div className="space-y-1">
        <StatTrack label="Набор" value={player.stats.nabor} icon="🎴" color="#93c5fd" />
        <StatTrack label="Дейност" value={player.stats.deynost} icon="⚡" color="#fcd34d" />
        <StatTrack label="Бойна мощ" value={player.stats.boyna} icon="⚔️" color="#fca5a5" />
      </div>

      {(player.raisedVoyvodas.length > 0 || player.raisedDeytsi.length > 0) && (
        <div className="mt-2 pt-2 border-t" style={{ borderColor: 'oklch(0.28 0.03 55)' }}>
          <div className="flex gap-1 flex-wrap">
            {player.raisedVoyvodas.map(c => (
              <span key={c.id} className="text-xs px-1.5 py-0.5 rounded font-source"
                style={{ background: 'oklch(0.28 0.06 55)', color: '#fbbf24' }}>
                🏴 {c.chetaPoints}pt
              </span>
            ))}
            {player.raisedDeytsi.map(c => (
              <span key={c.id} className="text-xs px-1.5 py-0.5 rounded font-source"
                style={{ background: 'oklch(0.22 0.05 250)', color: '#93c5fd' }}>
                📜 {c.name.slice(0, 8)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Active traits */}
      {player.traits.length > 0 && (
        <div className="mt-2 pt-2 border-t" style={{ borderColor: 'oklch(0.28 0.03 55)' }}>
          <div className="flex flex-wrap gap-1">
            {player.traits.map(t => <TraitBadge key={t} traitId={t} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PASS DEVICE SCREEN
// ============================================================
function PassDeviceScreen({ playerName, color, onReady }: { playerName: string; color: string; onReady: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: 'oklch(0.10 0.02 55)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center px-8">
        <div className="text-6xl mb-6">📱</div>
        <h2 className="font-cinzel text-2xl font-bold mb-2" style={{ color: 'oklch(0.72 0.12 78)' }}>
          Подай устройството
        </h2>
        <p className="font-lora text-lg italic mb-6" style={{ color: 'oklch(0.65 0.03 70)' }}>Ред на</p>
        <div
          className="font-cinzel text-4xl font-black mb-8 px-8 py-4 rounded-xl"
          style={{ color, background: `${color}20`, border: `2px solid ${color}` }}
        >
          {playerName}
        </div>
        <motion.button
          onClick={onReady}
          className="btn-action px-10 py-3 rounded-xl text-lg font-bold"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          Готов съм ⚔️
        </motion.button>
      </motion.div>
    </div>
  );
}

// ============================================================
// SCORING SCREEN
// ============================================================
function ScoringScreen({ state, onNewGame }: { state: GameState; onNewGame: () => void }) {
  const scores = calculateScores(state.players).sort((a, b) => b.total - a.total);
  const winner = scores[0];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8" style={{ background: 'oklch(0.17 0.025 55)' }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="font-cinzel text-4xl font-black" style={{ color: 'oklch(0.72 0.12 78)' }}>
            Край на играта
          </h1>
          <p className="font-lora italic mt-2" style={{ color: 'oklch(0.60 0.03 70)' }}>
            Победител: <strong style={{ color: 'oklch(0.72 0.12 78)' }}>{winner.playerName}</strong> с {winner.total} точки
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {scores.map((score, i) => (
            <motion.div
              key={score.playerId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border p-4"
              style={{
                background: i === 0 ? 'oklch(0.24 0.06 78)' : 'oklch(0.21 0.03 55)',
                borderColor: i === 0 ? 'oklch(0.60 0.12 78)' : 'oklch(0.30 0.03 55)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-cinzel text-lg font-bold" style={{ color: i === 0 ? '#fbbf24' : 'oklch(0.65 0.03 70)' }}>
                    #{i + 1}
                  </span>
                  <span className="font-cinzel font-semibold" style={{ color: 'oklch(0.88 0.03 75)' }}>
                    {score.playerName}
                  </span>
                </div>
                <span className="font-cinzel text-2xl font-black" style={{ color: i === 0 ? '#fbbf24' : 'oklch(0.72 0.12 78)' }}>
                  {score.total}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-xs font-source mb-2" style={{ color: 'oklch(0.55 0.03 65)' }}>
                <div>Показатели<br /><strong style={{ color: 'oklch(0.75 0.03 75)' }}>{score.statTotal}</strong></div>
                <div>Водачество<br /><strong style={{ color: '#fbbf24' }}>+{score.leadershipBonus}</strong></div>
                <div>Войводи<br /><strong style={{ color: '#fbbf24' }}>{score.voyvodaPoints}</strong></div>
                <div>Дейци<br /><strong style={{ color: '#93c5fd' }}>{score.deyetsPoints}</strong></div>
                <div>Черти<br /><strong style={{ color: '#f9a8d4' }}>+{score.traitBonusPoints}</strong></div>
              </div>
              {/* Effective stats */}
              <div className="text-xs font-source mb-2" style={{ color: 'oklch(0.50 0.03 65)' }}>
                Показатели: Н:{score.effectiveStats.nabor} Д:{score.effectiveStats.deynost} Б:{score.effectiveStats.boyna}
              </div>
              {/* Trait bonus breakdown */}
              {score.traitBonusBreakdown.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {score.traitBonusBreakdown.map((b, j) => (
                    <span key={j} className="text-xs px-1.5 py-0.5 rounded font-source"
                      style={{ background: 'oklch(0.26 0.05 300)', color: '#f9a8d4' }}>
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <motion.button
            onClick={onNewGame}
            className="btn-action px-10 py-3 rounded-xl text-lg font-bold"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            ⚔️ Нова игра
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// PANAYOT OVERLAY — pick 2 cards from defeated player
// ============================================================
function PanayotOverlay({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
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

// ============================================================
// MAIN GAME COMPONENT
// ============================================================
interface GameProps {
  /** External state for multiplayer mode. If provided, local useReducer is skipped. */
  externalState?: GameState;
  /** External dispatch for multiplayer mode. */
  externalDispatch?: (action: GameAction) => void;
  /** Index of the local player in multiplayer mode (used to show/hide hand). */
  localPlayerIndex?: number;
}

export default function Game({ externalState, externalDispatch, localPlayerIndex }: GameProps = {}) {
  const [, navigate] = useLocation();
  const [localGameState, localDispatch] = useReducer(gameReducer, null, () => {
    if (externalState) return externalState; // won't be used if externalState provided
    const raw = sessionStorage.getItem('haiduti_config');
    if (!raw) return createInitialGameState(['Играч 1', 'Играч 2'], 'medium');
    const { players, gameLength } = JSON.parse(raw) as { players: string[]; gameLength: GameLength };
    return createInitialGameState(players, gameLength);
  });

  // Use external state/dispatch if provided (multiplayer), else local
  const gameState = externalState ?? localGameState;
  const dispatch = externalDispatch ?? localDispatch;

  const [showPassDevice, setShowPassDevice] = useState(true);
  const [hadzhiMode, setHadzhiMode] = useState(false); // selecting Zaптие to remove

  const state = gameState;
  const isMultiplayer = localPlayerIndex !== undefined;
  const isMyTurn = isMultiplayer ? localPlayerIndex === state.currentPlayerIndex : true;
  const player = state.players[state.currentPlayerIndex];
  const handPlayer = isMultiplayer ? state.players[localPlayerIndex] : player;

  // When turn changes, show pass device screen
  const [lastPlayerIndex, setLastPlayerIndex] = useState(state.currentPlayerIndex);
  useEffect(() => {
    if (state.currentPlayerIndex !== lastPlayerIndex && state.phase === 'playing') {
      setShowPassDevice(true);
      setLastPlayerIndex(state.currentPlayerIndex);
      setHadzhiMode(false);
    }
  }, [state.currentPlayerIndex]);

  if (state.phase === 'scoring') {
    return <ScoringScreen state={state} onNewGame={() => navigate('/setup')} />;
  }

  if (showPassDevice && !isMultiplayer) {
    return (
      <PassDeviceScreen
        playerName={player.name}
        color={PLAYER_COLORS[state.currentPlayerIndex]}
        onReady={() => setShowPassDevice(false)}
      />
    );
  }

  // Панайот overlay — only the beneficiary sees the full picker in multiplayer
  if (state.panayotTrigger) {
    const isBeneficiary = !isMultiplayer || localPlayerIndex === state.panayotTrigger.beneficiaryPlayerIndex;
    if (isBeneficiary) {
      return <PanayotOverlay state={state} dispatch={dispatch} />;
    }
  }

  // Compute group info for selected cards
  const selectedHandCards = player.hand.filter(c => state.selectedCards.includes(c.id));
  const selectedHayduti = selectedHandCards.filter(c => c.type === 'haydut');
  const groupByContrib = canFormGroupByContribution(selectedHayduti);
  const groupByColor = canFormGroupByColor(selectedHayduti);
  const isValidGroup = selectedHayduti.length > 0 && (groupByContrib !== null || groupByColor !== null);
  const baseGroupStrength = getGroupStrength(selectedHayduti);
  const groupContributions = getGroupContributions(selectedHayduti);

  // Cards that can be raised (on field face-up or in hand)
  const raisableFromField = state.field.filter((c, i) =>
    state.fieldFaceUp[i] && (c.type === 'voyvoda' || c.type === 'deyets')
  );

  const canDoActions = isMyTurn && state.turnStep === 'recruiting' && state.actionsRemaining > 0 && !state.zaptieTrigger;
  const isSelectionStep = isMyTurn && state.turnStep === 'selection';
  const isFormingStep = isMyTurn && state.turnStep === 'forming';
  const effectiveNabor = player.stats.nabor + (player.dyadoIlyoActive ? 2 : 0);
  const needsDiscard = isSelectionStep && player.hand.length > effectiveNabor;

  // Петко Войвода: in selection step after defeat, player must keep exactly 2
  const isPetkoSelection = isSelectionStep && state.zaptieTrigger === undefined &&
    !state.canFormGroup && player.hand.length > 2 &&
    player.traits.includes('petko_voy');

  // Turn-start ability availability
  const canUseSofroniy = canDoActions && player.traits.includes('sofroniy') && !state.sofroniyAbilityUsed;
  const canUseHadzhi = canDoActions && player.traits.includes('hadzhi') && !state.hadzhiAbilityUsed &&
    state.field.some((c, i) => state.fieldFaceUp[i] && c.type === 'zaptie');
  const totalZaptieBoyna = getTotalZaptieBoyna(state.field, state.fieldFaceUp);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'oklch(0.17 0.025 55)' }}>
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: `url(${TABLE_BG})`, backgroundSize: 'cover' }}
      />

      {/* TOP BAR */}
      <div
        className="relative z-10 flex items-center justify-between px-4 py-2 border-b"
        style={{ background: 'oklch(0.14 0.02 55)', borderColor: 'oklch(0.28 0.03 55)' }}
      >
        <button
          onClick={() => navigate('/')}
          className="font-source text-xs transition-opacity hover:opacity-70"
          style={{ color: 'oklch(0.50 0.03 65)' }}
        >
          ← Начало
        </button>
        <div className="font-cinzel text-base font-bold tracking-wider" style={{ color: 'oklch(0.72 0.12 78)' }}>
          ХАЙДУТИ
        </div>
        <div className="font-source text-xs" style={{ color: 'oklch(0.50 0.03 65)' }}>
          Завъртане {state.deckRotations + 1}/{state.maxRotations}
        </div>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row flex-1 gap-3 p-3 max-w-7xl mx-auto w-full">
        {/* LEFT: Player boards */}
        <div className="lg:w-64 flex-shrink-0 space-y-2">
          <h3 className="font-cinzel text-xs font-semibold tracking-widest mb-2" style={{ color: 'oklch(0.50 0.03 65)' }}>
            КОМИТЕТИ
          </h3>
          {state.players.map((_, i) => (
            <PlayerBoard key={i} state={state} playerIndex={i} />
          ))}
          
          {/* Deck info */}
          <div className="rounded-lg border p-3" style={{ background: 'oklch(0.20 0.02 55)', borderColor: 'oklch(0.28 0.03 55)' }}>
            <div className="font-source text-xs space-y-0.5" style={{ color: 'oklch(0.55 0.03 65)' }}>
              <div>Тесте: <strong style={{ color: 'oklch(0.75 0.03 75)' }}>{state.deck.length}</strong> карти</div>
              <div>Използ.: <strong style={{ color: 'oklch(0.75 0.03 75)' }}>{state.usedCards.length}</strong> карти</div>
              <div>Заптие сила: <strong style={{ color: totalZaptieBoyna > 0 ? '#fca5a5' : 'oklch(0.75 0.03 75)' }}>{totalZaptieBoyna}</strong></div>
            </div>
          </div>
        </div>

        {/* CENTER: Field + Actions */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Current player header */}
          <div
            className="rounded-xl border p-3 flex items-center gap-3 flex-wrap"
            style={{
              background: 'oklch(0.22 0.04 55)',
              borderColor: PLAYER_COLORS[state.currentPlayerIndex],
              boxShadow: `0 0 20px ${PLAYER_COLORS[state.currentPlayerIndex]}30`,
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-cinzel font-bold flex-shrink-0"
              style={{ background: PLAYER_COLORS[state.currentPlayerIndex], color: 'white' }}
            >
              {state.currentPlayerIndex + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-cinzel font-bold" style={{ color: 'oklch(0.88 0.03 75)' }}>
                {player.name}
                {isMultiplayer && (
                  <span className="ml-2 font-source text-xs font-normal" style={{ color: isMyTurn ? '#6ee7a0' : 'oklch(0.55 0.03 65)' }}>
                    {isMyTurn ? '— Твой ход!' : '— играе...'}
                  </span>
                )}
              </div>
              <div className="font-source text-xs" style={{ color: 'oklch(0.55 0.03 65)' }}>
                {state.turnStep === 'recruiting' && `Вербуване — ${state.actionsRemaining} действия`}
                {state.turnStep === 'selection' && (
                  isPetkoSelection
                    ? `⚔️ Петко Войвода: запазваш 2 карти (изхвърли ${player.hand.length - 2})`
                    : needsDiscard
                    ? `⚠️ Изчисти до ${effectiveNabor} карти${player.dyadoIlyoActive ? ' (+2 Дядо Ильо)' : ''} (имаш ${player.hand.length})`
                    : 'Подбор на карти'
                )}
                {state.turnStep === 'forming' && (state.popHaritonForming ? '✝️ Поп Харитон: сформирай група' : 'Сформиране на групи')}
                {state.turnStep === 'end' && 'Край на хода'}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* Turn-start ability buttons */}
              {canUseSofroniy && (
                <button
                  onClick={() => dispatch({ type: 'USE_SOFRONIY_ABILITY' })}
                  className="px-3 py-1.5 rounded-lg font-source text-xs border transition-all hover:opacity-90"
                  style={{ borderColor: '#93c5fd', color: '#93c5fd', background: 'oklch(0.20 0.05 250)' }}
                  title="Безплатно проучване на горната карта от тестето"
                >
                  👁️ Софроний
                </button>
              )}
              {canUseHadzhi && !hadzhiMode && (
                <button
                  onClick={() => setHadzhiMode(true)}
                  className="px-3 py-1.5 rounded-lg font-source text-xs border transition-all hover:opacity-90"
                  style={{ borderColor: '#fca5a5', color: '#fca5a5', background: 'oklch(0.20 0.05 22)' }}
                  title="Премахни 1 Заптие от полето"
                >
                  🗡️ Хаджи Димитър
                </button>
              )}
              {hadzhiMode && (
                <span className="px-3 py-1.5 rounded-lg font-source text-xs animate-pulse"
                  style={{ color: '#fca5a5', background: 'oklch(0.22 0.06 22)' }}>
                  Избери Заптие за премахване...
                  <button onClick={() => setHadzhiMode(false)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
                </span>
              )}

              {isMyTurn && state.turnStep === 'recruiting' && state.actionsUsed > 0 && (
                <button
                  onClick={() => dispatch({ type: 'SKIP_ACTIONS' })}
                  className="px-3 py-1.5 rounded-lg font-source text-xs border transition-all hover:opacity-80"
                  style={{ borderColor: 'oklch(0.40 0.04 55)', color: 'oklch(0.65 0.03 70)', background: 'oklch(0.24 0.03 55)' }}
                >
                  Пропусни действия
                </button>
              )}
              {isSelectionStep && !needsDiscard && !isPetkoSelection && (
                <button
                  onClick={() => dispatch({ type: 'PROCEED_TO_FORMING' })}
                  className="btn-action px-3 py-1.5 rounded-lg text-xs"
                >
                  Спри изчистването
                </button>
              )}
              {isFormingStep && !state.popHaritonForming && (
                <button
                  onClick={() => dispatch({ type: 'END_TURN' })}
                  className="px-3 py-1.5 rounded-lg font-source text-xs border transition-all hover:opacity-80"
                  style={{ borderColor: 'oklch(0.40 0.04 55)', color: 'oklch(0.65 0.03 70)', background: 'oklch(0.24 0.03 55)' }}
                >
                  Край на хода
                </button>
              )}
              {isMyTurn && state.popHaritonForming && (
                <button
                  onClick={() => dispatch({ type: 'POP_HARITON_SKIP' })}
                  className="px-3 py-1.5 rounded-lg font-source text-xs border transition-all hover:opacity-80"
                  style={{ borderColor: '#a78bfa', color: '#a78bfa', background: 'oklch(0.20 0.05 280)' }}
                >
                  ✝️ Пропусни група
                </button>
              )}
              {isMyTurn && state.turnStep === 'end' && (
                <button
                  onClick={() => dispatch({ type: 'END_TURN' })}
                  className="btn-action px-3 py-1.5 rounded-lg text-xs"
                >
                  Край на хода →
                </button>
              )}
            </div>
          </div>

          {/* Panayot banner for non-beneficiary players in multiplayer */}
          {isMultiplayer && state.panayotTrigger && localPlayerIndex !== state.panayotTrigger.beneficiaryPlayerIndex && (
            <div className="rounded-xl border-2 p-3 text-center font-source text-sm animate-pulse"
              style={{ background: 'oklch(0.18 0.04 55)', borderColor: '#fdba74', color: '#fdba74' }}>
              🦊 Панайот Хитов: {state.players[state.panayotTrigger.beneficiaryPlayerIndex].name} избира карти от {state.players[state.panayotTrigger.defeatedPlayerIndex].name}...
            </div>
          )}

          {/* Message */}
          {state.message && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg px-4 py-2 font-source text-sm"
              style={{ background: 'oklch(0.24 0.04 55)', color: 'oklch(0.80 0.03 75)', borderLeft: `3px solid ${PLAYER_COLORS[state.currentPlayerIndex]}` }}
            >
              {state.message}
            </motion.div>
          )}

          {/* Zaptie Alert */}
          <AnimatePresence>
            {state.zaptieTrigger && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="rounded-xl border-2 p-4 text-center"
                style={{ background: 'oklch(0.18 0.08 22)', borderColor: '#c0392b' }}
              >
                <div className="text-3xl mb-2">🚨</div>
                <h3 className="font-cinzel text-lg font-bold mb-1" style={{ color: '#fca5a5' }}>
                  ЗАПТИЕ!
                </h3>
                <p className="font-source text-sm mb-3" style={{ color: 'oklch(0.75 0.03 75)' }}>
                  {state.message}
                </p>
                {state.zaptieTrigger.dyadoIlyoTriggered && (
                  <p className="font-source text-xs mb-2" style={{ color: '#86efac' }}>
                    🧓 Дядо Ильо: Заптието е отстранено! +2 карти за този ход.
                  </p>
                )}
                <button
                  onClick={() => dispatch({ type: 'ACKNOWLEDGE_ZAPTIE' })}
                  className="btn-danger px-6 py-2 rounded-lg font-bold"
                >
                  Продължи
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* THE FIELD */}
          <div
            className="rounded-xl border p-4"
            style={{ background: 'oklch(0.20 0.03 55)', borderColor: hadzhiMode ? '#fca5a5' : 'oklch(0.30 0.03 55)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-cinzel text-sm font-semibold tracking-wider" style={{ color: hadzhiMode ? '#fca5a5' : 'oklch(0.60 0.05 78)' }}>
                {hadzhiMode ? '🗡️ ИЗБЕРИ ЗАПТИЕ ЗА ПРЕМАХВАНЕ' : `ПОЛЕ (${state.field.length} карти)`}
              </h3>
              {canDoActions && state.deck.length > 0 && !hadzhiMode && (
                <button
                  onClick={() => dispatch({ type: 'RISKY_RECRUIT' })}
                  className="px-3 py-1.5 rounded-lg font-cinzel text-xs font-semibold border transition-all"
                  style={{ borderColor: '#c0392b', color: '#fca5a5', background: 'oklch(0.18 0.06 22)' }}
                >
                  🎲 Рисковано вербуване
                </button>
              )}
            </div>

{/* Helper to render a single field card slot */}
            {(() => {
              const mainCards = state.field.slice(0, 16);
              const extraCards = state.field.slice(16);

              const renderFieldCard = (card: Card, i: number) => {
                const isFaceUp = state.fieldFaceUp[i];
                const isRaisable = isFormingStep && isValidGroup && (card.type === 'voyvoda' || card.type === 'deyets') && isFaceUp;
                const isHadzhiTarget = hadzhiMode && isFaceUp && card.type === 'zaptie';
                return (
                  <div key={`${card.id}_${i}`} className="relative">
                    {isFaceUp ? (
                      <GameCard
                        card={card}
                        isSelectable={(canDoActions && card.type !== 'zaptie' && !hadzhiMode) || isRaisable || isHadzhiTarget}
                        highlight={isHadzhiTarget ? 'remove' : undefined}
                        onClick={() => {
                          if (isHadzhiTarget) {
                            dispatch({ type: 'USE_HADZHI_ABILITY', fieldIndex: i });
                            setHadzhiMode(false);
                          } else if (canDoActions && card.type !== 'zaptie') {
                            dispatch({ type: 'SAFE_RECRUIT', fieldIndex: i });
                          } else if (isRaisable) {
                            dispatch({ type: 'FORM_GROUP_RAISE_CARD', targetCardId: card.id });
                          }
                        }}
                        small
                      />
                    ) : (
                      <div
                        className={`rounded-lg overflow-hidden border shadow-md ${canDoActions && !hadzhiMode ? 'cursor-pointer' : ''}`}
                        style={{ width: 64, height: 100, borderColor: canDoActions && !hadzhiMode ? 'oklch(0.45 0.08 148)' : 'oklch(0.30 0.03 55)' }}
                        onClick={() => {
                          if (canDoActions && !hadzhiMode) dispatch({ type: 'SCOUT', fieldIndex: i });
                        }}
                      >
                        <img src={CARD_BACK} alt="Face down" className="w-full h-full object-cover" />
                        {canDoActions && !hadzhiMode && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                            <span className="text-xs font-cinzel text-emerald-400">🔍</span>
                          </div>
                        )}
                      </div>
                    )}
                    {isFaceUp && card.type === 'zaptie' && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-xs">
                        ⚔️
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <>
                  {/* Main 4×4 grid — always exactly 16 slots */}
                  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                    {mainCards.map((card, i) => renderFieldCard(card, i))}
                    {/* Empty placeholder slots while field is filling up */}
                    {Array.from({ length: Math.max(0, 16 - mainCards.length) }).map((_, j) => (
                      <div
                        key={`empty_${j}`}
                        className="rounded-lg border border-dashed"
                        style={{ width: 64, height: 100, borderColor: 'oklch(0.25 0.02 55)', opacity: 0.4 }}
                      />
                    ))}
                  </div>
                  {/* Extra cards aside (e.g. from Sofroniy peek or Risky recruit Zaптие overflow) */}
                  {extraCards.length > 0 && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'oklch(0.28 0.03 55)' }}>
                      <p className="font-cinzel text-xs mb-2" style={{ color: 'oklch(0.55 0.04 78)' }}>ДОПЪЛНИТЕЛНИ КАРТИ</p>
                      <div className="flex flex-wrap gap-2">
                        {extraCards.map((card, j) => renderFieldCard(card, 16 + j))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* HAND */}
          <div
            className="rounded-xl border p-4"
            style={{ background: 'oklch(0.20 0.03 55)', borderColor: 'oklch(0.30 0.03 55)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-cinzel text-sm font-semibold tracking-wider" style={{ color: 'oklch(0.60 0.05 78)' }}>
                {isMultiplayer && !isMyTurn ? `${handPlayer.name} — ` : ''}РЪКА ({handPlayer.hand.length}/{isMyTurn ? effectiveNabor : handPlayer.stats.nabor})
                {needsDiscard && <span className="ml-2 text-red-400">— изчисти {player.hand.length - effectiveNabor}</span>}
                {isPetkoSelection && <span className="ml-2" style={{ color: '#fca5a5' }}>— запазваш 2</span>}
              </h3>
              {isFormingStep && selectedHayduti.length > 0 && (
                <div className="font-source text-xs text-right" style={{ color: 'oklch(0.65 0.03 70)' }}>
                  {(() => {
                    // Show effective strength for each stat type
                    const bonuses = (['nabor', 'deynost', 'boyna'] as ContributionType[]).map(st => {
                      const b = getTraitGroupBonus(player, selectedHayduti, st);
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

            {handPlayer.hand.length === 0 ? (
              <p className="font-source text-sm italic" style={{ color: 'oklch(0.45 0.03 65)' }}>Ръката е празна</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {handPlayer.hand.map(card => {
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

          {/* FORMING INSTRUCTIONS */}
          {isFormingStep && selectedHayduti.length === 0 && (
            <div className="rounded-xl border p-3 font-source text-sm"
              style={{ background: 'oklch(0.20 0.04 55)', borderColor: 'oklch(0.35 0.06 148)', color: 'oklch(0.70 0.05 75)' }}>
              {state.popHaritonForming
                ? '✝️ Поп Харитон: избери Хайдути от ръката за последна група преди изчистване.'
                : '📌 Избери Хайдути от ръката си, за да сформираш група. Групата трябва да е с еднакъв принос (🎴/⚡/⚔️) или еднакъв цвят.'}
            </div>
          )}

          {/* FORMING HINT */}
          {isFormingStep && selectedHayduti.length > 0 && !isValidGroup && (
            <div className="rounded-xl border p-3 text-center font-source text-sm"
              style={{ background: 'oklch(0.20 0.04 22)', borderColor: 'oklch(0.35 0.08 22)', color: 'oklch(0.70 0.05 50)' }}>
              ⚠️ Групата трябва да е от Хайдути с еднакъв принос <em>или</em> еднакъв цвят
            </div>
          )}

          {/* FORMING ACTIONS */}
          {isFormingStep && isValidGroup && (
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
                {/* Improve stat buttons */}
                {(['nabor', 'deynost', 'boyna'] as ContributionType[]).map(stat => {
                  const traitBonus = getTraitGroupBonus(player, selectedHayduti, stat);
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
                      onClick={() => dispatch({ type: state.popHaritonForming ? 'POP_HARITON_FORM_GROUP' : 'FORM_GROUP_IMPROVE_STAT', statType: stat } as GameAction)}
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
                      {traitBonus > 0 && <span className="ml-1 text-yellow-400">+{traitBonus}✨</span>}
                      {maxVal
                        ? <span className="ml-1 opacity-70">{currentVal}→{maxVal} (нужна: {getUpgradeCost(maxVal)})</span>
                        : nextVal
                          ? <span className="ml-1 opacity-70">(нужна: {minCost})</span>
                          : <span className="ml-1 opacity-70">(макс.)</span>
                      }
                    </button>
                  );
                })}

                {/* Raise buttons for field raisable cards (not during pop hariton) */}
                {!state.popHaritonForming && raisableFromField.map(card => {
                  const traitBonus = getTraitGroupBonus(player, selectedHayduti, 'nabor'); // any-type bonuses
                  const effectiveStrength = baseGroupStrength + traitBonus;
                  const canRaise = effectiveStrength >= (card.cost ?? 999);
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
                      {card.type === 'voyvoda' ? '🏴' : '📜'} {card.name.slice(0, 12)} (💰{card.cost})
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
