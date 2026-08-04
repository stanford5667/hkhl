/**
 * Shared auth form used by every sign in / sign up surface:
 * the /auth page, the AuthGateDialog, the MobileAuthSheet and the
 * questionnaire AuthStep. Keeps copy, field order, validation and
 * button hierarchy identical everywhere.
 */

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AgeVerificationInput } from "./AgeVerificationInput";
import { AUTH_COPY } from "@/lib/authCopy";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type AuthMode = "signin" | "signup" | "forgot-password";

export interface AuthSuccessPayload {
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  userId: string;
}

interface AuthFormProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  /** Compact density for dialogs/drawers, comfortable for the full page. */
  density?: "comfortable" | "compact";
  autoFocus?: boolean;
  className?: string;
  /** Called after a successful sign in. */
  onSignedIn?: (payload: AuthSuccessPayload) => void;
  /** Called after a successful sign up (session may already exist). */
  onSignedUp?: (payload: AuthSuccessPayload) => void;
  /** Hide the "already have an account?" switcher (surface renders its own). */
  hideModeSwitch?: boolean;
}

export function AuthForm({
  mode,
  onModeChange,
  density = "comfortable",
  autoFocus = false,
  className,
  onSignedIn,
  onSignedUp,
  hideModeSwitch = false,
}: AuthFormProps) {
  const { signIn, signUp, resetPassword } = useAuth();
  const compact = density === "compact";

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [ageError, setAgeError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [values, setValues] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const fullNameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setStep(1);
    setErrors({});
  }, [mode]);

  useEffect(() => {
    if (!autoFocus) return;
    const t = window.setTimeout(() => {
      const el = mode === "signup" ? (fullNameRef.current ?? emailRef.current) : emailRef.current;
      el?.focus();
    }, 50);
    return () => window.clearTimeout(t);
  }, [autoFocus, mode]);

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const fieldClass = cn(
    "bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/50",
    compact ? "h-9 text-sm" : "h-10"
  );
  const labelClass = cn("text-foreground", compact ? "text-xs font-medium" : "text-sm");
  const groupClass = compact ? "space-y-1" : "space-y-2";
  const formClass = compact ? "space-y-2.5" : "space-y-5";
  const buttonClass = cn("font-semibold", compact ? "h-9 text-sm" : "h-11");

  const emailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const buildPayload = async (): Promise<AuthSuccessPayload> => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    const fullName =
      (user?.user_metadata?.full_name as string | undefined) || values.fullName.trim();
    const [firstName, ...rest] = fullName.split(" ");
    return {
      email: user?.email || values.email.trim(),
      fullName,
      firstName: firstName || "",
      lastName: rest.join(" "),
      userId: user?.id || "",
    };
  };

  const handleContinue = () => {
    const next: Record<string, string> = {};
    if (values.fullName.trim().length < 2) next.fullName = "Please enter your full name";
    if (!emailValid(values.email)) next.email = "Please enter a valid email address";
    setErrors(next);
    if (Object.keys(next).length === 0) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "forgot-password") {
      if (!emailValid(values.email)) {
        setErrors({ email: "Please enter a valid email address" });
        return;
      }
      setIsLoading(true);
      const { error } = await resetPassword(values.email.trim());
      setIsLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setResetSent(true);
      toast.success(AUTH_COPY.resetSent);
      return;
    }

    if (mode === "signin") {
      const next: Record<string, string> = {};
      if (!emailValid(values.email)) next.email = "Please enter a valid email address";
      if (values.password.length < 6) next.password = "Password must be at least 6 characters";
      setErrors(next);
      if (Object.keys(next).length) return;

      setIsLoading(true);
      const { error } = await signIn(values.email.trim(), values.password);
      setIsLoading(false);
      if (error) {
        toast.error(
          error.message === "Invalid login credentials"
            ? "Invalid email or password. Please try again."
            : error.message
        );
        return;
      }
      toast.success(AUTH_COPY.signedIn);
      onSignedIn?.(await buildPayload());
      return;
    }

    // signup — step 2
    const next: Record<string, string> = {};
    if (values.password.length < 6) next.password = "Password must be at least 6 characters";
    if (values.password !== values.confirmPassword) next.confirmPassword = "Passwords don't match";
    setErrors(next);
    if (!isAgeVerified) setAgeError("Please verify your age to continue");
    else setAgeError("");
    if (Object.keys(next).length || !isAgeVerified) return;

    setIsLoading(true);
    const { error } = await signUp(values.email.trim(), values.password, values.fullName.trim());
    setIsLoading(false);
    if (error) {
      toast.error(
        error.message.includes("already registered")
          ? "This email is already registered. Please sign in instead."
          : error.message
      );
      return;
    }
    toast.success(AUTH_COPY.signedUp);
    onSignedUp?.(await buildPayload());
  };

  const spinner = <Loader2 className={cn("animate-spin", compact ? "h-4 w-4" : "h-4 w-4 mr-2")} />;

  if (mode === "forgot-password" && resetSent) {
    return (
      <div className={cn("space-y-4 text-center", className)}>
        <div className="rounded-lg bg-primary/10 p-4 text-sm text-primary">
          We've sent a password reset link to your email address.
        </div>
        <Button
          variant="outline"
          className={cn("w-full", buttonClass)}
          onClick={() => {
            setResetSent(false);
            onModeChange("signin");
          }}
        >
          {AUTH_COPY.backToSignIn}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {mode === "signup" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            <div className={cn("h-1.5 w-14 rounded-full transition-colors", step >= 1 ? "bg-primary" : "bg-muted")} />
            <div className={cn("h-1.5 w-14 rounded-full transition-colors", step >= 2 ? "bg-primary" : "bg-muted")} />
          </div>
          <p className="text-center text-xs text-muted-foreground">Step {step} of 2</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={formClass} noValidate>
        {mode === "signup" && step === 1 && (
          <>
            <div className={groupClass}>
              <Label htmlFor="auth-fullname" className={labelClass}>{AUTH_COPY.fullName}</Label>
              <Input
                ref={fullNameRef}
                id="auth-fullname"
                autoComplete="name"
                placeholder={AUTH_COPY.fullNamePlaceholder}
                className={fieldClass}
                value={values.fullName}
                onChange={set("fullName")}
              />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
            </div>
            <div className={groupClass}>
              <Label htmlFor="auth-email" className={labelClass}>{AUTH_COPY.email}</Label>
              <Input
                ref={emailRef}
                id="auth-email"
                type="email"
                autoComplete="email"
                placeholder={AUTH_COPY.emailPlaceholder}
                className={fieldClass}
                value={values.email}
                onChange={set("email")}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <Button type="button" className={cn("w-full", buttonClass)} onClick={handleContinue}>
              {AUTH_COPY.continue}
            </Button>
          </>
        )}

        {mode === "signup" && step === 2 && (
          <>
            <div className={groupClass}>
              <Label htmlFor="auth-password" className={labelClass}>{AUTH_COPY.password}</Label>
              <Input
                id="auth-password"
                type="password"
                autoComplete="new-password"
                placeholder={AUTH_COPY.passwordPlaceholder}
                className={fieldClass}
                value={values.password}
                onChange={set("password")}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <div className={groupClass}>
              <Label htmlFor="auth-confirm" className={labelClass}>{AUTH_COPY.confirmPassword}</Label>
              <Input
                id="auth-confirm"
                type="password"
                autoComplete="new-password"
                placeholder={AUTH_COPY.passwordPlaceholder}
                className={fieldClass}
                value={values.confirmPassword}
                onChange={set("confirmPassword")}
              />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>
            <AgeVerificationInput
              onVerificationChange={setIsAgeVerified}
              error={ageError}
              className={compact ? "!space-y-1" : undefined}
            />
            <div className="flex gap-3">
              <Button type="button" variant="outline" className={cn("flex-1", buttonClass)} onClick={() => setStep(1)}>
                {AUTH_COPY.back}
              </Button>
              <Button type="submit" className={cn("flex-1", buttonClass)} disabled={isLoading}>
                {isLoading ? <>{spinner}{!compact && AUTH_COPY.signUpLoading}</> : AUTH_COPY.signUp}
              </Button>
            </div>
          </>
        )}

        {mode === "signin" && (
          <>
            <div className={groupClass}>
              <Label htmlFor="auth-email" className={labelClass}>{AUTH_COPY.email}</Label>
              <Input
                ref={emailRef}
                id="auth-email"
                type="email"
                autoComplete="email"
                placeholder={AUTH_COPY.emailPlaceholder}
                className={fieldClass}
                value={values.email}
                onChange={set("email")}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className={groupClass}>
              <div className="flex items-center justify-between">
                <Label htmlFor="auth-password" className={labelClass}>{AUTH_COPY.password}</Label>
                <button
                  type="button"
                  onClick={() => onModeChange("forgot-password")}
                  className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                >
                  {AUTH_COPY.forgotPassword}
                </button>
              </div>
              <Input
                id="auth-password"
                type="password"
                autoComplete="current-password"
                placeholder={AUTH_COPY.passwordPlaceholder}
                className={fieldClass}
                value={values.password}
                onChange={set("password")}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <Button type="submit" className={cn("w-full", buttonClass)} disabled={isLoading}>
              {isLoading ? <>{spinner}{!compact && AUTH_COPY.signInLoading}</> : AUTH_COPY.signIn}
            </Button>
          </>
        )}

        {mode === "forgot-password" && (
          <>
            <div className={groupClass}>
              <Label htmlFor="auth-email" className={labelClass}>{AUTH_COPY.email}</Label>
              <Input
                ref={emailRef}
                id="auth-email"
                type="email"
                autoComplete="email"
                placeholder={AUTH_COPY.emailPlaceholder}
                className={fieldClass}
                value={values.email}
                onChange={set("email")}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <Button type="submit" className={cn("w-full", buttonClass)} disabled={isLoading}>
              {isLoading ? <>{spinner}{!compact && AUTH_COPY.sendResetLoading}</> : AUTH_COPY.sendReset}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => onModeChange("signin")}
                className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                {AUTH_COPY.backToSignIn}
              </button>
            </div>
          </>
        )}
      </form>

      {!hideModeSwitch && mode !== "forgot-password" && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => onModeChange(mode === "signin" ? "signup" : "signin")}
            className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            {mode === "signin" ? AUTH_COPY.toSignUp : AUTH_COPY.toSignIn}
          </button>
        </div>
      )}
    </div>
  );
}
