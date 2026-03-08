import { useCallback, useEffect, useState } from 'react';
import { getMe } from "@/api/auth";
import { clearToken, getToken } from "@/api/client";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

let _cachedUser: AuthUser | null | undefined = undefined;
let _listeners: Array<() => void> = [];

function notifyListeners() {
  _listeners.forEach(fn => fn());
}

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = '/login' } = options ?? {};

  const [state, setState] = useState<AuthState>({
    user: _cachedUser ?? null,
    loading: _cachedUser === undefined,
    error: null,
    isAuthenticated: !!_cachedUser,
  });

  const refresh = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    const token = getToken();
    if (!token) {
      _cachedUser = null;
      setState({ user: null, loading: false, error: null, isAuthenticated: false });
      notifyListeners();
      return;
    }
    const user = await getMe();
    _cachedUser = user;
    setState({
      user,
      loading: false,
      error: null,
      isAuthenticated: user !== null,
    });
    notifyListeners();
  }, []);

  useEffect(() => {
    const handler = () => {
      setState({
        user: _cachedUser ?? null,
        loading: false,
        error: null,
        isAuthenticated: !!_cachedUser,
      });
    };
    _listeners.push(handler);
    return () => {
      _listeners = _listeners.filter(fn => fn !== handler);
    };
  }, []);

  useEffect(() => {
    if (_cachedUser !== undefined) return;
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.user) return;
    if (typeof window === 'undefined') return;
    if (window.location.pathname === redirectPath) return;
    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, state.loading, state.user]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });
    } finally {
      clearToken();
      _cachedUser = null;
      setState({ user: null, loading: false, error: null, isAuthenticated: false });
      notifyListeners();
    }
  }, []);

  return {
    ...state,
    refresh,
    logout,
  };
}
