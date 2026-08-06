import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { TrendingUp, Shield, Zap, Sparkles, BarChart3, Brain } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AssetLabsLogo } from "@/components/brand/AssetLabsLogo";
import { AuthForm, type AuthMode } from "@/components/auth/AuthForm";
import { AUTH_COPY } from "@/lib/authCopy";
import {
  launchCheckout,
  readCheckoutIntent,
  clearCheckoutIntent,
  type CheckoutOptions,
} from "@/lib/checkout";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Get the redirect path, auth mode, and optional checkout intent from state
  const locationState = location.state as { from?: string; mode?: AuthMode; checkoutPlan?: string; checkoutReturnPath?: string } | null;
  const storedRedirect = typeof window !== "undefined" ? sessionStorage.getItem("post_auth_redirect") : null;
  const from = locationState?.from || storedRedirect || "/research";
  const checkoutPlan = locationState?.checkoutPlan;
  const checkoutReturnPath = locationState?.checkoutReturnPath;

  const [mode, setMode] = useState<AuthMode>(locationState?.mode || "signup");

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
