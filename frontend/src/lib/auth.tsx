/**
 * Velocis — Auth Context
 * Handles JWT storage/retrieval and current user state.
 * On mount, reads token from localStorage; also handles OAuth callback (token in URL).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  type AuthUser,
  clearToken,
  getMe,
  getToken,
  logout as apiLogout,
  redirectToGitHubOAuth,
  setToken,
  TOKEN_KEY,
} from './api';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // On mount: check URL for token from OAuth callback, then load user
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token') ?? params.get('access_token');

    if (urlToken) {
      setToken(urlToken);
      setTokenState(urlToken);
      // Clean token from URL so it doesn't leak in history
      const clean = new URL(window.location.href);
      clean.searchParams.delete('token');
      clean.searchParams.delete('access_token');
      window.history.replaceState({}, '', clean.toString());
    }

    // Always call getMe — request uses credentials: 'include' so the
    // velocis_session cookie is sent even when there is no localStorage token.
    getMe()
      .then((u) => setUser(u))
      .catch(() => {
        // Invalid / expired session — clear any stored token
        clearToken();
        setTokenState(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(() => {
    redirectToGitHubOAuth();
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // ignore server errors on logout
    } finally {
      clearToken();
      setTokenState(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token: token ?? localStorage.getItem(TOKEN_KEY),
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Fallback when called outside AuthProvider (e.g. during React Router's
    // initial render phase). Return a safe loading state instead of crashing.
    return {
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,
      login: () => {},
      logout: async () => {},
    };
  }
  return ctx;
}
