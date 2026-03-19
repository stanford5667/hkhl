import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "react-router-dom";

export default function ManagementFee() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");

  if (status === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Payment Successful</h1>
          <p className="text-muted-foreground">
            Your $10,000 management fee payment has been received. Thank you.
          </p>
        </div>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Payment Cancelled</h1>
          <p className="text-muted-foreground">
            Your payment was not completed. You can try again below.
          </p>
          <Button onClick={() => window.location.href = "/management-fee"} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-management-fee-checkout");

      if (error) {
        toast.error("Failed to start checkout");
        console.error(error);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error("Something went wrong");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Annual Management Fee</h1>
          <p className="text-muted-foreground">Research & Consulting Agreement — Annual Payment</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 space-y-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-foreground">$10,000</div>
            <p className="text-sm text-muted-foreground mt-2">Annual management fee — billed yearly</p>
          </div>

          <div className="border-t border-border pt-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Scope of Services</h2>
            <ul className="text-sm text-muted-foreground space-y-2 text-left">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Portfolio modeling, back-testing, and allocation analysis
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Options position analysis and industry correlation research
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Monte Carlo simulation for hedging and factor regression modeling
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Custom investment plan with risk constraints (STDEV, VAR, draw-down)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Rebalancing parameters, position sizing rules, and portfolio mechanics
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Theta-targeted, high-yield bond, commodity, and emerging market portfolios
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Estate and tax planning considerations
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Ongoing position monitoring and research updates
              </li>
            </ul>
          </div>

          <div className="border-t border-border pt-6 space-y-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Fee Structure</h2>
            <div className="text-sm text-muted-foreground space-y-1 text-left">
              <p><span className="text-foreground font-medium">Base Fee:</span> $10,000 annual management fee, prorated and paid quarterly in advance.</p>
              <p><span className="text-foreground font-medium">Performance Fee:</span> 5% on returns exceeding a 20% annual threshold, subject to a high-water mark provision.</p>
            </div>
          </div>

          <div className="border-t border-border pt-6 space-y-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Key Terms</h2>
            <div className="text-xs text-muted-foreground space-y-1 text-left">
              <p>• Research and modeling services only — not brokerage or formal financial advisory.</p>
              <p>• Client retains exclusive responsibility for account execution and trade implementation.</p>
              <p>• Either party may terminate with 30 days' written notice.</p>
              <p>• All processes, arrangements, and information shared are strictly confidential.</p>
            </div>
          </div>

          <Button
            onClick={handleCheckout}
            disabled={isLoading}
            className="w-full h-12 text-base"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Redirecting to checkout…
              </>
            ) : (
              "Proceed to Payment"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Secure payment processed by Stripe. You'll receive a receipt via email.
          </p>
        </div>
      </div>
    </div>
  );
}
