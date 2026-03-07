/**
 * useAuth — provides authentication state backed by the email+password auth system.
 *
 * Uses /api/auth/me and /api/auth/logout directly via fetch
 * (no OAuth redirect, no tRPC dependency for auth).
 */
import { useCallback, useEffect, useState } from "react";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: "user" | "admin";
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

let _cachedUser: AuthUser | null | undefined = undefined; // undefined = not yet fetched
let _listeners: Array<() => void> = [];

function notifyListeners() {
  _listeners.forEach(fn => fn());
}

async function fetchMe(): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } =
    options ?? {};

  const [state, setState] = useState<AuthState>({
    user: _cachedUser ?? null,
    loading: _cachedUser === undefined,
    error: null,
    isAuthenticated: !!_cachedUser,
  });

  const refresh = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    const user = await fetchMe();
    _cachedUser = user;
    setState({
      user,
      loading: false,
      error: null,
      isAuthenticated: user !== null,
    });
    notifyListeners();
  }, []);

  // Subscribe to cross-component updates
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

  // Initial load
  useEffect(() => {
    if (_cachedUser !== undefined) return;
    refresh();
  }, [refresh]);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;
    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, state.loading, state.user]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
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
