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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Proactively refresh token every 10 minutes to prevent expiry
    const refreshInterval = setInterval(async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        await supabase.auth.refreshSession();
      }
    }, 10 * 60 * 1000);

    // Refresh session when tab becomes visible again (e.g. user returns after hours)
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          // Only refresh if the token is close to expiring (within 5 minutes)
          const expiresAt = currentSession.expires_at;
          const now = Math.floor(Date.now() / 1000);
          if (expiresAt && expiresAt - now < 300) {
            const { error } = await supabase.auth.refreshSession();
            if (error) {
              console.warn('Session refresh failed on visibility change:', error.message);
            }
            // onAuthStateChange listener will handle state updates
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
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
    const customDomain = "https://aiassetlabs.com";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${customDomain}/auth?mode=reset`,
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
