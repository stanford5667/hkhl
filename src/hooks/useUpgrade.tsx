import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useUpgrade() {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string>("default");
  const [isLoading, setIsLoading] = useState(false);

  const startCheckout = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please sign in to upgrade", {
          action: {
            label: "Sign In",
            onClick: () => window.location.href = "/auth",
          },
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout');
      
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
    upgradeFeature,
  };
}
