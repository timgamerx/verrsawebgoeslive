import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../components/supabase';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_SESSION_KEY = 'verrsa_auth_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveSession = (s: Session) => {
    try {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
        access_token: s.access_token,
        refresh_token: s.refresh_token,
      }));
    } catch { /* ignore */ }
  };

  const loadSession = (): { access_token: string; refresh_token: string } | null => {
    try {
      const raw = localStorage.getItem(AUTH_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const clearSession = () => {
    try { localStorage.removeItem(AUTH_SESSION_KEY); } catch { /* ignore */ }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          setSession(currentSession);
          saveSession(currentSession);
        } else {
          const stored = loadSession();
          if (stored) {
            const { data, error } = await supabase.auth.setSession({
              access_token: stored.access_token,
              refresh_token: stored.refresh_token,
            });
            if (error || !data.session) {
              clearSession();
              setSession(null);
            } else {
              setSession(data.session);
              saveSession(data.session);
            }
          }
        }
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === 'SIGNED_IN' && newSession) {
          setSession(newSession);
          saveSession(newSession);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          clearSession();
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          setSession(newSession);
          saveSession(newSession);
        }
      },
    );

    return () => { authListener.subscription.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (newSession: Session) => {
    setSession(newSession);
    saveSession(newSession);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        isAuthenticated: !!session,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
