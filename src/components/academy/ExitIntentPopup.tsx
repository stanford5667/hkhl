import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, X } from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'exit_intent_shown';

interface ExitIntentPopupProps {
  isLoggedIn?: boolean;
}

export function ExitIntentPopup({ isLoggedIn = false }: ExitIntentPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    // Only trigger when mouse leaves through the top of the viewport
    if (e.clientY <= 0 && !isLoggedIn) {
      const hasShown = sessionStorage.getItem(STORAGE_KEY);
      if (!hasShown) {
        setIsOpen(true);
        sessionStorage.setItem(STORAGE_KEY, 'true');
      }
    }
  }, [isLoggedIn]);

  useEffect(() => {
    // Don't show for logged in users
    if (isLoggedIn) return;

    // Add delay before enabling exit intent (15 seconds on page)
    const timeout = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 15000);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseLeave, isLoggedIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      // Store in localStorage for now - can be synced to backend later
      const leads = JSON.parse(localStorage.getItem('captured_leads') || '[]');
      leads.push({ email: email.trim(), timestamp: new Date().toISOString() });
      localStorage.setItem('captured_leads', JSON.stringify(leads));

      toast.success('Thanks! Check your inbox for free resources.');
      setIsOpen(false);
      localStorage.setItem(STORAGE_KEY, 'true'); // Persist across sessions
    } catch (err) {
      console.error('Lead capture error:', err);
      toast.success('Thanks for your interest!');
      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex flex-col items-center text-center pt-2">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-4">
            <Gift className="w-8 h-8 text-primary-foreground" />
          </div>
          
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">
              Wait! Don't miss out
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              Get our free <span className="text-foreground font-medium">Portfolio Analysis Checklist</span> — the same framework used by professional investors.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="w-full mt-6 space-y-3">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full"
            />
            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Get Free Checklist'}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-4">
            No spam. Unsubscribe anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
