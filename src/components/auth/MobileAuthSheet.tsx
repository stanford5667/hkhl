import { useState } from "react";
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
import { Loader2, Sparkles, Lock, TrendingUp, Shield, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmailVerificationPending } from "./EmailVerificationPending";

interface MobileAuthSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  showPremiumBranding?: boolean;
}

export function MobileAuthSheet({ 
  open, 
  onOpenChange,
  title = "Sign up to continue",
  description = "Create a free account to unlock this feature.",
  showPremiumBranding = true
}: MobileAuthSheetProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVerificationPending, setShowVerificationPending] = useState(false);
  const { signIn, signUp } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    { icon: TrendingUp, text: "Track portfolio" },
    { icon: Sparkles, text: "AI insights" },
    { icon: Shield, text: "Secure storage" },
  ];

  const AuthForm = () => (
    <div className="space-y-4 px-1">
      {/* Premium Branding */}
      {showPremiumBranding && (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Crown className="h-6 w-6 text-white" />
          </div>
        </div>
      )}

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

        <Button 
          type="submit" 
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80" 
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

  const VerificationContent = () => (
    <EmailVerificationPending 
      email={email} 
      onBack={handleBackFromVerification}
    />
  );

  // Use Dialog for desktop, Drawer for mobile
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          {showVerificationPending ? (
            <VerificationContent />
          ) : (
            <>
              <DialogHeader className="text-center pb-2">
                <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
                <DialogDescription className="text-sm">
                  {description}
                </DialogDescription>
              </DialogHeader>
              <AuthForm />
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
            <VerificationContent />
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
              <AuthForm />
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
