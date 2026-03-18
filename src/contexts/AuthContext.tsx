import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    // Rely on the auth client's built-in auto refresh flow.
    // Avoid manual refresh timers/visibility refresh to prevent race conditions.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    // Hydrate current session on first mount.
    supabase.auth
      .getSession()
      .then(({ data: { session: currentSession } }) => {
        applySession(currentSession);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    // Send welcome email after successful signup (don't block on failure)
    if (!error && data.user) {
      supabase.functions.invoke('send-welcome-email', {
        body: { email, fullName }
      }).catch(err => {
        console.error('Failed to send welcome email:', err);
      });
    }

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      // Clear local state first to ensure UI updates
      setUser(null);
      setSession(null);
      
      // Attempt to sign out from Supabase (ignore errors if session is already missing)
      await supabase.auth.signOut();
    } catch (error: any) {
      // Ignore "Auth session missing" errors - user is already signed out
      if (error?.name !== 'AuthSessionMissingError') {
        console.error('Failed to sign out:', error);
      }
    }
  };

  const resetPassword = async (email: string) => {
    const customDomain = "https://assetlabs.ai";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${customDomain}/reset-password`,
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading,
      isAuthenticated: !!user,
      signUp, 
      signIn, 
      signOut,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
