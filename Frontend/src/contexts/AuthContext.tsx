/**
 * ============================================================
 * AuthContext — JWT-based Authentication
 * ============================================================
 *
 * - Tai profile tu API khi login
 * - Lang nghe auth:logout event tu config.ts (khi token het han)
 * - Tu dong refresh khi access token expiring (intercept 401)
 * - Persistence qua localStorage (tokens + user profile)
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '@/api/auth.api';
import { getMe } from '@/api/user.api';
import { getAccessToken, clearTokens } from '@/api/config';
import type { User } from '@/api/types';

const USER_STORAGE_KEY = 'ez_user';

// ── Types ────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (data: {
    fullName: string;
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
    inviteToken?: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Merge a partial update into the current user without a round-trip to the server. */
  patchUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshInProgress = useRef(false);

  // Khoi phuc user tu localStorage khi app khoi dong
  useEffect(() => {
    const restoreUser = async () => {
      const token = getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Token ton tai → thu lay profile tu API
      try {
        const profile = await getMe();
        setUser(profile);
      } catch {
        // Token het han hoac khong hop le → xoa
        clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreUser();
  }, []);

  // Lang nghe logout event tu fetch wrapper (401 → token expired)
  useEffect(() => {
    const handleForcedLogout = () => {
      clearTokens();
      setUser(null);
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    const res = await apiLogin(username, password);
    setUser(res.user);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
    return true;
  }, []);

  const register = useCallback(
    async (data: {
      fullName: string;
      email: string;
      username: string;
      password: string;
      confirmPassword: string;
      inviteToken?: string;
    }): Promise<boolean> => {
      try {
        const res = await apiRegister(data);
        setUser(res.user);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      clearTokens();
      setUser(null);
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, []);

  /** Instantly update specific user fields in context + localStorage (no API call). */
  const patchUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Refresh user profile tu API (goi sau khi update profile)
  const refreshUser = useCallback(async () => {
    if (refreshInProgress.current) return;
    refreshInProgress.current = true;
    try {
      const profile = await getMe();
      setUser(profile);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Silently fail — token het han se bi catch boi fetch wrapper
    } finally {
      refreshInProgress.current = false;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        patchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
