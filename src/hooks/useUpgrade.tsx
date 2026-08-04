import { useState, useCallback, useRef } from "react";
import {
  launchCheckout,
  saveCheckoutIntent,
  type BillingInterval,
  type CheckoutOptions,
} from "@/lib/checkout";

export function useUpgrade() {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string>("default");
  const [isLoading, setIsLoading] = useState(false);
  const pendingCheckout = useRef<CheckoutOptions | null>(null);

  const startCheckout = useCallback(
    async (
      plan: string = "research_education",
      billingInterval?: string,
      returnPath?: string,
    ) => {
      setIsLoading(true);
      try {
        const options: CheckoutOptions = {
          plan: plan as CheckoutOptions["plan"],
          ...(billingInterval && { billingInterval: billingInterval as BillingInterval }),
          ...(returnPath && { returnPath }),
        };

        await launchCheckout(options, {
          onNeedsAuth: (intent) => {
            // Remember what they were buying so we can resume right after signup
            pendingCheckout.current = intent;
            saveCheckoutIntent(intent);
            setShowAuthSheet(true);
          },
        });
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  /** Call after a successful sign-in/sign-up to continue the interrupted checkout */
  const resumeCheckout = useCallback(async () => {
    const pending = pendingCheckout.current ?? { plan: "research_education" as const };
    pendingCheckout.current = null;
    setShowAuthSheet(false);
    await launchCheckout(pending);
  }, []);

  const promptUpgrade = useCallback((feature?: string) => {
    setUpgradeFeature(feature || "default");
    setShowUpgradeDialog(true);
  }, []);

  return {
    promptUpgrade,
    startCheckout,
    resumeCheckout,
    isLoading,
    showUpgradeDialog,
    setShowUpgradeDialog,
    showAuthSheet,
    setShowAuthSheet,
    upgradeFeature,
  };
}
