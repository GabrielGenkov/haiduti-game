// ============================================================
// ХАЙДУТИ — Game Page
// Design: Хайдушка чета — warm board-game aesthetic
// ============================================================

import { useEffect, useReducer, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GameState,
  GameLength,
  Card,
  Player,
  ContributionType,
  CardColor,
  createInitialGameState,
  canFormGroupByContribution,
  canFormGroupByColor,
  getGroupStrength,
  getGroupContributions,
  getTotalZaptieBoyna,
  contributionLabel,
} from '@shared/gameData';
import { gameReducer, getTraitGroupBonus, GameAction } from '@shared/gameEngine';
import { getDeckCount, getUsedCardsCount, getPlayerHand, getPlayerHandCount, type AnyGameState } from '@/utils/view-helpers';
import {
  TABLE_BG, PLAYER_COLORS,
  PlayerBoard, PassDeviceScreen, ScoringScreen, PanayotOverlay, DecisionOverlay,
  FieldBoard, PlayerHand, FormingActions,
} from '@/components/game';

// ============================================================
// MAIN GAME COMPONENT
// ============================================================
interface GameProps {
  /** External state for multiplayer mode. If provided, local useReducer is skipped. */
  externalState?: AnyGameState;
  /** External dispatch for multiplayer mode. */
  externalDispatch?: (action: GameAction) => void;
  /** Index of the local player in multiplayer mode (used to show/hide hand). */
  localPlayerIndex?: number;
}

