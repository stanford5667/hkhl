import { Crown, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MobileAuthSheet } from "@/components/auth/MobileAuthSheet";
import { getAffiliateRef } from "@/hooks/useAffiliateTracking";

interface PremiumFeatureBlockProps {
  title?: string;
  description?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PremiumFeatureBlock({ 
  title = "Premium Feature", 
  description,
  className,
  size = 'md'
}: PremiumFeatureBlockProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setShowAuthSheet(true);
        return;
      }

      const affiliateCode = getAffiliateRef();
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan: 'research_education', 
          billing_interval: 'annual',
          ...(affiliateCode && { affiliate_code: affiliateCode }),
        },
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
      setIsLoading(false);
    }
  };

  const iconSize = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-12 w-12' : 'h-8 w-8';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm';
  const padding = size === 'sm' ? 'py-3 gap-1.5' : size === 'lg' ? 'py-8 gap-4' : 'py-4 gap-2';

  return (
    <>
      <button
        onClick={handleUpgrade}
        disabled={isLoading}
        className={cn(
          "flex flex-col items-center justify-center w-full text-primary/70 hover:text-primary transition-colors cursor-pointer group",
          padding,
          className
        )}
      >
        {isLoading ? (
          <Loader2 className={cn(iconSize, "animate-spin")} />
        ) : (
          <Crown className={cn(iconSize, "group-hover:scale-110 transition-transform")} />
        )}
        <p className={cn("font-medium", textSize)}>
          {isLoading ? 'Loading...' : title}
        </p>
        {description && !isLoading && (
          <p className={cn("text-muted-foreground text-center", size === 'sm' ? 'text-xs' : 'text-sm')}>
            {description}
          </p>
        )}
        {!isLoading && (
          <span className="text-xs text-primary/50 group-hover:text-primary mt-1">
            Click to upgrade →
          </span>
        )}
      </button>
      
      <MobileAuthSheet 
        open={showAuthSheet} 
        onOpenChange={setShowAuthSheet}
        title="Sign up to access Pro"
        description="Create a free account, then upgrade to unlock premium features."
      />
    </>
  );
}

// Compact inline version for tight spaces
export function PremiumFeatureInline({ className }: { className?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setShowAuthSheet(true);
        return;
      }

      const affiliateCode = getAffiliateRef();
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan: 'research_education', 
          billing_interval: 'annual',
          ...(affiliateCode && { affiliate_code: affiliateCode }),
        },
      });
      
      if (error) {
        toast.error('Failed to start checkout');
        return;
      }
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleUpgrade}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-1.5 text-primary/70 hover:text-primary transition-colors cursor-pointer",
          className
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Crown className="h-4 w-4" />
        )}
        <span className="text-xs font-medium">
          {isLoading ? 'Loading...' : 'Premium'}
        </span>
      </button>
      
      <MobileAuthSheet 
        open={showAuthSheet} 
        onOpenChange={setShowAuthSheet}
        title="Sign up to access Pro"
        description="Create a free account, then upgrade to unlock premium features."
      />
    </>
  );
}
