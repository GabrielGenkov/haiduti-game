// ХАЙДУТИ — Setup Page
// Design: Хайдушка чета — warm board-game aesthetic
// Setup: player names input, game length selection, start game

import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { GameLength } from '@shared/gameData';
import { CDN_BASE } from '@/config';

const TABLE_BG = `${CDN_BASE}/haiduti-table-bg-3gp2hdrBo9Wp4k5QjKnMim.webp`;

const GAME_LENGTH_OPTIONS: { value: GameLength; label: string; desc: string; rotations: string }[] = [
  { value: 'short',  label: 'Кратка',  desc: '2 завъртания на тестето', rotations: '~20 мин' },
  { value: 'medium', label: 'Средна',  desc: '3 завъртания на тестето', rotations: '~35 мин' },
  { value: 'long',   label: 'Дълга',   desc: '4 завъртания на тестето', rotations: '~50 мин' },
];

const PLAYER_COLORS = [
  'oklch(0.50 0.15 148)',  // green
  'oklch(0.50 0.15 250)',  // blue
  'oklch(0.55 0.20 22)',   // red
  'oklch(0.72 0.15 85)',   // yellow
  'oklch(0.55 0.15 300)',  // purple
  'oklch(0.60 0.15 200)',  // cyan
];

// Store game config in sessionStorage so Game page can read it
function saveGameConfig(players: string[], gameLength: GameLength) {
  sessionStorage.setItem('haiduti_config', JSON.stringify({ players, gameLength }));
}

export default function Setup() {
  const [, navigate] = useLocation();
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState<string[]>(['Играч 1', 'Играч 2', 'Играч 3', 'Играч 4', 'Играч 5', 'Играч 6']);
  const [gameLength, setGameLength] = useState<GameLength>('medium');

  const handleNameChange = (index: number, value: string) => {
    const updated = [...playerNames];
    updated[index] = value;
    setPlayerNames(updated);
  };

  const handleStart = () => {
    const names = playerNames.slice(0, playerCount).map((n, i) => n.trim() || `Играч ${i + 1}`);
    saveGameConfig(names, gameLength);
    navigate('/game');
  };

  return (
    <div
      className="min-h-screen relative"
      style={{ background: 'oklch(0.17 0.025 55)' }}
    >
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-15 pointer-events-none"
        style={{ backgroundImage: `url(${TABLE_BG})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <button
            onClick={() => navigate('/')}
            className="font-source text-sm mb-4 inline-flex items-center gap-1 transition-opacity hover:opacity-80"
            style={{ color: 'oklch(0.55 0.03 70)' }}
          >
            &larr; Назад
          </button>
          <h1
            className="font-cinzel text-4xl font-black tracking-widest"
            style={{ color: 'oklch(0.72 0.12 78)', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
          >
            НОВА ИГРА
          </h1>
          <p className="font-lora italic mt-2" style={{ color: 'oklch(0.60 0.03 70)' }}>
            Подготовка на комитетите
          </p>
        </motion.div>

        {/* Player Count */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border p-6 mb-5"
          style={{ background: 'oklch(0.21 0.03 55)', borderColor: 'oklch(0.32 0.04 55)' }}
        >
          <h2 className="font-cinzel text-lg font-semibold mb-4" style={{ color: 'oklch(0.72 0.12 78)' }}>
            Брой играчи
          </h2>
          <div className="flex gap-2 flex-wrap">
            {[2, 3, 4, 5, 6].map(n => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                className="w-12 h-12 rounded-lg font-cinzel text-lg font-bold transition-all border"
                style={playerCount === n ? {
                  background: 'oklch(0.40 0.10 148)',
                  borderColor: 'oklch(0.55 0.12 148)',
                  color: 'oklch(0.95 0.02 80)',
                  boxShadow: '0 0 12px oklch(0.40 0.10 148 / 0.5)',
                } : {
                  background: 'oklch(0.25 0.03 55)',
                  borderColor: 'oklch(0.35 0.04 55)',
                  color: 'oklch(0.65 0.03 70)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Player Names */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border p-6 mb-5"
          style={{ background: 'oklch(0.21 0.03 55)', borderColor: 'oklch(0.32 0.04 55)' }}
        >
          <h2 className="font-cinzel text-lg font-semibold mb-4" style={{ color: 'oklch(0.72 0.12 78)' }}>
            Имена на играчите
          </h2>
          <div className="space-y-3">
            <AnimatePresence>
              {Array.from({ length: playerCount }, (_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-cinzel text-sm font-bold flex-shrink-0"
                    style={{ background: PLAYER_COLORS[i], color: 'white' }}
                  >
                    {i + 1}
                  </div>
                  <input
                    type="text"
                    value={playerNames[i]}
                    onChange={e => handleNameChange(i, e.target.value)}
                    placeholder={`Играч ${i + 1}`}
                    maxLength={20}
                    className="flex-1 rounded-lg px-3 py-2 font-source text-sm outline-none transition-all border"
                    style={{
                      background: 'oklch(0.26 0.03 55)',
                      borderColor: 'oklch(0.38 0.04 55)',
                      color: 'oklch(0.88 0.02 75)',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = 'oklch(0.55 0.12 148)';
                      e.target.style.boxShadow = '0 0 0 2px oklch(0.40 0.10 148 / 0.3)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = 'oklch(0.38 0.04 55)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Game Length */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border p-6 mb-8"
          style={{ background: 'oklch(0.21 0.03 55)', borderColor: 'oklch(0.32 0.04 55)' }}
        >
          <h2 className="font-cinzel text-lg font-semibold mb-4" style={{ color: 'oklch(0.72 0.12 78)' }}>
            Дължина на играта
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {GAME_LENGTH_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setGameLength(opt.value)}
                className="rounded-lg p-4 text-left transition-all border"
                style={gameLength === opt.value ? {
                  background: 'oklch(0.26 0.06 55)',
                  borderColor: 'oklch(0.55 0.12 148)',
                  boxShadow: '0 0 12px oklch(0.40 0.10 148 / 0.3)',
                } : {
                  background: 'oklch(0.24 0.03 55)',
                  borderColor: 'oklch(0.32 0.04 55)',
                }}
              >
                <div
                  className="font-cinzel font-bold text-base mb-1"
                  style={{ color: gameLength === opt.value ? 'oklch(0.72 0.12 78)' : 'oklch(0.65 0.03 70)' }}
                >
                  {opt.label}
                </div>
                <div className="font-source text-xs" style={{ color: 'oklch(0.55 0.03 65)' }}>
                  {opt.desc}
                </div>
                <div className="font-source text-xs mt-1" style={{ color: 'oklch(0.50 0.05 148)' }}>
                  {opt.rotations}
                </div>
              </button>
            ))}
          </div>
          <p className="font-source text-xs mt-3" style={{ color: 'oklch(0.50 0.03 65)' }}>
            Препоръчително за начинаещи: Кратка игра
          </p>
        </motion.div>

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <motion.button
            onClick={handleStart}
            className="btn-action px-12 py-4 rounded-xl text-xl font-black shadow-2xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            {'\u2694\uFE0F'} Начало на играта
          </motion.button>
          <p className="font-source text-xs mt-3" style={{ color: 'oklch(0.45 0.03 65)' }}>
            Pass &amp; Play — играта се провежда на едно устройство
          </p>
        </motion.div>
      </div>
    </div>
  );
}
