import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Sparkles, Lock, TrendingUp, Shield } from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Account created! Welcome aboard.");
          onOpenChange(false);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Welcome back!");
          onOpenChange(false);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: TrendingUp, text: "Track portfolio" },
    { icon: Sparkles, text: "AI insights" },
    { icon: Shield, text: "Secure storage" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center mb-1 sm:mb-2">
            <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-base sm:text-lg">{title}</DialogTitle>
          <DialogDescription className="text-center text-xs sm:text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Features list - horizontal on mobile */}
          <div className="flex justify-center gap-3 sm:gap-4 py-1 sm:py-2">
            {features.map((feature, i) => (
              <div key={i} className="flex flex-col items-center gap-1 text-center">
                <feature.icon className="h-4 w-4 text-primary" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">{feature.text}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="fullName" className="text-xs sm:text-sm">Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
            )}
            
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-9 sm:h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="password" className="text-xs sm:text-sm">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="h-9 sm:h-10 text-sm"
              />
            </div>

            <Button type="submit" className="w-full h-9 sm:h-10 text-sm" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === 'signup' ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="text-center text-xs sm:text-sm text-muted-foreground">
            {mode === 'signup' ? (
              <>
                Have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                No account?{" "}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-primary hover:underline"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
