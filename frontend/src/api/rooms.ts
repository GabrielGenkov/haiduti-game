import { api } from './client';
import type { RoomResponse, RoomWithPlayersResponse, CreateRoomRequest, JoinRoomRequest, MyActiveRoomResponse } from '@shared/api-types';

export function listRooms() {
  return api.get<RoomResponse[]>('/api/rooms');
}

export function getRoom(code: string) {
  return api.get<RoomWithPlayersResponse>(`/api/rooms/${code}`);
}

export function createRoom(data: CreateRoomRequest) {
  return api.post<RoomWithPlayersResponse>('/api/rooms', data);
}

export function joinRoom(data: JoinRoomRequest) {
  return api.post<RoomWithPlayersResponse>('/api/rooms/join', data);
}

export function leaveRoom(roomId: number) {
  return api.delete<{ success: boolean }>(`/api/rooms/${roomId}/leave`);
}

export function getMyActiveRoom() {
  return api.get<MyActiveRoomResponse | null>('/api/rooms/my-active');
}
