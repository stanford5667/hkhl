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
import { Loader2 } from "lucide-react";
import { AssetLabsLogo } from "@/components/brand/AssetLabsLogo";
import { EmailVerificationPending } from "./EmailVerificationPending";
import { AgeVerificationInput } from "./AgeVerificationInput";

interface AuthGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

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
  const { signIn, signUp, resetPassword } = useAuth();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSending, setResetSending] = useState(false);
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) { toast.error('Please enter your email'); return; }
    setResetSending(true);
    const { error } = await resetPassword(resetEmail);
    setResetSending(false);
    if (error) { toast.error(error.message); } else {
      toast.success('Password reset email sent! Check your inbox.');
      setShowForgotPassword(false);
    }
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

  const forgotPasswordForm = (
    <div className="space-y-3 px-1">
      <div className="flex flex-col items-center justify-center">
        <AssetLabsLogo size="sm" showText={false} className="sm:hidden" />
        <AssetLabsLogo size="lg" showText={false} className="hidden sm:flex" />
      </div>
      <p className="text-center text-sm font-medium">Reset your password</p>
      <p className="text-center text-xs text-muted-foreground">Enter your email and we'll send you a reset link.</p>
      <form onSubmit={handleForgotPassword} className="space-y-2.5">
        <div className="space-y-0.5">
          <Label htmlFor="resetEmail" className="text-[11px] sm:text-xs font-medium">Email</Label>
          <Input id="resetEmail" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="you@example.com" required className="h-9 sm:h-10 text-sm" autoComplete="email" />
        </div>
        <Button type="submit" className="w-full h-9 sm:h-10 text-sm font-semibold" disabled={resetSending}>
          {resetSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
        </Button>
      </form>
      <div className="text-center text-[11px] sm:text-xs text-muted-foreground">
        <button type="button" onClick={() => setShowForgotPassword(false)} className="text-primary font-medium hover:underline">Back to sign in</button>
      </div>
    </div>
  );

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
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[11px] sm:text-xs font-medium">Password</Label>
                <button type="button" onClick={() => { setResetEmail(email); setShowForgotPassword(true); }} className="text-[10px] sm:text-[11px] text-primary hover:text-primary/80 transition-colors">Forgot password?</button>
              </div>
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

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {showVerificationPending ? (
            <div className="p-6">{verificationContent}</div>
          ) : (
            <div className="p-6">
              <DialogHeader className="text-center pb-2">
                <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
                <DialogDescription className="text-sm">{description}</DialogDescription>
              </DialogHeader>
              {authForm}
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

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
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
