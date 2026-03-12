import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAffiliateRef } from "@/hooks/useAffiliateTracking";

export function useUpgrade() {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string>("default");
  const [isLoading, setIsLoading] = useState(false);

  const startCheckout = useCallback(async (plan: string = 'research_education', billingInterval?: string, returnPath?: string) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setShowAuthSheet(true);
        return;
      }

      // Get affiliate code from stored referral (if user came via affiliate link)
      const affiliateCode = getAffiliateRef();

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan,
          ...(billingInterval && { billing_interval: billingInterval }),
          ...(returnPath && { return_path: returnPath }),
          ...(affiliateCode && { affiliate_code: affiliateCode }),
        },
      });
      
      if (error) {
        toast.error('Failed to start checkout');
        console.error('Checkout error:', error);
        return;
      }
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error('Something went wrong');
      console.error('Checkout error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const promptUpgrade = useCallback((feature?: string) => {
    setUpgradeFeature(feature || "default");
    setShowUpgradeDialog(true);
  }, []);

  return {
    promptUpgrade,
    startCheckout,
    isLoading,
    showUpgradeDialog,
    setShowUpgradeDialog,
    showAuthSheet,
    setShowAuthSheet,
    upgradeFeature,
  };
}
