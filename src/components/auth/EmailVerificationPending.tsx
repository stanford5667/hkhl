import { useEffect, useState, useCallback } from "react";
import { Mail, CheckCircle, ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AssetLabsLogo } from "@/components/brand/AssetLabsLogo";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailVerificationPendingProps {
  email: string;
  onBack?: () => void;
  onVerified?: () => void;
  className?: string;
}

export function EmailVerificationPending({ 
  email, 
  onBack,
  onVerified,
  className 
}: EmailVerificationPendingProps) {
  const [isPolling, setIsPolling] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  // Check if user is now verified
  const checkVerification = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Error checking session:", error);
        return false;
      }

      if (session?.user) {
        // User is now authenticated (email confirmed)
        onVerified?.();
        return true;
      }
      
      return false;
    } catch (err) {
      console.error("Verification check error:", err);
      return false;
    }
  }, [onVerified]);

  // Polling loop to check for email verification
  useEffect(() => {
    if (!isPolling) return;

    const pollInterval = setInterval(async () => {
      const verified = await checkVerification();
      if (verified) {
        setIsPolling(false);
        clearInterval(pollInterval);
      }
    }, 3000); // Check every 3 seconds

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsPolling(false);
        clearInterval(pollInterval);
        onVerified?.();
      }
    });

    return () => {
      clearInterval(pollInterval);
      subscription.unsubscribe();
    };
  }, [isPolling, checkVerification, onVerified]);

  // Resend verification email via Supabase
  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast({
          title: "Failed to resend email",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email sent!",
          description: "Please check your inbox for the verification link.",
        });
      }
    } catch (err) {
      console.error('Resend error:', err);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={cn("flex flex-col items-center text-center space-y-4 py-6", className)}>
      <AssetLabsLogo size="md" />
      
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
        <Mail className="h-7 w-7 text-primary" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Check your email</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          We've sent a verification link to{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span>Click the link in the email to verify your account</span>
      </div>

      {isPolling && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Waiting for confirmation...</span>
        </div>
      )}

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Button 
          variant="outline" 
          onClick={handleResendEmail}
          disabled={isResending}
          className="w-full"
        >
          {isResending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Resend verification email
            </>
          )}
        </Button>

        {onBack && (
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to sign in
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Didn't receive an email? Check your spam folder or resend.
      </p>
    </div>
  );
}
