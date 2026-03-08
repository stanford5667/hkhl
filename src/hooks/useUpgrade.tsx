import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useUpgrade() {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string>("default");
  const [isLoading, setIsLoading] = useState(false);

  const startCheckout = useCallback(async (plan: string = 'pro') => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setShowAuthSheet(true);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan },
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