export default function Game({ externalState, externalDispatch, localPlayerIndex }: GameProps = {}) {
  const [, navigate] = useLocation();
  const [localGameState, localDispatch] = useReducer(gameReducer, null, () => {
    if (externalState) return externalState as GameState; // won't be used if externalState provided
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
  const pendingDecision = state.pendingDecision;
  const ownsPendingDecision =
    !pendingDecision || !isMultiplayer || localPlayerIndex === pendingDecision.ownerPlayerIndex;

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

  // Compute group info for selected cards
  const selectedHandCards = getPlayerHand(player).filter(c => state.selectedCards.includes(c.id));
  const selectedHayduti = selectedHandCards.filter(c => c.type === 'haydut');
  const groupByContrib = canFormGroupByContribution(selectedHayduti);
  const groupByColor = canFormGroupByColor(selectedHayduti);
  const isValidGroup = selectedHayduti.length >= 2 && (groupByContrib !== null || groupByColor !== null);
  const baseGroupStrength = getGroupStrength(selectedHayduti);
  const groupContributions = getGroupContributions(selectedHayduti);
  const availableRaiseStrengths =
    groupByContrib !== null
      ? [baseGroupStrength + getTraitGroupBonus(player as Player, selectedHayduti, groupByContrib)]
      : groupByColor !== null
      ? groupContributions.map(contribution => baseGroupStrength + getTraitGroupBonus(player as Player, selectedHayduti, contribution))
      : [];
  const maxRaiseStrength = availableRaiseStrengths.length > 0 ? Math.max(...availableRaiseStrengths) : 0;

  const raisableFromField = [
    ...(state.field as (Card | null)[]).filter((c, i): c is Card => c != null && state.fieldFaceUp[i] && (c.type === 'voyvoda' || c.type === 'deyets')),
    ...(state.sideField as (Card | null)[]).filter((c, i): c is Card => c != null && state.sideFieldFaceUp[i] && (c.type === 'voyvoda' || c.type === 'deyets')),
  ];

  const canDoActions = isMyTurn && state.turnStep === 'recruiting' && state.actionsRemaining > 0 && !pendingDecision;
  const isSelectionStep = isMyTurn && state.turnStep === 'selection';
  const isFormingStep = isMyTurn && state.turnStep === 'forming';
  const effectiveNabor = player.stats.nabor + (('dyadoIlyoActive' in player && player.dyadoIlyoActive) ? 2 : 0);
  const needsDiscard = isSelectionStep && !pendingDecision && getPlayerHandCount(player) > effectiveNabor;

  const isPetkoSelection =
    ownsPendingDecision &&
    pendingDecision?.kind === 'card_choice' &&
    'purpose' in pendingDecision && pendingDecision.purpose === 'petko_keep';

  const canUseSofroniy = canDoActions && player.traits.includes('sofroniy') && !state.sofroniyAbilityUsed;
  const canUseHadzhi = canDoActions && player.traits.includes('hadzhi') && !state.hadzhiAbilityUsed && (
    state.field.some((c, i) => c != null && state.fieldFaceUp[i] && c.type === 'zaptie') ||
    state.sideField.some((c, i) => c != null && state.sideFieldFaceUp[i] && c.type === 'zaptie')
  );
  const totalZaptieBoyna =
    getTotalZaptieBoyna(state.field as (Card | null)[], state.fieldFaceUp) +
    getTotalZaptieBoyna(state.sideField as (Card | null)[], state.sideFieldFaceUp);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'oklch(0.17 0.025 55)' }}>
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: `url(${TABLE_BG})`, backgroundSize: 'cover' }}
      />
      {pendingDecision && ownsPendingDecision && (
        <DecisionOverlay state={state} dispatch={dispatch} />
      )}

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
              <div>Тесте: <strong style={{ color: 'oklch(0.75 0.03 75)' }}>{getDeckCount(state)}</strong> карти</div>
              <div>Използ.: <strong style={{ color: 'oklch(0.75 0.03 75)' }}>{getUsedCardsCount(state)}</strong> карти</div>
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
              boxShadow: `0 0 12px ${PLAYER_COLORS[state.currentPlayerIndex]}30`,
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold font-cinzel text-white"
              style={{ background: PLAYER_COLORS[state.currentPlayerIndex] }}
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
                    ? `⚔️ Петко Войвода: запазваш 2 карти (изхвърли ${getPlayerHandCount(player) - 2})`
                    : needsDiscard
                    ? `⚠️ Изчисти до ${effectiveNabor} карти${('dyadoIlyoActive' in player && player.dyadoIlyoActive) ? ' (+2 Дядо Ильо)' : ''} (имаш ${getPlayerHandCount(player)})`
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
          {pendingDecision && !ownsPendingDecision && (
            <div className="rounded-xl border-2 p-3 text-center font-source text-sm animate-pulse"
              style={{ background: 'oklch(0.18 0.04 55)', borderColor: '#fdba74', color: '#fdba74' }}>
              🦊 Панайот Хитов избира карти...
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
          <FieldBoard
            state={state}
            canDoActions={canDoActions}
            isFormingStep={isFormingStep}
            isValidGroup={isValidGroup}
            hadzhiMode={hadzhiMode}
            onScout={(fieldIndex, zone) => dispatch({ type: 'SCOUT', fieldIndex, zone })}
            onSafeRecruit={(fieldIndex, zone) => dispatch({ type: 'SAFE_RECRUIT', fieldIndex, zone })}
            onRiskyRecruit={() => dispatch({ type: 'RISKY_RECRUIT' })}
            onHadzhiTarget={(fieldIndex) => {
              dispatch({ type: 'USE_HADZHI_ABILITY', fieldIndex });
              setHadzhiMode(false);
            }}
            onRaiseCard={(cardId) => dispatch({ type: 'FORM_GROUP_RAISE_CARD', targetCardId: cardId })}
          />

          {/* HAND */}
          <PlayerHand
            state={state}
            handPlayer={handPlayer}
            player={player}
            isMyTurn={isMyTurn}
            isMultiplayer={isMultiplayer}
            isFormingStep={isFormingStep}
            isSelectionStep={isSelectionStep}
            isValidGroup={isValidGroup}
            needsDiscard={needsDiscard}
            isPetkoSelection={isPetkoSelection}
            effectiveNabor={effectiveNabor}
            selectedHayduti={selectedHayduti}
            baseGroupStrength={baseGroupStrength}
            groupByContrib={groupByContrib}
            groupByColor={groupByColor}
            dispatch={dispatch}
          />

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
            <FormingActions
              player={player}
              selectedHayduti={selectedHayduti}
              baseGroupStrength={baseGroupStrength}
              groupByContrib={groupByContrib}
              groupByColor={groupByColor}
              groupContributions={groupContributions}
              raisableFromField={raisableFromField}
              maxRaiseStrength={maxRaiseStrength}
              popHaritonForming={state.popHaritonForming}
              dispatch={dispatch}
            />
          )}
        </div>
      </div>
    </div>
  );
}
