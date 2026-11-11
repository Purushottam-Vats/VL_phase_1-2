import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { session } from '../services/api';

const AuthContext = createContext(null);

export const homePathFor = (role) => (role === 'teacher' ? '/teacher' : '/student');

export function AuthProvider({ children }) {
  const hasToken = !!session.getToken();
  const [user, setUser] = useState(hasToken ? session.getUser() : null);
  const [loading, setLoading] = useState(hasToken);

  // Validate the stored token once on start-up. A network failure must NOT log the student out
  // (offline-first): we keep the cached profile. Only a real 401 clears the session.
  useEffect(() => {
    if (!hasToken) return;
    let alive = true;
    authService
      .me()
      .then((u) => { if (alive) { setUser(u); session.saveUser(u); } })
      .catch((err) => { if (err.response?.status === 401 && alive) setUser(null); })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [hasToken]);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(async (credentials) => {
    const { token, user: u } = await authService.login(credentials);
    session.save(token, u);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (payload) => {
    const { token, user: u } = await authService.register(payload);
    session.save(token, u);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    session.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
