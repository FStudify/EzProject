import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from './authService';
import { login as authLogin } from './authService';

const STORAGE_KEY = 'ezproject_user';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function saveUser(user: User | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(loadStoredUser());
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const u = await authLogin(username, password);
    if (u) {
      setUser(u);
      saveUser(u);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    saveUser(null);
  }, []);

  const setUserDirect = useCallback((u: User | null) => {
    setUser(u);
    saveUser(u);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setUser: setUserDirect }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
