/**
 * Legal Disclaimer Components
 * 
 * A comprehensive set of disclaimers to ensure the site is clearly
 * positioned as an educational platform, not an investment adviser.
 * 
 * USE THESE EVERYWHERE.
 */

import { ReactNode, useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Info,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Scale,
  TrendingUp,
  Shield,
  FileText,
  GraduationCap,
  FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS - Edit these for your site
// ═══════════════════════════════════════════════════════════════════════════════

export const SITE_NAME = 'AssetLabs';
export const SITE_URL = 'assetlabs.io';

// ═══════════════════════════════════════════════════════════════════════════════
// EDUCATIONAL CONTENT BADGE
// Use on any AI-generated or analytical content
// ═══════════════════════════════════════════════════════════════════════════════

interface EducationalBadgeProps {
  variant?: 'default' | 'ai' | 'simulation' | 'research';
  className?: string;
}

export function EducationalBadge({ variant = 'default', className }: EducationalBadgeProps) {
  const variants = {
    default: {
      icon: GraduationCap,
      text: 'Educational Content',
      className: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    },
    ai: {
      icon: Sparkles,
      text: 'AI-Generated Educational Analysis',
      className: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    },
    simulation: {
      icon: FlaskConical,
      text: 'Hypothetical Simulation',
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    },
    research: {
      icon: BookOpen,
      text: 'Research & Education',
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn('gap-1.5 font-normal', config.className, className)}
    >
      <Icon className="h-3 w-3" />
      {config.text}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INLINE DISCLAIMER
// Use at the top of results pages, portfolio explorers, etc.
// ═══════════════════════════════════════════════════════════════════════════════

interface InlineDisclaimerProps {
  variant?: 'info' | 'warning' | 'education' | 'simulation';
  className?: string;
}

export function InlineDisclaimer({ variant = 'info', className }: InlineDisclaimerProps) {
  const variants = {
    info: {
      icon: Info,
      title: 'Educational Content Only',
      description: 'This information is for educational purposes and is not personalized investment advice. Your individual circumstances may vary. Consult a qualified financial professional before making investment decisions.',
      className: 'border-blue-500/30 bg-blue-500/5',
      iconClassName: 'text-blue-400',
    },
    warning: {
      icon: AlertTriangle,
      title: 'Important Notice',
      description: 'Past performance does not guarantee future results. All investments involve risk, including possible loss of principal. The examples shown are hypothetical and for educational purposes only.',
      className: 'border-amber-500/30 bg-amber-500/5',
      iconClassName: 'text-amber-400',
    },
    education: {
      icon: GraduationCap,
      title: 'Learning Tool',
      description: `${SITE_NAME} is an educational platform. The portfolios, analyses, and simulations shown are examples to help you learn about investing concepts—not recommendations for your specific situation.`,
      className: 'border-emerald-500/30 bg-emerald-500/5',
      iconClassName: 'text-emerald-400',
    },
    simulation: {
      icon: FlaskConical,
      title: 'Hypothetical Results',
      description: 'This simulation uses historical data to show how a portfolio might have performed. Actual results would vary due to fees, taxes, timing, and market conditions. This is not a prediction of future performance.',
      className: 'border-violet-500/30 bg-violet-500/5',
      iconClassName: 'text-violet-400',
    },
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <Alert className={cn(config.className, className)}>
      <Icon className={cn('h-4 w-4', config.iconClassName)} />
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription className="text-muted-foreground">
        {config.description}
      </AlertDescription>
    </Alert>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPACT DISCLAIMER
// Use in cards, tooltips, smaller spaces
// ═══════════════════════════════════════════════════════════════════════════════

interface CompactDisclaimerProps {
  text?: string;
  className?: string;
}

export function CompactDisclaimer({ 
  text = 'For educational purposes only. Not investment advice.',
  className,
}: CompactDisclaimerProps) {
  return (
    <p className={cn('text-xs text-muted-foreground flex items-center gap-1', className)}>
      <Info className="h-3 w-3 shrink-0" />
      {text}
    </p>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI CONTENT DISCLAIMER
// Use on any AI-generated analysis or content
// ═══════════════════════════════════════════════════════════════════════════════

interface AIDisclaimerProps {
  className?: string;
  compact?: boolean;
}

export function AIDisclaimer({ className, compact = false }: AIDisclaimerProps) {
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
        <Sparkles className="h-3 w-3 text-violet-400" />
        <span>AI-generated educational analysis. Not personalized advice.</span>
      </div>
    );
  }

  return (
    <Card className={cn('border-violet-500/20 bg-violet-500/5', className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">AI-Generated Educational Content</p>
            <p className="text-xs text-muted-foreground">
              This analysis was generated by AI to help explain investing concepts. 
              It reflects general market research and historical patterns—not personalized 
              advice for your situation. AI can make errors. Always verify important 
              information and consult qualified professionals.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACKTEST / SIMULATION DISCLAIMER
// Use on all historical performance displays
// ═══════════════════════════════════════════════════════════════════════════════

interface SimulationDisclaimerProps {
  className?: string;
  detailed?: boolean;
}

export function SimulationDisclaimer({ className, detailed = false }: SimulationDisclaimerProps) {
  if (!detailed) {
    return (
      <Alert className={cn('border-amber-500/30 bg-amber-500/5', className)}>
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <AlertTitle>Hypothetical Performance</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Results shown are simulated using historical data. Past performance does not 
          guarantee future results. Actual returns would differ due to fees, taxes, 
          and market conditions.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={cn('border-amber-500/20', className)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h4 className="font-semibold">Important: Hypothetical Performance Disclosure</h4>
        </div>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>HYPOTHETICAL PERFORMANCE RESULTS HAVE MANY INHERENT LIMITATIONS</strong>, 
            some of which are described below.
          </p>
          <p>
            No representation is being made that any account will or is likely to achieve 
            profits or losses similar to those shown. In fact, there are frequently sharp 
            differences between hypothetical performance results and the actual results 
            subsequently achieved by any particular trading program.
          </p>
          <p>
            One of the limitations of hypothetical performance results is that they are 
            generally prepared with the benefit of hindsight. In addition, hypothetical 
            trading does not involve financial risk, and no hypothetical trading record 
            can completely account for the impact of financial risk in actual trading.
          </p>
          <p>
            For example, the ability to withstand losses or to adhere to a particular 
            trading program in spite of trading losses are material points which can 
            also adversely affect actual trading results.
          </p>
          <p>
            There are numerous other factors related to the markets in general or to 
            the implementation of any specific trading program which cannot be fully 
            accounted for in the preparation of hypothetical performance results and 
            all of which can adversely affect actual trading results.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACKNOWLEDGMENT DIALOG
// Show before first use of portfolio explorer or simulations
// ═══════════════════════════════════════════════════════════════════════════════

interface AcknowledgmentDialogProps {
  open: boolean;
  onAccept: () => void;
  title?: string;
  feature?: string;
}

export function AcknowledgmentDialog({ 
  open, 
  onAccept,
  title = 'Before You Continue',
  feature = 'this educational tool',
}: AcknowledgmentDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-400" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Please read and acknowledge the following before using {feature}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <p>
                <strong className="text-foreground">Educational Purpose:</strong> {SITE_NAME} is 
                an educational platform. All content, analyses, and simulations are for 
                learning purposes only.
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <Scale className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <p>
                <strong className="text-foreground">Not Investment Advice:</strong> Nothing on 
                this site constitutes personalized investment advice, a recommendation to 
                buy or sell securities, or an offer of any kind.
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <p>
                <strong className="text-foreground">No Guarantees:</strong> Past performance 
                does not guarantee future results. All investments involve risk, including 
                possible loss of principal.
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
              <p>
                <strong className="text-foreground">Seek Professional Advice:</strong> Before 
                making any investment decisions, consult with a qualified financial professional 
                who understands your specific situation.
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-3">
            <Checkbox 
              id="acknowledge" 
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
            />
            <Label 
              htmlFor="acknowledge" 
              className="text-sm leading-relaxed cursor-pointer"
            >
              I understand that {SITE_NAME} provides educational content only, not 
              personalized investment advice. I will consult qualified professionals 
              before making investment decisions.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={onAccept} 
            disabled={!acknowledged}
            className="w-full sm:w-auto"
          >
            Continue to {feature}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL FOOTER DISCLAIMER
// Use at the bottom of every page
// On mobile, only shows when user scrolls to bottom
// ═══════════════════════════════════════════════════════════════════════════════

interface FooterDisclaimerProps {
  className?: string;
  expanded?: boolean;
}

export function FooterDisclaimer({ className, expanded = false }: FooterDisclaimerProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Find the scrollable container (main element with overflow-auto)
    const scrollContainer = document.querySelector('main.overflow-auto');
    
    const handleScroll = () => {
      if (!scrollContainer) return;
      
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      // Consider "at bottom" when within 50px of the bottom
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsAtBottom(atBottom);
    };

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      // Check initial state
      handleScroll();
    }

    return () => {
      window.removeEventListener('resize', checkMobile);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // On mobile, don't render until scrolled to bottom
  if (isMobile && !isAtBottom) {
    // Return a placeholder with same approximate height to prevent layout shift when it appears
    return <div className="h-0" />;
  }

  return (
    <div className={cn('border-t bg-muted/30', className)}>
      <div className="container max-w-6xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {/* Always visible */}
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Important Disclosures</p>
              <p className="text-xs text-muted-foreground">
                {SITE_NAME} is an educational platform providing tools and information about 
                investing concepts. We are <strong>not</strong> a registered investment adviser, 
                broker-dealer, or financial planner. Nothing on this site constitutes investment 
                advice, a recommendation, or an offer to buy or sell securities.
              </p>
            </div>
          </div>

          {/* Expandable section */}
          {isExpanded && (
            <div className="pl-8 space-y-3 text-xs text-muted-foreground">
              <p>
                <strong>Past Performance:</strong> Past performance does not guarantee future 
                results. All performance figures shown are hypothetical and based on historical 
                data. Actual investment results will vary.
              </p>
              <p>
                <strong>Risk Disclosure:</strong> All investments involve risk, including the 
                possible loss of principal. The value of investments can go down as well as up. 
                Different types of investments involve varying degrees of risk.
              </p>
              <p>
                <strong>Simulated Results:</strong> Any backtests, simulations, or hypothetical 
                examples are for educational purposes only. They have inherent limitations and 
                do not reflect actual trading. Results would differ due to fees, taxes, timing, 
                and other factors.
              </p>
              <p>
                <strong>AI-Generated Content:</strong> Some content on this site is generated 
                by artificial intelligence. AI analysis is for educational purposes only and 
                may contain errors. It does not constitute personalized advice.
              </p>
              <p>
                <strong>Third-Party Data:</strong> Market data and information is obtained from 
                sources believed to be reliable, but we cannot guarantee its accuracy or 
                completeness. Data may be delayed or contain errors.
              </p>
              <p>
                <strong>Professional Advice:</strong> Before making any investment decisions, 
                you should consult with a qualified financial professional, tax professional, or 
                attorney who understands your specific circumstances and goals.
              </p>
              <p>
                <strong>No Warranty:</strong> {SITE_NAME} is provided "as is" without any 
                warranty of any kind. We do not guarantee the accuracy, completeness, or 
                usefulness of any information on this site.
              </p>
            </div>
          )}

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? 'Show Less' : 'Read Full Disclosure'}
          </Button>

          {/* Copyright */}
          <Separator />
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="/disclosures" className="hover:text-foreground transition-colors">Disclosures</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK DISCLAIMER BAR
// Sticky bar for important pages
// ═══════════════════════════════════════════════════════════════════════════════

interface DisclaimerBarProps {
  className?: string;
}

export function DisclaimerBar({ className }: DisclaimerBarProps) {
  return (
    <div className={cn(
      'bg-amber-500/10 border-b border-amber-500/20 px-4 py-2',
      className
    )}>
      <p className="text-xs text-center text-amber-200/80">
        <AlertTriangle className="h-3 w-3 inline mr-1" />
        Educational content only. Not investment advice. Past performance ≠ future results. 
        <a href="/disclosures" className="underline ml-1 hover:text-amber-100">
          Full disclosure
        </a>
      </p>
    </div>
  );
}
