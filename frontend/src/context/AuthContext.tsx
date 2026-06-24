import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { getCurrentUser, logoutLocal, upsertOAuthUser } from '../localStore';
import { User } from '../types';

type OAuthPayload = {
  email?: string;
  name?: string;
};

interface AuthState {
  user: User | null;
  loading: boolean;
  completeOAuth: (token: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function decodeOAuthPayload(token: string): OAuthPayload {
  const payload = token.split('.')[1];
  if (!payload) return {};
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return JSON.parse(window.atob(padded)) as OAuthPayload;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getCurrentUser());
    setLoading(false);
  }, []);

  const completeOAuth = useCallback(async (token: string) => {
    localStorage.setItem('token', token);
    const payload = decodeOAuthPayload(token);
    if (!payload.email) throw new Error('OAuth token did not include an email.');
    const nextUser = upsertOAuthUser({
      email: payload.email,
      name: payload.name ?? payload.email.split('@')[0],
    });
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    logoutLocal();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, completeOAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
