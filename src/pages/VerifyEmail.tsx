import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AssetLabsLogo } from "@/components/brand/AssetLabsLogo";

type VerificationStatus = 'verifying' | 'success' | 'error';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const token = searchParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setErrorMessage('Invalid verification link. No token provided.');
        return;
      }

      try {
        const response = await supabase.functions.invoke('verify-email-token', {
          body: { token },
        });

        if (response.error) {
          setStatus('error');
          setErrorMessage(response.error.message || 'Verification failed. Please try again.');
          return;
        }

        if (response.data?.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(response.data?.error || 'Verification failed.');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
        setErrorMessage('Something went wrong. Please try again.');
      }
    };

    verifyEmail();
  }, [token]);

  const handleContinue = () => {
    navigate('/auth?mode=signin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <AssetLabsLogo size="md" />

        {status === 'verifying' && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Verifying your email...</h2>
              <p className="text-muted-foreground">Please wait while we confirm your account.</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Email Verified!</h2>
              <p className="text-muted-foreground">
                Your account has been successfully verified. You can now sign in.
              </p>
            </div>
            <Button onClick={handleContinue} className="w-full max-w-xs mx-auto">
              Continue to Sign In
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Verification Failed</h2>
              <p className="text-muted-foreground">{errorMessage}</p>
            </div>
            <Button variant="outline" onClick={handleContinue} className="w-full max-w-xs mx-auto">
              Back to Sign In
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
