import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MailX, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type Status = 'loading' | 'valid' | 'already_unsubscribed' | 'invalid' | 'success' | 'error';

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: anonKey } }
        );
        const data = await res.json();
        if (res.ok && data.valid) {
          setStatus('valid');
        } else if (data.reason === 'already_unsubscribed') {
          setStatus('already_unsubscribed');
        } else {
          setStatus('invalid');
        }
      } catch {
        setStatus('error');
      }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) {
        setStatus('success');
      } else if (data?.reason === 'already_unsubscribed') {
        setStatus('already_unsubscribed');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Validating your request…</p>
            </>
          )}

          {status === 'valid' && (
            <>
              <MailX className="h-12 w-12 text-primary mx-auto" />
              <h1 className="text-xl font-semibold text-foreground">Unsubscribe from emails?</h1>
              <p className="text-muted-foreground text-sm">
                You will no longer receive notification emails from Asset Labs AI.
              </p>
              <Button onClick={handleUnsubscribe} disabled={processing} className="mt-2">
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Unsubscribe
              </Button>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h1 className="text-xl font-semibold text-foreground">You've been unsubscribed</h1>
              <p className="text-muted-foreground text-sm">
                You won't receive any more notification emails from us.
              </p>
            </>
          )}

          {status === 'already_unsubscribed' && (
            <>
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <h1 className="text-xl font-semibold text-foreground">Already unsubscribed</h1>
              <p className="text-muted-foreground text-sm">
                You've previously unsubscribed from these emails.
              </p>
            </>
          )}

          {status === 'invalid' && (
            <>
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <h1 className="text-xl font-semibold text-foreground">Invalid link</h1>
              <p className="text-muted-foreground text-sm">
                This unsubscribe link is invalid or has expired.
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
              <p className="text-muted-foreground text-sm">
                Please try again later or contact support.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
