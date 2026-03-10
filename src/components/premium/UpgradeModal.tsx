import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Zap, TrendingUp, Bell, Sparkles, Loader2, BookOpen, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMediaQuery } from '@/hooks/use-media-query';
import { MobileAuthSheet } from '@/components/auth/MobileAuthSheet';
import { cn } from '@/lib/utils';
import { BillingToggle } from '@/components/onboarding/BillingToggle';

interface UpgradeModalProps {
  isOpen: boolean;
  feature: string;
  onClose: () => void;
  onUpgrade?: () => void;
}

const FEATURE_COPY: Record<string, { title: string; benefit: string }> = {
  aiAnalyses: {
    title: "You've used all your AI analyses today",
    benefit: 'Unlimited AI analyses & market chat',
  },
  portfolios: {
    title: "You've reached the portfolio limit",
    benefit: 'Save portfolios, studies & screens',
  },
  savedScreens: {
    title: "You've saved the maximum screens",
    benefit: 'Save portfolios, studies & screens',
  },
  alertsPerDay: {
    title: "You've set up all your free alerts",
    benefit: 'Real-time price alerts',
  },
  premiumScreens: {
    title: "This is a Pro feature",
    benefit: 'Full portfolio screener access',
  },
  quantStudies: {
    title: "You've used all your free Quant Lab studies",
    benefit: 'All Quant Lab studies (100+ available)',
  },
  screenerSearches: {
    title: "Free plan shows limited results",
    benefit: 'Full portfolio screener access',
  },
  screenerFilters: {
    title: "Multiple filters are a Pro feature",
    benefit: 'Full portfolio screener access',
  },
  'strategy-signals': {
    title: "Unlock Pro Strategy Signals",
    benefit: 'Backtesting & strategy tools',
  },
  financialProjections: {
    title: "Unlock Full Financial Projections",
    benefit: 'Expanded datasets & asset coverage',
  },
  courses: {
    title: "Unlock All Courses & Education",
    benefit: 'Full video course library',
  },
  tradeIdeas: {
    title: "Unlock Trade Ideas",
    benefit: 'Community trade ideas & research posts',
  },
  premiumContent: {
    title: "Unlock Premium Content",
    benefit: 'Exclusive educational content',
  },
  default: {
    title: "Upgrade to Pro",
    benefit: 'Unlock all premium features',
  },
};

const PRO_FEATURES = [
  { icon: Sparkles, text: 'Unlimited AI analyses & market chat' },
  { icon: BookOpen, text: 'Full video course library' },
  { icon: Lightbulb, text: 'Community trade ideas & research posts' },
  { icon: TrendingUp, text: 'Full portfolio screener access' },
  { icon: Bell, text: 'Save portfolios, studies & screens' },
  { icon: Zap, text: 'All Quant Lab studies (100+ available)' },
  { icon: Crown, text: 'Deep conditional probability studies' },
  { icon: Crown, text: 'Expanded datasets & asset coverage' },
  { icon: Crown, text: 'Extended historical timeframes' },
  { icon: Crown, text: 'Backtesting & strategy tools' },
  { icon: Crown, text: 'Real-time price alerts' },
];

const COMING_SOON_FEATURES = [
  'Options flow screening',
  'Agentic news bots',
  'Hundreds of new studies',
];

const PRICES = {
  monthly: 100,
  annual: 58,
  annualTotal: 700,
};

