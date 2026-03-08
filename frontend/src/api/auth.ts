import { api, setToken, clearToken } from './client';
import type { AuthResponse, UserResponse, RegisterRequest, LoginRequest } from '@shared/api-types';

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/api/auth/register', data);
  setToken(res.token);
  return res;
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/api/auth/login', data);
  setToken(res.token);
  return res;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/api/auth/logout');
  } finally {
    clearToken();
  }
}

export async function getMe(): Promise<UserResponse | null> {
  try {
    return await api.get<UserResponse>('/api/auth/me');
  } catch {
    return null;
  }
}
