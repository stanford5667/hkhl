import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  emailVerified: boolean;
  checkingVerification: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshVerificationStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);

  // Check if user's email is verified in our custom table
  const checkEmailVerification = useCallback(async (email: string) => {
    try {
      setCheckingVerification(true);
      const { data, error } = await supabase
        .from('email_verifications')
        .select('verified')
        .eq('email', email)
        .eq('verified', true)
        .limit(1);
      
      if (error) {
        console.error("Error checking email verification:", error);
        return false;
      }

      const isVerified = data && data.length > 0;
      setEmailVerified(isVerified);
      return isVerified;
    } catch (err) {
      console.error("Email verification check error:", err);
      return false;
    } finally {
      setCheckingVerification(false);
    }
  }, []);

  const refreshVerificationStatus = useCallback(async () => {
    if (user?.email) {
      await checkEmailVerification(user.email);
    }
  }, [user?.email, checkEmailVerification]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check email verification when user signs in
        if (session?.user?.email) {
          await checkEmailVerification(session.user.email);
        } else {
          setEmailVerified(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user?.email) {
        await checkEmailVerification(session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkEmailVerification]);

  // Set up realtime subscription for email verification updates
  useEffect(() => {
    if (!user?.email) return;

    const channel = supabase
      .channel('auth-email-verification')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'email_verifications',
          filter: `email=eq.${user.email}`,
        },
        (payload) => {
          if (payload.new && (payload.new as { verified: boolean }).verified) {
            setEmailVerified(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email]);

  const signUp = async (email: string, password: string, fullName: string) => {
    // Sign up user - we handle verification ourselves via Loops, so skip Supabase's email
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: undefined, // Don't use Supabase's email confirmation
      },
    });

    if (error) {
      return { error: error as Error | null };
    }

    // If signup succeeded, send custom verification email via Loops
    if (data.user) {
      try {
        const response = await supabase.functions.invoke('send-verification-email', {
          body: {
            userId: data.user.id,
            email: email,
            fullName: fullName,
          },
        });

        if (response.error) {
          console.error('Failed to send verification email:', response.error);
          // Don't fail the signup, just log the error
        }
      } catch (err) {
        console.error('Error sending verification email:', err);
      }
    }

    return { error: null };
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
      // Clear local state immediately
      setUser(null);
      setSession(null);
      setEmailVerified(false);
    } catch (error) {
      console.error('Failed to sign out:', error);
      throw error;
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
      emailVerified,
      checkingVerification,
      isAuthenticated: !!user,
      signUp, 
      signIn, 
      signOut,
      resetPassword,
      refreshVerificationStatus,
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
