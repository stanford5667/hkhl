/**
 * Auth Step Component
 * Handles authentication during the questionnaire flow.
 * Uses the shared <AuthForm /> so copy and CTAs match the rest of the app.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles, Shield, TrendingUp } from 'lucide-react';
import { AuthForm, type AuthMode } from '@/components/auth/AuthForm';
import { AUTH_COPY } from '@/lib/authCopy';

interface AuthStepProps {
  progress: number;
  onComplete: (userData: {
    email: string;
    firstName: string;
    lastName: string;
    userId: string;
  }) => void;
}

export function AuthStep({ progress, onComplete }: AuthStepProps) {
  const [mode, setMode] = useState<AuthMode>('signup');

  return (
    <div className="min-h-[100dvh] bg-background text-foreground overflow-x-hidden overflow-y-auto flex items-start justify-center px-4 sm:px-6 py-6 pb-[calc(env(safe-area-inset-bottom)+6rem)]">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-primary/10 rounded-full blur-[100px] sm:blur-[150px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-secondary/10 rounded-full blur-[80px] sm:blur-[130px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{progress}%</span>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl max-h-[calc(100dvh-10rem)] overflow-y-auto">
          {/* Header */}
          <div className="text-center mb-6 space-y-2">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold">
              {mode === 'signin'
                ? AUTH_COPY.signInTitle
                : mode === 'signup'
                  ? AUTH_COPY.signUpTitle
                  : AUTH_COPY.resetTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === 'signin'
                ? AUTH_COPY.signInSubtitle
                : mode === 'signup'
                  ? AUTH_COPY.signUpSubtitle
                  : AUTH_COPY.resetSubtitle}
            </p>
          </div>

          {/* Features */}
          {mode === 'signup' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
              {[
                { icon: Shield, label: 'Save Progress' },
                { icon: Sparkles, label: 'AI Insights' },
                { icon: TrendingUp, label: 'Track Plans' },
              ].map((feature, i) => (
                <div key={i} className="text-center p-2 rounded-lg bg-muted/50">
                  <feature.icon className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <span className="text-[10px] text-muted-foreground">{feature.label}</span>
                </div>
              ))}
            </div>
          )}

          <AuthForm
            mode={mode}
            onModeChange={setMode}
            density="comfortable"
            onSignedIn={(payload) =>
              onComplete({
                email: payload.email,
                firstName: payload.firstName || 'Investor',
                lastName: payload.lastName,
                userId: payload.userId,
              })
            }
            onSignedUp={(payload) =>
              onComplete({
                email: payload.email,
                firstName: payload.firstName || 'Investor',
                lastName: payload.lastName,
                userId: payload.userId,
              })
            }
          />
        </div>
      </motion.div>
    </div>
  );
}
