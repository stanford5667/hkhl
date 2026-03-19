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
      <div className="max-w-lg w-full space-y-8 text-center">
        <div className="space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Management Fees</h1>
          <p className="text-muted-foreground">Asset Labs — One-time payment</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 space-y-6">
          <div className="text-5xl font-bold text-foreground">$10,000</div>
          <p className="text-sm text-muted-foreground">One-time management fee payment via Stripe</p>

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

          <p className="text-xs text-muted-foreground">
            Secure payment processed by Stripe. You'll receive a receipt via email.
          </p>
        </div>
      </div>
    </div>
  );
}
