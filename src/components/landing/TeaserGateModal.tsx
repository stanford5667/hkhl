import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AssetLabsLogo } from '@/components/brand/AssetLabsLogo';
import { useNavigate } from 'react-router-dom';
import { Chrome, Apple } from 'lucide-react';

interface TeaserGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeaserGateModal({ open, onOpenChange }: TeaserGateModalProps) {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleSignUp = () => {
    navigate('/auth', { state: { mode: 'signup', email } });
    onOpenChange(false);
  };

  const handleLogin = () => {
    navigate('/auth', { state: { mode: 'signin' } });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-cyan-500/20 bg-slate-950 shadow-[0_0_60px_rgba(6,182,212,0.08)] p-0 overflow-hidden">
        {/* Glow border effect */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-cyan-500/10 via-transparent to-purple-500/10 pointer-events-none" />

        <div className="relative z-10 px-6 py-8 sm:px-8 sm:py-10 space-y-6">
          {/* Logo & Headline */}
          <div className="flex flex-col items-center text-center space-y-3">
            <AssetLabsLogo size="md" showText={false} />
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Unlock Asset Labs
            </h2>
            <p className="text-sm text-gray-400 max-w-xs">
              Create your free account in seconds to access this feature.
            </p>
          </div>

          {/* Social buttons */}
          <div className="space-y-2.5">
            <Button
              variant="outline"
              onClick={handleSignUp}
              className="w-full h-11 border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] gap-3 font-medium"
            >
              <Chrome className="h-5 w-5" />
              Continue with Google
            </Button>
            <Button
              variant="outline"
              onClick={handleSignUp}
              className="w-full h-11 border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] gap-3 font-medium"
            >
              <Apple className="h-5 w-5" />
              Continue with Apple
            </Button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email signup */}
          <div className="space-y-3">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 border-white/10 bg-white/[0.04] text-white placeholder:text-gray-500"
            />
            <Button
              onClick={handleSignUp}
              className="w-full h-11 rounded-full bg-cyan-400 font-semibold text-black hover:bg-cyan-300 shadow-[0_0_24px_rgba(6,182,212,0.25)]"
            >
              Sign Up Free
            </Button>
          </div>

          {/* Login link */}
          <p className="text-center text-xs text-gray-500">
            Already have an account?{' '}
            <button onClick={handleLogin} className="text-cyan-400 font-medium hover:underline">
              Log in
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
