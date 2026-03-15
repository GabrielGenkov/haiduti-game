import { motion } from 'framer-motion';
import { type Player, calculateScores } from '@shared/gameData';
import type { AnyGameState } from '@/utils/view-helpers';

export default function ScoringScreen({ state, onNewGame }: { state: AnyGameState; onNewGame: () => void }) {
  const scores = calculateScores(state.players as Player[]).sort((a, b) => b.total - a.total);
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
              <div className="text-xs font-source mb-2" style={{ color: 'oklch(0.50 0.03 65)' }}>
                Показатели: Н:{score.effectiveStats.nabor} Д:{score.effectiveStats.deynost} Б:{score.effectiveStats.boyna}
              </div>
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
            Нова игра
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
