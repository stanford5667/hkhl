import { Crown, Lock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MobileAuthSheet } from "@/components/auth/MobileAuthSheet";

interface PremiumBadgeProps {
  className?: string;
  variant?: 'badge' | 'inline' | 'overlay';
  onUpgrade?: () => void;
}

async function handleStripeCheckout(
  setLoading: (v: boolean) => void,
  setShowAuth: (v: boolean) => void
) {
  setLoading(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setShowAuth(true);
      return;
    }

    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { plan: 'research_education' },
    });
    
    if (error) {
      toast.error('Failed to start checkout');
      console.error('Checkout error:', error);
      return;
    }
    
    if (data?.url) {
      window.open(data.url, '_blank');
    }
  } catch (err) {
    toast.error('Something went wrong');
    console.error('Checkout error:', err);
  } finally {
    setLoading(false);
  }
}

export function PremiumBadge({ className, variant = 'badge', onUpgrade }: PremiumBadgeProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      handleStripeCheckout(setIsLoading, setShowAuthSheet);
    }
  };

  const authSheet = (
    <MobileAuthSheet 
      open={showAuthSheet} 
      onOpenChange={setShowAuthSheet}
      title="Sign up to access Pro"
      description="Create a free account, then upgrade to unlock premium features."
    />
  );

  if (variant === 'overlay') {
    return (
      <>
        <div className={cn(
          "absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10 rounded-lg",
          className
        )}>
          <div className="flex items-center gap-2 text-primary">
            <Crown className="h-5 w-5" />
            <span className="font-semibold">Premium Data</span>
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-[200px]">
            Upgrade to access real-time market data
          </p>
          <Button size="sm" onClick={handleUpgrade} disabled={isLoading} className="gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Crown className="h-4 w-4" />
            )}
            {isLoading ? 'Loading...' : 'Upgrade Now'}
          </Button>
        </div>
        {authSheet}
      </>
    );
  }

  if (variant === 'inline') {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleUpgrade}
              disabled={isLoading}
              className={cn(
                "inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 transition-colors cursor-pointer",
                className
              )}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Lock className="h-3 w-3" />
              )}
              Premium
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to upgrade</p>
          </TooltipContent>
        </Tooltip>
        {authSheet}
      </>
    );
  }

  return (
    <>
      <Badge 
        variant="outline" 
        onClick={handleUpgrade}
        className={cn(
          "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-500 gap-1 cursor-pointer hover:bg-amber-500/20 transition-colors",
          className
        )}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Crown className="h-3 w-3" />
        )}
        {isLoading ? 'Loading...' : 'Premium'}
      </Badge>
      {authSheet}
    </>
  );
}

interface PremiumDataPlaceholderProps {
  label?: string;
  onUpgrade?: () => void;
  className?: string;
}

export function PremiumDataPlaceholder({ 
  label = "Premium Data", 
  onUpgrade,
  className 
}: PremiumDataPlaceholderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      handleStripeCheckout(setIsLoading, setShowAuthSheet);
    }
  };

  return (
    <>
      <div className={cn(
        "flex items-center gap-2 text-muted-foreground",
        className
      )}>
        <span className="text-sm blur-sm select-none">$XX.XX</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={handleUpgrade}
              disabled={isLoading}
              className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Lock className="h-3 w-3" />
              )}
              <span>{isLoading ? 'Loading...' : 'Upgrade'}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Upgrade to view {label}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <MobileAuthSheet 
        open={showAuthSheet} 
        onOpenChange={setShowAuthSheet}
        title="Sign up to access Pro"
        description="Create a free account, then upgrade to unlock premium features."
      />
    </>
  );
}
