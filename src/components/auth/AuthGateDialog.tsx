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
import { Loader2, Sparkles, TrendingUp, Shield, Check } from "lucide-react";
import { AssetLabsLogo } from "@/components/brand/AssetLabsLogo";
import { EmailVerificationPending } from "./EmailVerificationPending";

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
  const [ageConfirmed, setAgeConfirmed] = useState(false);
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

    // Validate age confirmation for signup
    if (mode === 'signup' && !ageConfirmed) {
      setAgeError('You must be 18 or older to use this platform');
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
    { icon: TrendingUp, text: "Portfolio tracking" },
    { icon: Sparkles, text: "AI-powered insights" },
    { icon: Shield, text: "Secure & private" },
  ];

  const authForm = (
    <div className="space-y-4 px-1">
      {/* Asset Labs Branding */}
      <div className="flex items-center justify-center py-2">
        <AssetLabsLogo size="lg" />
      </div>

      {/* Features list - horizontal */}
      <div className="flex justify-center gap-4 py-2 border-y border-border/50">
        {features.map((feature, i) => (
          <div key={i} className="flex flex-col items-center gap-1 text-center">
            <feature.icon className="h-4 w-4 text-primary" />
            <span className="text-[10px] text-muted-foreground">{feature.text}</span>
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
          <div className="space-y-1.5">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
              <button
                type="button"
                onClick={() => {
                  setAgeConfirmed(!ageConfirmed);
                  setAgeError('');
                }}
                className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                  ageConfirmed 
                    ? "bg-primary border-primary text-primary-foreground" 
                    : "border-muted-foreground/50 bg-transparent"
                }`}
              >
                {ageConfirmed && <Check className="h-3 w-3" />}
              </button>
              <div className="flex-1">
                <label 
                  className="text-sm text-foreground cursor-pointer"
                  onClick={() => {
                    setAgeConfirmed(!ageConfirmed);
                    setAgeError('');
                  }}
                >
                  I confirm that I am 18 years of age or older
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You must be at least 18 years old to use this platform.
                </p>
              </div>
            </div>
            {ageError && (
              <p className="text-sm text-destructive">{ageError}</p>
            )}
          </div>
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
