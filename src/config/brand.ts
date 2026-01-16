/**
 * Brand Configuration
 * 
 * Centralized design tokens for the Asset Labs platform.
 * Import from here to ensure visual consistency across the app.
 */

// ============================================
// COLOR PRESETS
// ============================================

/**
 * Semantic color presets for page icons
 * Used with PageHeader and other icon containers
 */
export const ICON_PRESETS = {
  primary: {
    iconColor: 'text-primary',
    bgGradient: 'bg-gradient-to-br from-primary/20 to-primary/10',
    borderColor: 'border-primary/30',
  },
  violet: {
    iconColor: 'text-violet-400',
    bgGradient: 'bg-gradient-to-br from-violet-500/20 to-purple-500/20',
    borderColor: 'border-violet-500/30',
  },
  emerald: {
    iconColor: 'text-emerald-400',
    bgGradient: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20',
    borderColor: 'border-emerald-500/30',
  },
  amber: {
    iconColor: 'text-amber-400',
    bgGradient: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20',
    borderColor: 'border-amber-500/30',
  },
  rose: {
    iconColor: 'text-rose-400',
    bgGradient: 'bg-gradient-to-br from-rose-500/20 to-pink-500/20',
    borderColor: 'border-rose-500/30',
  },
  blue: {
    iconColor: 'text-blue-400',
    bgGradient: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/30',
  },
} as const;

// ============================================
// PAGE CONFIGURATIONS
// ============================================

/**
 * Standard page configurations for consistent styling
 */
export const PAGE_CONFIG = {
  portfolio: {
    preset: 'emerald' as const,
    icon: 'Wallet',
    title: 'Portfolio',
  },
  marketIntel: {
    preset: 'primary' as const,
    icon: 'Activity',
    title: 'Market Intelligence',
  },
  quantLab: {
    preset: 'violet' as const,
    icon: 'FlaskConical',
    title: 'Quant Lab',
  },
  investmentPlan: {
    preset: 'violet' as const,
    icon: 'Brain',
    title: 'Strategy Explorer',
  },
  research: {
    preset: 'primary' as const,
    icon: 'Search',
    title: 'Asset Research',
  },
  discovery: {
    preset: 'violet' as const,
    icon: 'Compass',
    title: 'Discovery Hub',
  },
  watchlist: {
    preset: 'amber' as const,
    icon: 'Star',
    title: 'Watchlist',
  },
  settings: {
    preset: 'violet' as const,
    icon: 'Settings',
    title: 'Account Settings',
  },
  support: {
    preset: 'blue' as const,
    icon: 'HelpCircle',
    title: 'Support Center',
  },
} as const;

// ============================================
// SPACING
// ============================================

export const SPACING = {
  page: {
    padding: 'p-4 sm:p-6',
    gap: 'space-y-4 sm:space-y-6',
  },
  card: {
    padding: 'p-6',
    gap: 'space-y-4',
  },
  grid: {
    gap: 'gap-4 sm:gap-6',
  },
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const TYPOGRAPHY = {
  pageTitle: 'text-xl sm:text-2xl font-bold text-foreground',
  pageSubtitle: 'text-muted-foreground text-sm sm:text-base mt-0.5',
  sectionTitle: 'text-lg font-semibold text-foreground',
  cardTitle: 'text-base font-medium text-foreground',
  label: 'text-sm font-medium text-foreground',
  caption: 'text-xs text-muted-foreground',
  metric: 'font-mono tabular-nums',
} as const;

// ============================================
// CARD VARIANTS
// ============================================

export const CARD_STYLES = {
  default: 'bg-card/80 backdrop-blur-xl border-border/40',
  elevated: 'bg-card border-border/30 shadow-xl',
  glass: 'bg-card/20 backdrop-blur-2xl border-white/10',
  interactive: 'bg-card/60 backdrop-blur-xl border-border/40 hover:border-primary/40 hover:-translate-y-0.5 cursor-pointer transition-all',
  accent: {
    positive: 'bg-gradient-to-br from-card to-success/5 border-success/30',
    negative: 'bg-gradient-to-br from-card to-destructive/5 border-destructive/30',
    warning: 'bg-gradient-to-br from-card to-warning/5 border-warning/30',
    primary: 'bg-gradient-to-br from-card to-primary/5 border-primary/30',
    violet: 'bg-gradient-to-br from-card to-violet-500/5 border-violet-500/30',
  },
} as const;

// ============================================
// SEMANTIC FEATURE COLORS
// ============================================

/**
 * Feature-specific color assignments for consistency
 */
export const FEATURE_COLORS = {
  portfolio: 'emerald',
  ai: 'violet',
  analytics: 'blue',
  alerts: 'amber',
  gains: 'emerald',
  losses: 'rose',
  neutral: 'primary',
  premium: 'violet',
  education: 'amber',
} as const;

export type IconPreset = keyof typeof ICON_PRESETS;
export type FeatureColor = keyof typeof FEATURE_COLORS;
