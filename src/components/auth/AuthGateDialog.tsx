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
import { AssetLabsLogo } from "@/components/brand/AssetLabsLogo";
import { EmailVerificationPending } from "./EmailVerificationPending";
import { AgeVerificationInput, AgeRatingBadge } from "./AgeVerificationInput";

interface AuthGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

export function AuthGateDialog({ 
  open, 
  onOpenChange,
  title = "Sign up to save",
  description = "Create a free account to save your progress."
}: AuthGateDialogProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const features = [
    { icon: TrendingUp, text: "No-Code Backtesting", highlight: true },
    { icon: Sparkles, text: "AI Strategy Builder", highlight: true },
    { icon: Shield, text: "Statistical Edge Detection", highlight: true },
  ];

  const authForm = (
    <div className="space-y-4 px-1">
      {/* Asset Labs Branding */}
      <div className="flex items-center justify-center py-2">
        <AssetLabsLogo size="lg" />
      </div>


      {/* Value Proposition */}
      {mode === 'signup' && (
        <div className="text-center space-y-1 py-2">
          <p className="text-sm font-semibold text-foreground">
            Turn market hunches into <span className="text-primary">statistical proof</span>
          </p>
          <p className="text-xs text-muted-foreground">No coding required. Just pick, click, and discover.</p>
        </div>
      )}

      {/* Features list - horizontal */}
      <div className="flex justify-center gap-3 py-3 border-y border-border/50 bg-secondary/30 rounded-lg mx-0">
        {features.map((feature, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 text-center px-2">
            <div className="p-1.5 rounded-full bg-primary/10">
              <feature.icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-[11px] font-semibold text-primary">{feature.text}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
            <Input
              ref={fullNameInputRef}
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
              className="h-12 text-base"
              autoComplete="name"
            />
          </div>
        )}
        
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">Email</Label>
          <Input
            ref={emailInputRef}
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="h-12 text-base"
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="h-12 text-base"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        </div>

        {mode === 'signup' && (
          <AgeVerificationInput
            onVerificationChange={setIsAgeVerified}
            error={ageError}
          />
        )}

        <Button 
          type="submit" 
          className="w-full h-12 text-base font-semibold" 
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : mode === 'signup' ? (
            "Create Account"
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground pb-4">
        {mode === 'signup' ? (
          <>
            Already have an account?{" "}
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
            Don't have an account?{" "}
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        {showVerificationPending ? (
          <div className="px-4 pb-8 overflow-y-auto safe-area-bottom">
            {verificationContent}
          </div>
        ) : (
          <>
            <DrawerHeader className="text-center pb-2">
              <DrawerTitle className="text-xl font-bold">{title}</DrawerTitle>
              <DrawerDescription className="text-sm">
                {description}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-8 overflow-y-auto safe-area-bottom">
              {authForm}
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
