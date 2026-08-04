/**
 * Canonical auth + CTA copy.
 * Every sign in / sign up surface must use these strings so the language
 * stays identical across the app (page, dialog, drawer, questionnaire).
 */
export const AUTH_COPY = {
  // Headings
  signInTitle: "Welcome back",
  signInSubtitle: "Sign in to access your research and portfolios",
  signUpTitle: "Create your free account",
  signUpSubtitle: "Save your research, screens and portfolios in seconds",
  resetTitle: "Reset your password",
  resetSubtitle: "Enter your email and we'll send you a reset link",

  // Primary actions
  signIn: "Sign in",
  signInLoading: "Signing in…",
  signUp: "Create free account",
  signUpLoading: "Creating account…",
  continue: "Continue",
  back: "Back",
  sendReset: "Send reset link",
  sendResetLoading: "Sending…",

  // Secondary actions
  forgotPassword: "Forgot password?",
  backToSignIn: "Back to sign in",
  toSignIn: "Already have an account? Sign in",
  toSignUp: "Don't have an account? Sign up",

  // Field labels
  fullName: "Full name",
  email: "Email",
  password: "Password",
  confirmPassword: "Confirm password",

  // Placeholders
  fullNamePlaceholder: "John Smith",
  emailPlaceholder: "name@company.com",
  passwordPlaceholder: "••••••••",

  // Toasts
  signedIn: "Welcome back!",
  signedUp: "Account created — welcome to Asset Labs AI",
  resetSent: "Password reset email sent. Check your inbox.",
} as const;

/** Canonical marketing CTA labels used outside the auth forms. */
export const CTA_COPY = {
  createAccount: "Create free account",
  signUpFree: "Sign up free",
  signIn: "Sign in",
  getStarted: "Get started free",
  upgrade: "Upgrade to Pro",
} as const;
