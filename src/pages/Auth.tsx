import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, TrendingUp, Shield, Zap, Sparkles, BarChart3, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AssetLabsLogo } from "@/components/brand/AssetLabsLogo";
import { AgeVerificationInput, AgeRatingBadge } from "@/components/auth/AgeVerificationInput";
import {
  launchCheckout,
  readCheckoutIntent,
  clearCheckoutIntent,
  type CheckoutOptions,
} from "@/lib/checkout";

const signInSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot-password">("signup");
  const [signUpStep, setSignUpStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [ageError, setAgeError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, signIn, signUp, resetPassword } = useAuth();

  // Get the redirect path and optional checkout intent from state
  const locationState = location.state as { from?: string; checkoutPlan?: string; checkoutReturnPath?: string } | null;
  const storedRedirect = typeof window !== "undefined" ? sessionStorage.getItem("post_auth_redirect") : null;
  const from = locationState?.from || storedRedirect || "/research";
  const checkoutPlan = locationState?.checkoutPlan;
  const checkoutReturnPath = locationState?.checkoutReturnPath;

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      // A purchase started before signing in? Resume it instead of dumping the
      // user back on the page they came from.
      const storedIntent = readCheckoutIntent();
      const intent: CheckoutOptions | null = storedIntent
        ?? (checkoutPlan
          ? {
              plan: checkoutPlan as CheckoutOptions["plan"],
              billingInterval: "annual",
              returnPath: checkoutReturnPath || from,
            }
          : null);

      if (intent) {
        clearCheckoutIntent();
        const result = await launchCheckout(intent);
        if (result === "redirecting" || result === "already_subscribed") return;
      }

      if (cancelled) return;
      sessionStorage.removeItem("post_auth_redirect");
      navigate(from, { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [user, navigate, from, checkoutPlan, checkoutReturnPath]);


  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const handleSignIn = async (data: SignInFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message === "Invalid login credentials" 
          ? "Invalid email or password. Please try again."
          : error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Welcome back!",
      description: "You have been signed in successfully.",
    });
    navigate(from, { replace: true });
  };

  const handleSignUp = async (data: SignUpFormData) => {
    // Validate age verification
    if (!isAgeVerified) {
      setAgeError("Please verify your age to continue");
      return;
    }
    setAgeError("");

    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.fullName);
    setIsLoading(false);

    if (error) {
      let message = error.message;
      if (error.message.includes("already registered")) {
        message = "This email is already registered. Please sign in instead.";
      }
      toast({
        title: "Sign up failed",
        description: message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Welcome to Asset Labs AI!",
      description: "Your account has been created successfully.",
    });
    navigate(from, { replace: true });
  };

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    const { error } = await resetPassword(data.email);
    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setResetEmailSent(true);
    toast({
      title: "Reset email sent",
      description: "Check your email for a password reset link.",
    });
  };

  const features = [
    { icon: BarChart3, title: "Portfolio Analytics", description: "Real-time performance tracking across all your holdings" },
    { icon: Brain, title: "AI-Powered Research", description: "Chat with AI about markets, get instant analysis" },
    { icon: Sparkles, title: "100+ Quant Studies", description: "Deep conditional probability & statistical analysis" },
    { icon: Zap, title: "Smart Screening", description: "Unlimited filters & save your favorite screens" },
    { icon: Shield, title: "Save Everything", description: "Portfolios, studies, and screens saved to your account" },
    { icon: TrendingUp, title: "Expanded Data", description: "Extended timeframes & comprehensive asset coverage" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-card via-card to-primary/5 border-r border-border">
        <div>
          <AssetLabsLogo size="xl" showTagline className="mb-4" />
          <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
            The intelligent platform for portfolio analytics, quantitative research, and data-driven investing.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              100+ Studies
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              AI Analysis
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              Save & Sync
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {features.map((feature, index) => (
            <div key={index} className="flex gap-3 animate-fade-up" style={{ animationDelay: `${index * 80}ms` }}>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="bg-gradient-to-r from-purple-500/10 to-amber-500/10 rounded-lg p-3 border border-purple-500/20">
            <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Coming Soon
            </p>
            <p className="text-xs text-muted-foreground">
              Options flow screening • Agentic news bots • Hundreds of new studies
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Asset Labs AI. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 animate-fade-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <AssetLabsLogo size="lg" showTagline />
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              {mode === "signin"
                ? AUTH_COPY.signInTitle
                : mode === "signup"
                  ? AUTH_COPY.signUpTitle
                  : AUTH_COPY.resetTitle}
            </h1>
            <p className="text-muted-foreground">
              {mode === "signin"
                ? AUTH_COPY.signInSubtitle
                : mode === "signup"
                  ? AUTH_COPY.signUpSubtitle
                  : AUTH_COPY.resetSubtitle}
            </p>
          </div>

          <AuthForm mode={mode} onModeChange={setMode} density="comfortable" />

        </div>
      </div>
    </div>
  );
}
