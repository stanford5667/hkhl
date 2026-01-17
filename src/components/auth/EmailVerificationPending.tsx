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

  // Check if user has verified via our custom Loops verification
  const checkVerification = useCallback(async () => {
    try {
      // Check our custom email_verifications table for verified status
      const { data, error } = await supabase
        .from('email_verifications')
        .select('verified')
        .eq('email', email)
        .eq('verified', true)
        .limit(1);
      
      if (error) {
        console.error("Error checking verification:", error);
        return false;
      }

      if (data && data.length > 0) {
        // User has verified via Loops email
        onVerified?.();
        return true;
      }
      
      return false;
    } catch (err) {
      console.error("Verification check error:", err);
      return false;
    }
  }, [email, onVerified]);

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

    // Set up realtime subscription to email_verifications table
    const channel = supabase
      .channel('email-verification')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'email_verifications',
          filter: `email=eq.${email}`,
        },
        (payload) => {
          if (payload.new && (payload.new as { verified: boolean }).verified) {
            setIsPolling(false);
            clearInterval(pollInterval);
            onVerified?.();
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [isPolling, checkVerification, onVerified]);

  // Resend verification email via Loops
  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      // Get user ID from existing verification record or current session
      const { data: sessionData } = await supabase.auth.getSession();
      let userId = sessionData?.session?.user?.id;
      
      // If no session, look up from existing verification record
      if (!userId) {
        const { data: verificationData } = await supabase
          .from('email_verifications')
          .select('user_id')
          .eq('email', email)
          .order('created_at', { ascending: false })
          .limit(1);
        
        userId = verificationData?.[0]?.user_id;
      }
      
      if (!userId) {
        toast({
          title: "Unable to resend",
          description: "Please try signing up again.",
          variant: "destructive",
        });
        setIsResending(false);
        return;
      }
      
      const response = await supabase.functions.invoke('send-verification-email', {
        body: {
          userId: userId,
          email: email,
          fullName: email.split('@')[0], // Fallback name
        },
      });

      if (response.error) {
        toast({
          title: "Failed to resend email",
          description: response.error.message || "Please try again later.",
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
