import { useState, useCallback } from "react";
import { toast } from "sonner";

export function useUpgrade() {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const promptUpgrade = useCallback((feature?: string) => {
    // For now, show a toast - later this can open a proper upgrade modal
    toast.info(
      feature 
        ? `Upgrade to Premium to access ${feature}`
        : "Upgrade to Premium for full access",
      {
        action: {
          label: "Learn More",
          onClick: () => setShowUpgradeDialog(true),
        },
      }
    );
  }, []);

  return {
    promptUpgrade,
    showUpgradeDialog,
    setShowUpgradeDialog,
  };
}
