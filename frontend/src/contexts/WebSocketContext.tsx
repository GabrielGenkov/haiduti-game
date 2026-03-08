/**
 * WebSocket context for Хайдути multiplayer.
 * Provides a single WS connection shared across all components.
 * Uses JWT token from localStorage for authentication (no cookies).
 */
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { GameState } from '@shared/gameData';
import type { GameAction } from '@shared/gameEngine';
import { getToken } from "@/api/client";

// ─── Message types ────────────────────────────────────────────────────────────

export interface PlayerInfo {
  userId: number;
  playerName: string;
  seatIndex: number;
  isConnected: boolean;
}

export interface RoomInfo {
  id: number;
  code: string;
  name: string;
  hostId: number;
  status: string;
  gameLength: string;
  maxPlayers: number;
}

export type WsMessage =
  | { type: 'AUTH_OK'; userId: number; name: string }
  | { type: 'AUTH_ERROR'; message: string }
  | { type: 'ROOM_STATE'; room: RoomInfo; players: PlayerInfo[]; gameState: GameState | null }
  | { type: 'STATE_UPDATE'; gameState: GameState; version: number }
  | { type: 'PLAYER_JOINED'; player: PlayerInfo }
  | { type: 'PLAYER_LEFT'; userId: number; playerName: string }
  | { type: 'PLAYER_RECONNECTED'; userId: number; playerName: string }
  | { type: 'GAME_STARTED'; gameState: GameState }
  | { type: 'GAME_OVER' }
  | { type: 'ERROR'; message: string }
  | { type: 'PONG' };

// ─── Context ──────────────────────────────────────────────────────────────────

interface WsContextValue {
  connected: boolean;
  authenticated: boolean;
  room: RoomInfo | null;
  players: PlayerInfo[];
  gameState: GameState | null;
  lastError: string | null;
  connect: () => void;
  authenticate: () => void;
  joinRoom: (code: string) => void;
  startGame: () => void;
  sendAction: (action: GameAction) => void;
  clearError: () => void;
}

const WsContext = createContext<WsContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAuthRef = useRef<boolean>(false);
  const pendingRoomRef = useRef<string | null>(null);

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const sendAuth = useCallback(() => {
    const token = getToken();
    if (token && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'AUTH', token }));
    }
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    let msg: WsMessage;
    try { msg = JSON.parse(event.data); } catch { return; }

    switch (msg.type) {
      case 'AUTH_OK':
        setAuthenticated(true);
        // If we had a pending room join, do it now
        if (pendingRoomRef.current) {
          send({ type: 'JOIN_ROOM', roomCode: pendingRoomRef.current });
          pendingRoomRef.current = null;
        }
        break;
      case 'AUTH_ERROR':
        setLastError(msg.message);
        setAuthenticated(false);
        break;
      case 'ROOM_STATE':
        setRoom(msg.room);
        setPlayers(msg.players);
        if (msg.gameState) setGameState(msg.gameState);
        break;
      case 'STATE_UPDATE':
        setGameState(msg.gameState);
        break;
      case 'GAME_STARTED':
        setGameState(msg.gameState);
        break;
      case 'PLAYER_JOINED':
        setPlayers(prev => {
          const exists = prev.find(p => p.userId === msg.player.userId);
          if (exists) return prev;
          return [...prev, msg.player].sort((a, b) => a.seatIndex - b.seatIndex);
        });
        break;
      case 'PLAYER_LEFT':
        setPlayers(prev => prev.map(p =>
          p.userId === msg.userId ? { ...p, isConnected: false } : p
        ));
        break;
      case 'PLAYER_RECONNECTED':
        setPlayers(prev => prev.map(p =>
          p.userId === msg.userId ? { ...p, isConnected: true } : p
        ));
        break;
      case 'ERROR':
        setLastError(msg.message);
        break;
      case 'PONG':
        break;
    }
  }, [send]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Immediately authenticate with JWT from localStorage
      if (pendingAuthRef.current) {
        sendAuth();
      }
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      setConnected(false);
      setAuthenticated(false);
      // Reconnect after 3 seconds
      reconnectTimerRef.current = setTimeout(() => connect(), 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [handleMessage, sendAuth]);

  const authenticate = useCallback(() => {
    pendingAuthRef.current = true;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendAuth();
    } else {
      connect();
    }
  }, [connect, sendAuth]);

  const joinRoom = useCallback((code: string) => {
    if (authenticated) {
      send({ type: 'JOIN_ROOM', roomCode: code });
    } else {
      pendingRoomRef.current = code;
    }
  }, [authenticated, send]);

  const startGame = useCallback(() => {
    send({ type: 'START_GAME' });
  }, [send]);

  const sendAction = useCallback((action: GameAction) => {
    send({ type: 'ACTION', payload: action });
  }, [send]);

  const clearError = useCallback(() => setLastError(null), []);

  // Keepalive ping every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        send({ type: 'PING' });
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [send]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, []);

  return (
    <WsContext.Provider value={{
      connected, authenticated, room, players, gameState, lastError,
      connect, authenticate, joinRoom, startGame, sendAction, clearError,
    }}>
      {children}
    </WsContext.Provider>
  );
}

export function useWebSocket() {
  const ctx = useContext(WsContext);
  if (!ctx) throw new Error('useWebSocket must be used inside WebSocketProvider');
  return ctx;
}