export function UpgradeModal({ isOpen, feature, onClose, onUpgrade }: UpgradeModalProps) {
  const copy = FEATURE_COPY[feature] || FEATURE_COPY.default;
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [isAnnual, setIsAnnual] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsLoading(false);
        setShowAuthSheet(true);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: 'research_education', billing_interval: isAnnual ? 'annual' : 'monthly' },
      });
      
      if (error) {
        toast.error('Failed to start checkout');
        console.error('Checkout error:', error);
        return;
      }
      
      if (data?.url) {
        const w = window.open(data.url, '_blank');
        if (!w) window.location.href = data.url;
        onUpgrade?.();
        onClose();
      }
    } catch (err) {
      toast.error('Something went wrong');
      console.error('Checkout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = async () => {
    await handleUpgrade();
  };

  const price = isAnnual ? PRICES.annual : PRICES.monthly;

  const UpgradeContent = () => (
    <div className="space-y-4 py-4">
      <BillingToggle isAnnual={isAnnual} onChange={setIsAnnual} />

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center"
      >
        <div className="text-3xl font-bold">
          ${price}<span className="text-lg text-muted-foreground">/mo</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {isAnnual ? `Billed $${PRICES.annualTotal}/yr` : 'Billed monthly'}
        </p>
        {isAnnual && (
          <p className="text-xs text-green-500 font-medium mt-0.5">
            Save ${(PRICES.monthly * 12) - PRICES.annualTotal}/yr vs monthly
          </p>
        )}
      </motion.div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Everything included
        </p>
        
        {PRO_FEATURES.map((f, i) => (
          <motion.div
            key={f.text}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.04 }}
            className="flex items-center gap-3"
          >
            <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Check className="h-3.5 w-3.5 text-green-500" />
            </div>
            <span className="text-sm font-medium">{f.text}</span>
            {f.text === copy.benefit && (
              <Badge variant="secondary" className="ml-auto text-xs">
                This feature
              </Badge>
            )}
          </motion.div>
        ))}
      </div>

      {/* Coming Soon Section */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-3 border border-primary/20"
      >
        <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2 flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Coming Soon
        </p>
        <div className="flex flex-wrap gap-1.5">
          {COMING_SOON_FEATURES.map((feature, i) => (
            <span key={i} className="text-xs bg-background/50 px-2 py-1 rounded-full text-muted-foreground">
              {feature}
            </span>
          ))}
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-3"
      >
        <Button 
          onClick={handleUpgrade}
          disabled={isLoading}
          className="w-full font-semibold h-12 shadow-lg text-white bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-primary/20"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Crown className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Starting checkout...' : `Upgrade to Pro — $${price}/mo`}
        </Button>
        <Button 
          variant="ghost" 
          onClick={onClose}
          disabled={isLoading}
          className="w-full text-muted-foreground"
        >
          Maybe later
        </Button>
      </motion.div>

      <p className="text-xs text-muted-foreground text-center pb-2">
        7-day money-back guarantee • Cancel anytime
      </p>
    </div>
  );

  const HeaderIcon = () => (
    <div className="mx-auto mb-4 relative">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br from-primary to-primary/70 shadow-primary/30"
      >
        <Crown className="h-7 w-7 text-white" />
      </motion.div>
    </div>
  );

  if (isDesktop) {
    return (
      <>
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-md border-primary/20 bg-gradient-to-b from-background to-muted/30">
            <DialogHeader className="text-center pb-2">
              <HeaderIcon />
              <DialogTitle className="text-xl font-bold text-center">
                {copy.title}
              </DialogTitle>
            </DialogHeader>
            <UpgradeContent />
          </DialogContent>
        </Dialog>
        <MobileAuthSheet 
          open={showAuthSheet} 
          onOpenChange={setShowAuthSheet}
          title="Sign up to access premium"
          description="Create a free account, then upgrade to unlock premium features."
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[90vh] border-primary/20 bg-gradient-to-b from-background to-muted/30">
          <DrawerHeader className="text-center pb-2">
            <HeaderIcon />
            <DrawerTitle className="text-xl font-bold text-center">
              {copy.title}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 overflow-y-auto safe-area-bottom">
            <UpgradeContent />
          </div>
        </DrawerContent>
      </Drawer>
      <MobileAuthSheet 
        open={showAuthSheet} 
        onOpenChange={setShowAuthSheet}
        title="Sign up to access premium"
        description="Create a free account, then upgrade to unlock premium features."
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
