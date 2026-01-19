import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Sparkles, TrendingUp, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmailVerificationPending } from "./EmailVerificationPending";
import { AssetLabsLogo } from "@/components/brand/AssetLabsLogo";
import { AgeVerificationInput, AgeRatingBadge } from "./AgeVerificationInput";

interface MobileAuthSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  showPremiumBranding?: boolean;
  onSuccess?: () => void;
}

export function MobileAuthSheet({ 
  open, 
  onOpenChange,
  title = "Sign up to continue",
  description = "Create a free account to unlock this feature.",
  showPremiumBranding = true,
  onSuccess
}: MobileAuthSheetProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [ageError, setAgeError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVerificationPending, setShowVerificationPending] = useState(false);
  const { signIn, signUp } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const fullNameInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open || showVerificationPending) return;

    const t = window.setTimeout(() => {
      const el = mode === "signup" ? (fullNameInputRef.current ?? emailInputRef.current) : emailInputRef.current;
      el?.focus();
    }, 50);

    return () => window.clearTimeout(t);
  }, [open, mode, showVerificationPending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAgeError('');

    // Validate age verification for signup
    if (mode === 'signup' && !isAgeVerified) {
      setAgeError('Please verify your age to continue');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast.error(error.message);
        } else {
          // With auto-confirm enabled, sign in should succeed immediately
          toast.success("Account created!");
          onOpenChange(false);
          onSuccess?.();
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            toast.error("Please verify your email before signing in.");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Welcome back!");
          onOpenChange(false);
          onSuccess?.();
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackFromVerification = () => {
    setShowVerificationPending(false);
    setMode('signin');
  };

  const features = [
    { icon: TrendingUp, text: "No-Code Backtesting", highlight: true },
    { icon: Sparkles, text: "AI Strategy Builder", highlight: true },
    { icon: Shield, text: "Statistical Edge Detection", highlight: true },
  ];

  const authForm = (
    <div className="space-y-1.5 px-1">
      {/* Asset Labs Branding - minimal */}
      <div className="flex items-center justify-center">
        <AssetLabsLogo size="sm" />
      </div>

      {/* Value Proposition - hidden on very small screens */}
      {mode === 'signup' && (
        <p className="hidden xs:block text-center text-[10px] text-muted-foreground">
          Turn hunches into <span className="text-primary font-medium">statistical proof</span>
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-1.5">
        {mode === 'signup' && (
          <div className="space-y-0.5">
            <Label htmlFor="fullName" className="text-[11px] font-medium">Full Name</Label>
            <Input
              ref={fullNameInputRef}
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
              className="h-9 text-sm"
              autoComplete="name"
            />
          </div>
        )}
        
        <div className="space-y-0.5">
          <Label htmlFor="email" className="text-[11px] font-medium">Email</Label>
          <Input
            ref={emailInputRef}
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="h-9 text-sm"
            autoComplete="email"
          />
        </div>

        <div className="space-y-0.5">
          <Label htmlFor="password" className="text-[11px] font-medium">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="h-9 text-sm"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        </div>

        {mode === 'signup' && (
          <AgeVerificationInput
            onVerificationChange={setIsAgeVerified}
            error={ageError}
            className="!space-y-1"
          />
        )}

        <Button 
          type="submit" 
          className="w-full h-9 text-sm font-semibold mt-1" 
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === 'signup' ? (
            "Create Account"
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <div className="text-center text-[11px] text-muted-foreground">
        {mode === 'signup' ? (
          <>
            Have an account?{" "}
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            Need an account?{" "}
            <button
              type="button"
              onClick={() => setMode('signup')}
              className="text-primary font-medium hover:underline"
            >
              Sign up
            </button>
          </>
        )}
      </div>
    </div>
  );

  const verificationContent = (
    <EmailVerificationPending email={email} onBack={handleBackFromVerification} />
  );

  // Use Dialog for desktop, Drawer for mobile
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          {showVerificationPending ? (
            verificationContent
          ) : (
            <>
              <DialogHeader className="text-center pb-2">
                <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
                <DialogDescription className="text-sm">
                  {description}
                </DialogDescription>
              </DialogHeader>
              {authForm}
            </>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} handleOnly modal>
      <DrawerContent className="max-h-[95dvh]">
        {showVerificationPending ? (
          <div className="px-3 pb-4 safe-area-bottom">
            {verificationContent}
          </div>
        ) : (
          <>
            <DrawerHeader className="text-center py-1.5">
              <DrawerTitle className="text-base font-bold">{title}</DrawerTitle>
              <DrawerDescription className="text-[11px]">
                {description}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-3 pb-4 safe-area-bottom">
              {authForm}
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
