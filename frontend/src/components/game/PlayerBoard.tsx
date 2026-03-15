import type { AnyGameState } from '@/utils/view-helpers';
import StatTrack from './StatTrack';
import TraitBadge from './TraitBadge';
import { PLAYER_COLORS } from './constants';

export default function PlayerBoard({ state, playerIndex }: { state: AnyGameState; playerIndex: number }) {
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
