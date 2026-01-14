import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Zap, TrendingUp, Bell, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMediaQuery } from '@/hooks/use-media-query';
import { MobileAuthSheet } from '@/components/auth/MobileAuthSheet';

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
  default: {
    title: "Upgrade to Pro",
    benefit: 'Unlock all premium features',
  },
};

const PRO_FEATURES = [
  { icon: Sparkles, text: 'Unlimited AI analyses' },
  { icon: TrendingUp, text: 'Real-time screener alerts' },
  { icon: Bell, text: 'Unlimited price alerts' },
  { icon: Zap, text: 'Priority AI processing' },
  { icon: Crown, text: 'Exclusive pro screens' },
];

export function UpgradeModal({ isOpen, feature, onClose, onUpgrade }: UpgradeModalProps) {
  const copy = FEATURE_COPY[feature] || FEATURE_COPY.default;
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setShowAuthSheet(true);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) {
        toast.error('Failed to start checkout');
        console.error('Checkout error:', error);
        return;
      }
      
      if (data?.url) {
        window.open(data.url, '_blank');
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

  const UpgradeContent = () => (
    <div className="space-y-5 py-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-primary/5 rounded-lg p-4 border border-primary/10"
      >
        <p className="text-sm text-muted-foreground text-center">
          Upgrade to Pro and get:
        </p>
      </motion.div>

      <div className="space-y-3">
        {PRO_FEATURES.map((f, i) => (
          <motion.div
            key={f.text}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className="flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Check className="h-4 w-4 text-green-500" />
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

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center space-y-1"
      >
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold">$50</span>
          <span className="text-muted-foreground">/month</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Full access to all Pro features
        </p>
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
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold h-12 shadow-lg shadow-orange-500/20"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Crown className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Starting checkout...' : 'Upgrade to Pro'}
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
        className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30"
      >
        <Crown className="h-7 w-7 text-white" />
      </motion.div>
    </div>
  );

  // Use Dialog for desktop, Drawer for mobile
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
          title="Sign up to access Pro"
          description="Create a free account, then upgrade to unlock premium features."
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
        title="Sign up to access Pro"
        description="Create a free account, then upgrade to unlock premium features."
      />
    </>
  );
}
