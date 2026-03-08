import { useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getMe } from '@/api/auth';
import { getRoom, leaveRoom } from '@/api/rooms';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { toast } from 'sonner';

const GAME_LENGTH_LABELS: Record<string, string> = {
  short: 'Кратка (2 ротации)',
  medium: 'Нормална (3 ротации)',
  long: 'Дълга (4 ротации)',
};

export default function WaitingRoom() {
  const params = useParams<{ code: string }>();
  const code = params.code ?? '';
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { connected, authenticated, authenticate, joinRoom, startGame, room, players, gameState, lastError, clearError } = useWebSocket();

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });

  // Connect WS and authenticate when we have a session
  useEffect(() => {
    if (me && !authenticated) {
      authenticate();
    }
  }, [me, authenticated, authenticate]);

  // Join room once authenticated
  useEffect(() => {
    if (authenticated && code) {
      joinRoom(code);
    }
  }, [authenticated, code, joinRoom]);

  // Navigate to game when game starts
  useEffect(() => {
    if (gameState && room?.status === 'playing') {
      navigate(`/game/${room.code}`);
    }
  }, [gameState, room, navigate]);

  // Show errors as toasts
  useEffect(() => {
    if (lastError) {
      toast.error(lastError);
      clearError();
    }
  }, [lastError, clearError]);

  const { data: roomData } = useQuery({
    queryKey: ['room', code],
    queryFn: () => getRoom(code),
    enabled: !!code,
    refetchInterval: 3000,
  });

  const leaveMutation = useMutation({
    mutationFn: (roomId: number) => leaveRoom(roomId),
    onSuccess: () => navigate('/lobby'),
    onError: (e: Error) => toast.error(e.message),
  });

  const isHost = roomData?.room?.hostId === me?.id;
  const playerCount = roomData?.players?.length ?? 0;
  const maxPlayers = roomData?.room?.maxPlayers ?? 6;
  const canStart = isHost && playerCount >= 2;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'oklch(0.17 0.025 55)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-cinzel text-4xl font-black tracking-widest mb-1" style={{ color: 'oklch(0.92 0.06 78)' }}>
            ХАЙДУТИ
          </h1>
          <p className="font-lora text-amber-200/60 italic">Чакалня</p>
        </div>

        {/* Room info card */}
        <div className="rounded-2xl border p-6 mb-4" style={{ background: 'oklch(0.22 0.03 55)', borderColor: 'oklch(0.35 0.04 55)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-cinzel text-lg font-bold" style={{ color: 'oklch(0.88 0.04 80)' }}>
                {roomData?.room?.name ?? '...'}
              </div>
              <div className="font-source text-xs text-amber-200/50 mt-0.5">
                {GAME_LENGTH_LABELS[roomData?.room?.gameLength ?? 'medium']}
              </div>
            </div>
            <div className="text-center">
              <div className="font-cinzel text-2xl font-black tracking-widest" style={{ color: 'oklch(0.65 0.14 148)' }}>
                {code}
              </div>
              <div className="font-source text-xs text-amber-200/40">код на стаята</div>
            </div>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
            <span className="font-source text-xs text-amber-200/50">
              {connected ? (authenticated ? 'Свързан' : 'Удостоверяване...') : 'Свързване...'}
            </span>
          </div>

          {/* Players list */}
          <div className="mb-4">
            <div className="font-cinzel text-xs font-semibold text-amber-200/50 mb-2 uppercase tracking-wider">
              Играчи ({playerCount}/{maxPlayers})
            </div>
            <div className="space-y-2">
              {(roomData?.players ?? []).map((player, i) => (
                <motion.div
                  key={player.userId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2"
                  style={{ background: 'oklch(0.26 0.03 55)' }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center font-cinzel text-xs font-bold"
                    style={{ background: 'oklch(0.35 0.08 55)', color: 'oklch(0.88 0.04 80)' }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-cinzel text-sm font-semibold" style={{ color: 'oklch(0.88 0.04 80)' }}>
                      {player.playerName}
                      {player.userId === roomData?.room?.hostId && (
                        <span className="ml-2 text-xs text-amber-400">{'\u{1F451}'} Домакин</span>
                      )}
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-green-400' : 'bg-gray-500'}`} />
                </motion.div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: Math.max(0, (roomData?.room?.maxPlayers ?? 4) - playerCount) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 border border-dashed"
                  style={{ borderColor: 'oklch(0.30 0.03 55)' }}
                >
                  <div className="w-7 h-7 rounded-full" style={{ background: 'oklch(0.25 0.02 55)' }} />
                  <span className="font-source text-xs text-amber-200/25">Чака играч...</span>
                </div>
              ))}
            </div>
          </div>

          {/* Share code hint */}
          <div className="rounded-lg p-3 text-center" style={{ background: 'oklch(0.19 0.025 55)' }}>
            <p className="font-source text-xs text-amber-200/50">
              Сподели кода <span className="font-cinzel font-bold text-amber-300">{code}</span> с приятелите си
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (roomData?.room?.id) leaveMutation.mutate(roomData.room.id);
              else navigate('/lobby');
            }}
            className="flex-1 py-3 rounded-xl font-cinzel text-sm font-semibold border transition-all hover:opacity-80"
            style={{ borderColor: 'oklch(0.40 0.05 55)', color: 'oklch(0.65 0.03 70)', background: 'oklch(0.22 0.03 55)' }}
          >
            &larr; Напусни
          </button>

          {isHost && (
            <motion.button
              onClick={startGame}
              disabled={!canStart}
              whileHover={canStart ? { scale: 1.02 } : {}}
              whileTap={canStart ? { scale: 0.98 } : {}}
              className="flex-1 py-3 rounded-xl font-cinzel text-sm font-bold transition-all disabled:opacity-40"
              style={{ background: canStart ? 'oklch(0.50 0.14 55)' : 'oklch(0.30 0.05 55)', color: 'oklch(0.95 0.02 80)' }}
            >
              {canStart ? '\u2694\uFE0F Започни играта' : `Нужни ${2 - playerCount} играча`}
            </motion.button>
          )}

          {!isHost && (
            <div className="flex-1 py-3 rounded-xl text-center font-source text-sm text-amber-200/40"
              style={{ background: 'oklch(0.20 0.025 55)' }}>
              Чака домакина...
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
