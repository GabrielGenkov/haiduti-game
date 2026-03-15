/**
 * MultiplayerGame — wraps the local Game board with WebSocket state.
 * The server is the authoritative source of truth; we only send actions
 * and render whatever state the server broadcasts back.
 */
import { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/api/auth';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { toast } from 'sonner';
import Game from './Game';
import type { GameAction } from '@shared/gameEngine';

export default function MultiplayerGame() {
  const params = useParams<{ code: string }>();
  const code = params.code ?? '';
  const [, navigate] = useLocation();

  const { user } = useAuth();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });

  const {
    connected, authenticated, authenticate,
    joinRoom, room, players, gameState, lastError, clearError,
    sendCommand,
  } = useWebSocket();

  // Auth + join
  useEffect(() => {
    if (me && !authenticated) {
      authenticate();
    }
  }, [me, authenticated, authenticate]);

  useEffect(() => {
    if (authenticated && code) {
      joinRoom(code);
    }
  }, [authenticated, code, joinRoom]);

  // Redirect back to waiting room if game not started yet
  useEffect(() => {
    if (room && room.status === 'waiting') {
      navigate(`/room/${code}`);
    }
  }, [room, code, navigate]);

  // Show errors
  useEffect(() => {
    if (lastError) {
      toast.error(lastError);
      clearError();
    }
  }, [lastError, clearError]);

  // Find local player's seat index
  const localSeatIndex = players.find(p => p.userId === me?.id)?.seatIndex ?? 0;

  // Loading state
  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(0.17 0.025 55)' }}>
        <div className="text-center">
          <div className="font-cinzel text-amber-300 text-xl animate-pulse mb-2">Зареждане на играта...</div>
          <div className="flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
            <span className="font-source text-xs text-amber-200/50">
              {connected ? (authenticated ? 'Свързан' : 'Удостоверяване...') : 'Свързване...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Dispatch wrapper: send commands to server (wraps action with identity + revision)
  const handleDispatch = (action: GameAction) => {
    sendCommand(action);
  };

  return (
    <Game
      externalState={gameState}
      externalDispatch={handleDispatch}
      localPlayerIndex={localSeatIndex}
    />
  );
}
