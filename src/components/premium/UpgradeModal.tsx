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

interface UpgradeModalProps {
  isOpen: boolean;
  feature: string;
  onClose: () => void;
  onUpgrade?: () => void;
}

const FEATURE_COPY: Record<string, { title: string; benefit: string }> = {
  aiAnalyses: {
    title: "You've used all your AI analyses today",
    benefit: 'Unlimited AI stock analyses',
  },
  portfolios: {
    title: "You've reached the portfolio limit",
    benefit: 'Unlimited portfolios',
  },
  savedScreens: {
    title: "You've saved the maximum screens",
    benefit: 'Unlimited saved screens',
  },
  alertsPerDay: {
    title: "You've set up all your free alerts",
    benefit: 'Unlimited price & news alerts',
  },
  premiumScreens: {
    title: "This is a Pro feature",
    benefit: 'Access premium stock screens',
  },
  quantStudies: {
    title: "You've used all your free Quant Lab studies",
    benefit: 'Unlimited Quant Lab analyses',
  },
  screenerSearches: {
    title: "Free plan shows limited results",
    benefit: 'Unlimited portfolio screener results',
  },
  screenerFilters: {
    title: "Multiple filters are a Pro feature",
    benefit: 'Use all screening criteria',
  },
  'strategy-signals': {
    title: "Unlock Pro Strategy Signals",
    benefit: 'Access 20+ advanced indicators',
  },
  financialProjections: {
    title: "Unlock Full Financial Projections",
    benefit: 'Multi-year analyst estimates & scenarios',
  },
  courses: {
    title: "Unlock All Courses & Education",
    benefit: 'Full video course library',
  },
  tradeIdeas: {
    title: "Unlock Trade Ideas",
    benefit: 'Community trade ideas & research',
  },
  premiumContent: {
    title: "Unlock Premium Content",
    benefit: 'Access exclusive research & insights',
  },
  default: {
    title: "Upgrade Your Plan",
    benefit: 'Unlock all premium features',
  },
};

const RESEARCH_FEATURES = [
  'courses', 'tradeIdeas', 'premiumContent',
];

const PRO_FEATURES = [
  { icon: Sparkles, text: 'Unlimited AI analyses & market chat' },
  { icon: TrendingUp, text: 'Full portfolio screener access' },
  { icon: Bell, text: 'Save portfolios, studies & screens' },
  { icon: Zap, text: 'All Quant Lab studies (100+ available)' },
  { icon: Crown, text: 'Deep conditional probability studies' },
  { icon: Crown, text: 'Multi-year financial projections & scenarios' },
  { icon: Crown, text: 'Expanded datasets & asset coverage' },
  { icon: Crown, text: 'Extended historical timeframes' },
];

const RESEARCH_EDUCATION_EXTRAS = [
  { icon: BookOpen, text: 'Full video course library' },
  { icon: Lightbulb, text: 'Community trade ideas & research posts' },
  { icon: Sparkles, text: 'Exclusive educational content' },
];

const COMING_SOON_FEATURES = [
  'Options flow screening',
  'Agentic news bots',
  'Hundreds of new studies',
];

export function UpgradeModal({ isOpen, feature, onClose, onUpgrade }: UpgradeModalProps) {
  const copy = FEATURE_COPY[feature] || FEATURE_COPY.default;
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'research_education'>(
    RESEARCH_FEATURES.includes(feature) ? 'research_education' : 'pro'
  );
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
        body: { plan: selectedPlan },
      });
      
      if (error) {
        toast.error('Failed to start checkout');
        console.error('Checkout error:', error);
        return;
      }
      
      if (data?.url) {
        window.location.href = data.url;
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

  // After auth success, immediately proceed to checkout with the selected plan
  const handleAuthSuccess = async () => {
    await handleUpgrade();
  };

  const UpgradeContent = () => (
    <div className="space-y-4 py-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-primary/5 rounded-lg p-3 border border-primary/10"
      >
        <p className="text-sm text-muted-foreground text-center">
          Choose the plan that fits your needs
        </p>
      </motion.div>

      {/* Plan Toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSelectedPlan('pro')}
          className={cn(
            "relative rounded-xl p-3 border-2 text-left transition-all",
            selectedPlan === 'pro'
              ? "border-amber-500 bg-amber-500/5"
              : "border-border hover:border-muted-foreground/30"
          )}
        >
          {selectedPlan === 'pro' && (
            <div className="absolute -top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Selected
            </div>
          )}
          <div className="flex items-center gap-2 mb-1">
            <Crown className="h-4 w-4 text-amber-500" />
            <span className="font-semibold text-sm">Pro</span>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl font-bold">$50</span>
            <span className="text-xs text-muted-foreground">/mo</span>
          </div>
        </button>
        <button
          onClick={() => setSelectedPlan('research_education')}
          className={cn(
            "relative rounded-xl p-3 border-2 text-left transition-all",
            selectedPlan === 'research_education'
              ? "border-purple-500 bg-purple-500/5"
              : "border-border hover:border-muted-foreground/30"
          )}
        >
          {selectedPlan === 'research_education' && (
            <div className="absolute -top-2 right-2 bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Selected
            </div>
          )}
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-purple-500" />
            <span className="font-semibold text-sm">Research & Ed</span>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl font-bold">$100</span>
            <span className="text-xs text-muted-foreground">/mo</span>
          </div>
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {selectedPlan === 'pro' ? 'Pro Features' : 'Everything in Pro, plus'}
        </p>
        
        {selectedPlan === 'pro' ? (
          PRO_FEATURES.map((f, i) => (
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
          ))
        ) : (
          <>
            {RESEARCH_EDUCATION_EXTRAS.map((f, i) => (
              <motion.div
                key={f.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.04 }}
                className="flex items-center gap-3"
              >
                <div className="w-7 h-7 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Check className="h-3.5 w-3.5 text-purple-500" />
                </div>
                <span className="text-sm font-medium">{f.text}</span>
                {f.text === copy.benefit && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    This feature
                  </Badge>
                )}
              </motion.div>
            ))}
            <div className="pt-1">
              <p className="text-xs text-muted-foreground mb-2">Plus all Pro features:</p>
              {PRO_FEATURES.slice(0, 4).map((f, i) => (
                <div key={f.text} className="flex items-center gap-3 py-0.5">
                  <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-green-500/60" />
                  </div>
                  <span className="text-xs text-muted-foreground">{f.text}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Coming Soon Section */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-r from-purple-500/10 to-amber-500/10 rounded-lg p-3 border border-purple-500/20"
      >
        <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide mb-2 flex items-center gap-1">
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
          className={cn(
            "w-full font-semibold h-12 shadow-lg text-white",
            selectedPlan === 'pro'
              ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-orange-500/20"
              : "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-purple-500/20"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Crown className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Starting checkout...' : `Upgrade to ${selectedPlan === 'pro' ? 'Pro' : 'Research & Education'} — $${selectedPlan === 'pro' ? '50' : '100'}/mo`}
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
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-lg",
          selectedPlan === 'pro'
            ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-orange-500/30"
            : "bg-gradient-to-br from-purple-400 to-indigo-500 shadow-purple-500/30"
        )}
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
