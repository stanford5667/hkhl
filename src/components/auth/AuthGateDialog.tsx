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
import { Loader2, Check, X } from "lucide-react";
import { AssetLabsLogo } from "@/components/brand/AssetLabsLogo";
import { EmailVerificationPending } from "./EmailVerificationPending";
import { AgeVerificationInput, AgeRatingBadge } from "./AgeVerificationInput";
import { cn } from "@/lib/utils";

interface AuthGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

const COMPARISON_FEATURES = [
  { name: "Stock Overview & Charts", free: true, pro: true },
  { name: "Trending Tickers", free: true, pro: true },
  { name: "Earnings Calendar", free: true, pro: true },
  { name: "AI Stock Analysis", free: false, pro: true },
  { name: "AI Trading Bot", free: false, pro: true },
  { name: "AI Stock Backtesting", free: false, pro: true },
  { name: "Strategy Builder (20+ indicators)", free: false, pro: true },
  { name: "Trade Ideas & Signals", free: false, pro: true },
  { name: "Full Video Course Library", free: false, pro: true },
  { name: "Market Screener", free: false, pro: true },
];

export function AuthGateDialog({ 
  open, 
  onOpenChange,
  title = "Sign in to continue",
  description = "Create a free account to get started."
}: AuthGateDialogProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [signUpStep, setSignUpStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [ageError, setAgeError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [showVerificationPending, setShowVerificationPending] = useState(false);

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

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      if (!isAgeVerified) {
        setAgeError('Please verify your age to continue');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast.error(error.message);
        } else {
          setShowVerificationPending(true);
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

  const handleContinueStep1 = () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.error('Please enter your full name (at least 2 characters)');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    setSignUpStep(2);
  };

  /* ─── Feature comparison panel ─── */
  const comparisonPanel = (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-foreground text-center">What you get</h3>
      <div className="rounded-lg border border-border/60 overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_56px_56px] items-center gap-0 px-3 py-2 bg-muted/40 border-b border-border/40">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Feature</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Free</span>
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider text-center">Pro</span>
        </div>
        {/* Feature rows */}
        {COMPARISON_FEATURES.map((f, i) => (
          <div
            key={f.name}
            className={cn(
              "grid grid-cols-[1fr_56px_56px] items-center gap-0 px-3 py-1.5",
              i % 2 === 0 ? "bg-background" : "bg-muted/20",
              i < COMPARISON_FEATURES.length - 1 && "border-b border-border/20"
            )}
          >
            <span className="text-[11px] text-foreground/80 leading-tight">{f.name}</span>
            <div className="flex justify-center">
              {f.free ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <X className="h-3.5 w-3.5 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex justify-center">
              <Check className="h-3.5 w-3.5 text-primary" />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        Pro starts at <span className="font-semibold text-foreground">$58/mo</span> (billed annually)
      </p>
    </div>
  );

  /* ─── Auth form ─── */
  const authForm = (
    <div className="space-y-1.5 sm:space-y-3 px-1">
      {/* Branding */}
      <div className="flex flex-col items-center justify-center">
        <AssetLabsLogo size="sm" showText={false} className="sm:hidden" />
        <AssetLabsLogo size="lg" showText={false} className="hidden sm:flex" />
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-base sm:text-xl font-bold tracking-tight leading-none">Asset Labs</span>
          <span className="text-base sm:text-xl font-bold tracking-tight leading-none bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">AI</span>
        </div>
      </div>

      {mode === 'signup' && (
        <>
          <div className="flex items-center gap-2 justify-center">
            <div className={`h-1.5 w-12 rounded-full transition-colors ${signUpStep >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-1.5 w-12 rounded-full transition-colors ${signUpStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
          <p className="text-center text-[10px] text-muted-foreground">Step {signUpStep} of 2</p>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-1.5 sm:space-y-2.5">
        {mode === 'signup' ? (
          signUpStep === 1 ? (
            <>
              <div className="space-y-0.5">
                <Label htmlFor="fullName" className="text-[11px] sm:text-xs font-medium">Full Name</Label>
                <Input ref={fullNameInputRef} id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required className="h-9 sm:h-10 text-sm" autoComplete="name" />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="email" className="text-[11px] sm:text-xs font-medium">Email</Label>
                <Input ref={emailInputRef} id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="h-9 sm:h-10 text-sm" autoComplete="email" />
              </div>
              <Button type="button" className="w-full h-9 sm:h-10 text-sm font-semibold mt-1" onClick={handleContinueStep1}>
                Continue
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-0.5">
                <Label htmlFor="password" className="text-[11px] sm:text-xs font-medium">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="h-9 sm:h-10 text-sm" autoComplete="new-password" />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="confirmPassword" className="text-[11px] sm:text-xs font-medium">Confirm Password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="h-9 sm:h-10 text-sm" autoComplete="new-password" />
              </div>
              <AgeVerificationInput onVerificationChange={setIsAgeVerified} error={ageError} className="!space-y-1" />
              <div className="flex gap-2 mt-1">
                <Button type="button" variant="outline" className="flex-1 h-9 sm:h-10 text-sm" onClick={() => setSignUpStep(1)}>Back</Button>
                <Button type="submit" className="flex-1 h-9 sm:h-10 text-sm font-semibold" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get Started Free"}
                </Button>
              </div>
            </>
          )
        ) : (
          <>
            <div className="space-y-0.5">
              <Label htmlFor="email" className="text-[11px] sm:text-xs font-medium">Email</Label>
              <Input ref={emailInputRef} id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="h-9 sm:h-10 text-sm" autoComplete="email" />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="password" className="text-[11px] sm:text-xs font-medium">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="h-9 sm:h-10 text-sm" autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full h-9 sm:h-10 text-sm font-semibold mt-1" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </>
        )}
      </form>

      <div className="text-center text-[11px] sm:text-xs text-muted-foreground">
        {mode === 'signup' ? (
          <>Have an account?{" "}<button type="button" onClick={() => { setMode('signin'); setSignUpStep(1); }} className="text-primary font-medium hover:underline">Sign in</button></>
        ) : (
          <>Need an account?{" "}<button type="button" onClick={() => { setMode('signup'); setSignUpStep(1); }} className="text-primary font-medium hover:underline">Sign up</button></>
        )}
      </div>
    </div>
  );

  const verificationContent = (
    <EmailVerificationPending email={email} onBack={handleBackFromVerification} />
  );

  /* ─── Desktop: wide dialog with comparison + form side by side ─── */
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[720px] p-0 overflow-hidden">
          {showVerificationPending ? (
            <div className="p-6">{verificationContent}</div>
          ) : (
            <div className="grid grid-cols-2 min-h-[480px]">
              {/* Left: Feature comparison */}
              <div className="bg-muted/30 border-r border-border/40 p-5 flex flex-col justify-center">
                {comparisonPanel}
              </div>
              {/* Right: Auth form */}
              <div className="p-5 flex flex-col justify-center">
                <DialogHeader className="text-center pb-2">
                  <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
                  <DialogDescription className="text-sm">{description}</DialogDescription>
                </DialogHeader>
                {authForm}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  /* ─── Mobile: drawer with comparison collapsed above form ─── */
  return (
    <Drawer open={open} onOpenChange={onOpenChange} handleOnly modal repositionInputs={false}>
      <DrawerContent className="max-h-[85dvh]">
        {showVerificationPending ? (
          <div className="px-3 pb-4 safe-area-bottom">{verificationContent}</div>
        ) : (
          <>
            <DrawerHeader className="text-center py-1.5">
              <DrawerTitle className="text-base font-bold">{title}</DrawerTitle>
              <DrawerDescription className="text-[11px]">{description}</DrawerDescription>
            </DrawerHeader>
            <div className="px-3 pb-4 safe-area-bottom space-y-3 overflow-y-auto">
              {authForm}
              <div className="pt-1 border-t border-border/30">
                {comparisonPanel}
              </div>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
