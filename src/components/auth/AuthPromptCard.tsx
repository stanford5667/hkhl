import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AuthGateDialog } from './AuthGateDialog';
import { Sparkles, TrendingUp, Shield, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthPromptCardProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'compact' | 'inline' | 'banner';
  className?: string;
  showFeatures?: boolean;
}

const features = [
  { icon: TrendingUp, text: "AI Portfolio Analysis" },
  { icon: Sparkles, text: "Smart Insights" },
  { icon: Shield, text: "Secure & Private" },
];

/**
 * A reusable auth prompt card that can be placed throughout the app
 * to encourage users to sign up.
 */
export function AuthPromptCard({ 
  title = "Unlock Full Access",
  description = "Create a free account to save your progress and access all features.",
  variant = 'default',
  className,
  showFeatures = true,
}: AuthPromptCardProps) {
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  if (variant === 'inline') {
    return (
      <>
        <button
          onClick={() => setShowAuthDialog(true)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium",
            className
          )}
        >
          <Sparkles className="h-4 w-4" />
          Sign up free
          <ArrowRight className="h-3 w-3" />
        </button>
        <AuthGateDialog
          open={showAuthDialog}
          onOpenChange={setShowAuthDialog}
          title={title}
          description={description}
        />
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20",
          className
        )}>
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Get started for free</p>
            <p className="text-xs text-muted-foreground truncate">Save progress & unlock features</p>
          </div>
          <Button size="sm" onClick={() => setShowAuthDialog(true)}>
            Sign Up
          </Button>
        </div>
        <AuthGateDialog
          open={showAuthDialog}
          onOpenChange={setShowAuthDialog}
          title={title}
          description={description}
        />
      </>
    );
  }

  if (variant === 'banner') {
    return (
      <>
        <div className={cn(
          "relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/20 p-4",
          className
        )}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20 border border-primary/30">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            <Button onClick={() => setShowAuthDialog(true)} className="shrink-0">
              Create Free Account
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
        <AuthGateDialog
          open={showAuthDialog}
          onOpenChange={setShowAuthDialog}
          title={title}
          description={description}
        />
      </>
    );
  }

  // Default variant - full card
  return (
    <>
      <Card className={cn("bg-gradient-to-br from-card to-card/80 border-primary/20", className)}>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>

            {showFeatures && (
              <div className="flex justify-center gap-6 py-3 border-y border-border/50">
                {features.map((feature, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <feature.icon className="h-5 w-5 text-primary" />
                    <span className="text-xs text-muted-foreground">{feature.text}</span>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={() => setShowAuthDialog(true)} className="w-full" size="lg">
              Create Free Account
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            <p className="text-xs text-muted-foreground">
              No credit card required • Free forever
            </p>
          </div>
        </CardContent>
      </Card>
      <AuthGateDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        title={title}
        description={description}
      />
    </>
  );
}
