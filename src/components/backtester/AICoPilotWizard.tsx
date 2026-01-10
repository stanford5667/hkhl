// AI Co-Pilot Wizard - Conversational step-by-step portfolio builder
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  ArrowRight, 
  ArrowLeft,
  DollarSign,
  Clock,
  Shield,
  Heart,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  RefreshCw,
  Briefcase,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { InvestorProfile, AssetClass } from '@/types/portfolio';
import { POLYGON_CONFIG } from '@/config/apiConfig';

type WizardStep = 'capital' | 'horizon' | 'risk' | 'preferences' | 'review';

interface AICoPilotWizardProps {
  onComplete: (profile: InvestorProfile) => void;
  onBack: () => void;
}

const WIZARD_STEPS: { id: WizardStep; title: string; icon: React.ReactNode }[] = [
  { id: 'capital', title: 'Capital', icon: <DollarSign className="h-4 w-4" /> },
  { id: 'horizon', title: 'Timeline', icon: <Clock className="h-4 w-4" /> },
  { id: 'risk', title: 'Risk', icon: <Shield className="h-4 w-4" /> },
  { id: 'preferences', title: 'Preferences', icon: <Heart className="h-4 w-4" /> },
  { id: 'review', title: 'Review', icon: <CheckCircle2 className="h-4 w-4" /> },
];

const PRESET_CAPITALS = [10000, 50000, 100000, 250000, 500000, 1000000];

const TIME_HORIZONS = [
  { years: 1, label: '1 year', description: 'Short-term, emergency fund' },
  { years: 2, label: '2 years', description: 'Near-term goals' },
  { years: 3, label: '3 years', description: 'Medium-term goals' },
  { years: 4, label: '4 years', description: 'Intermediate planning' },
  { years: 5, label: '5 years', description: 'Max historical data available' },
].filter(h => h.years <= POLYGON_CONFIG.MAX_HISTORY_YEARS);

const RISK_REACTIONS = [
  { 
    tolerance: 20, 
    label: 'Sell everything immediately', 
    emoji: '😰',
    description: 'I can\'t handle losses'
  },
  { 
    tolerance: 40, 
    label: 'Reduce my positions', 
    emoji: '😟',
    description: 'I\'d be worried but take action'
  },
  { 
    tolerance: 60, 
    label: 'Hold and wait it out', 
    emoji: '😐',
    description: 'Markets recover eventually'
  },
  { 
    tolerance: 80, 
    label: 'See it as a buying opportunity', 
    emoji: '🤑',
    description: 'Time to buy the dip!'
  },
];

const SECTOR_PREFERENCES = [
  { id: 'tech', label: 'Technology', description: 'AI, software, semiconductors' },
  { id: 'healthcare', label: 'Healthcare', description: 'Biotech, pharma, medical devices' },
  { id: 'finance', label: 'Financial', description: 'Banks, insurance, fintech' },
  { id: 'energy', label: 'Energy', description: 'Oil, gas, renewables' },
  { id: 'consumer', label: 'Consumer', description: 'Retail, food, entertainment' },
  { id: 'industrial', label: 'Industrial', description: 'Manufacturing, infrastructure' },
];

const ASSET_CLASSES: { id: AssetClass; label: string; description: string }[] = [
  { id: 'stocks', label: 'Individual Stocks', description: 'Direct company ownership' },
  { id: 'etfs', label: 'ETFs', description: 'Diversified funds' },
  { id: 'bonds', label: 'Bonds', description: 'Fixed income securities' },
  { id: 'crypto', label: 'Cryptocurrency', description: 'Digital assets (higher risk)' },
  { id: 'commodities', label: 'Commodities', description: 'Gold, silver, oil' },
  { id: 'real_estate', label: 'Real Estate', description: 'REITs and property funds' },
];

export function AICoPilotWizard({ onComplete, onBack }: AICoPilotWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('capital');
  
  // Form state
  const [capital, setCapital] = useState(100000);
  const [customCapital, setCustomCapital] = useState('');
  const [horizon, setHorizon] = useState(5);
  const [riskTolerance, setRiskTolerance] = useState(60);
  const [lovedSectors, setLovedSectors] = useState<string[]>([]);
  const [hatedSectors, setHatedSectors] = useState<string[]>([]);
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>(['stocks', 'etfs', 'bonds']);
  const [needsLiquidity, setNeedsLiquidity] = useState(false);

  const stepIndex = WIZARD_STEPS.findIndex(s => s.id === currentStep);

  const goNext = () => {
    const idx = WIZARD_STEPS.findIndex(s => s.id === currentStep);
    if (idx < WIZARD_STEPS.length - 1) {
      setCurrentStep(WIZARD_STEPS[idx + 1].id);
    }
  };

  const goBack = () => {
    const idx = WIZARD_STEPS.findIndex(s => s.id === currentStep);
    if (idx > 0) {
      setCurrentStep(WIZARD_STEPS[idx - 1].id);
    } else {
      onBack();
    }
  };

  const handleComplete = () => {
    const profile: InvestorProfile = {
      investableCapital: capital,
      liquidityConstraint: needsLiquidity || horizon <= 1 ? 'high' : 'locked',
      assetUniverse: assetClasses,
      riskTolerance,
      taxBracket: capital > 500000 ? 'high' : capital > 100000 ? 'medium' : 'low',
      investmentHorizon: horizon,
    };
    onComplete(profile);
  };

  const toggleSector = (sector: string, type: 'loved' | 'hated') => {
    if (type === 'loved') {
      if (lovedSectors.includes(sector)) {
        setLovedSectors(prev => prev.filter(s => s !== sector));
      } else {
        setLovedSectors(prev => [...prev, sector]);
        setHatedSectors(prev => prev.filter(s => s !== sector));
      }
    } else {
      if (hatedSectors.includes(sector)) {
        setHatedSectors(prev => prev.filter(s => s !== sector));
      } else {
        setHatedSectors(prev => [...prev, sector]);
        setLovedSectors(prev => prev.filter(s => s !== sector));
      }
    }
  };

  const toggleAssetClass = (assetClass: AssetClass) => {
    if (assetClasses.includes(assetClass)) {
      if (assetClasses.length > 1) {
        setAssetClasses(prev => prev.filter(a => a !== assetClass));
      }
    } else {
      setAssetClasses(prev => [...prev, assetClass]);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0 
    }).format(value);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'capital': return capital > 0;
      case 'horizon': return horizon > 0;
      case 'risk': return riskTolerance >= 0;
      case 'preferences': return assetClasses.length > 0;
      case 'review': return true;
      default: return false;
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0
    })
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-12">
        {WIZARD_STEPS.map((step, idx) => (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => idx < stepIndex && setCurrentStep(step.id)}
              disabled={idx > stepIndex}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-all",
                idx < stepIndex && "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20",
                idx === stepIndex && "bg-primary text-primary-foreground",
                idx > stepIndex && "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {idx < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : step.icon}
              <span className="hidden md:inline">{step.title}</span>
            </button>
            {idx < WIZARD_STEPS.length - 1 && (
              <div className={cn(
                "w-6 h-0.5 mx-1",
                idx < stepIndex ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Capital Step */}
          {currentStep === 'capital' && (
            <div className="space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-4">
                  <Wallet className="h-8 w-8 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">How much capital are we working with?</h2>
                <p className="text-muted-foreground">
                  This helps us determine appropriate position sizes and diversification
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {PRESET_CAPITALS.map(amount => (
                  <button
                    key={amount}
                    onClick={() => {
                      setCapital(amount);
                      setCustomCapital('');
                    }}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all text-center",
                      capital === amount && !customCapital
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-lg font-bold">{formatCurrency(amount)}</span>
                  </button>
                ))}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-4 text-sm text-muted-foreground">or enter custom amount</span>
                </div>
              </div>

              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={customCapital}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setCustomCapital(value);
                    if (value) setCapital(parseInt(value));
                  }}
                  placeholder="Enter amount"
                  className="pl-12 h-14 text-xl"
                />
              </div>

              <div className="text-center p-4 rounded-xl bg-card border border-border">
                <p className="text-sm text-muted-foreground">Starting capital</p>
                <p className="text-3xl font-bold text-emerald-500">{formatCurrency(capital)}</p>
              </div>
            </div>
          )}

          {/* Horizon Step */}
          {currentStep === 'horizon' && (
            <div className="space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-4">
                  <Clock className="h-8 w-8 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">When do you realistically need this money back?</h2>
                <p className="text-muted-foreground">
                  Longer horizons allow for more aggressive growth strategies
                </p>
              </div>

              <div className="space-y-3">
                {TIME_HORIZONS.map(option => (
                  <button
                    key={option.years}
                    onClick={() => setHorizon(option.years)}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 transition-all text-left flex items-center justify-between",
                      horizon === option.years
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                    {horizon === option.years && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                <Checkbox 
                  id="liquidity" 
                  checked={needsLiquidity}
                  onCheckedChange={(checked) => setNeedsLiquidity(checked === true)}
                />
                <Label htmlFor="liquidity" className="text-sm cursor-pointer">
                  I may need quick access to some of this money (high liquidity preference)
                </Label>
              </div>
            </div>
          )}

          {/* Risk Step */}
          {currentStep === 'risk' && (
            <div className="space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-4">
                  <TrendingDown className="h-8 w-8 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">How would you react if your portfolio dropped 20% in a month?</h2>
                <p className="text-muted-foreground">
                  Your honest answer helps us calibrate your risk tolerance
                </p>
              </div>

              <div className="space-y-3">
                {RISK_REACTIONS.map(reaction => (
                  <button
                    key={reaction.tolerance}
                    onClick={() => setRiskTolerance(reaction.tolerance)}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4",
                      riskTolerance === reaction.tolerance
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-3xl">{reaction.emoji}</span>
                    <div className="flex-1">
                      <p className="font-medium">{reaction.label}</p>
                      <p className="text-sm text-muted-foreground">{reaction.description}</p>
                    </div>
                    {riskTolerance === reaction.tolerance && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>

              <Card className={cn(
                "border-2",
                riskTolerance <= 30 && "border-emerald-500/50 bg-emerald-500/5",
                riskTolerance > 30 && riskTolerance <= 60 && "border-amber-500/50 bg-amber-500/5",
                riskTolerance > 60 && "border-rose-500/50 bg-rose-500/5"
              )}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className={cn(
                        "h-5 w-5",
                        riskTolerance <= 30 && "text-emerald-500",
                        riskTolerance > 30 && riskTolerance <= 60 && "text-amber-500",
                        riskTolerance > 60 && "text-rose-500"
                      )} />
                      <span className="font-medium">Risk Profile:</span>
                    </div>
                    <Badge variant={
                      riskTolerance <= 30 ? 'default' : 
                      riskTolerance <= 60 ? 'secondary' : 
                      'destructive'
                    }>
                      {riskTolerance <= 30 ? 'Conservative' : 
                       riskTolerance <= 60 ? 'Moderate' : 
                       'Aggressive'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Preferences Step */}
          {currentStep === 'preferences' && (
            <div className="space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-4">
                  <Heart className="h-8 w-8 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Are there sectors you love or hate?</h2>
                <p className="text-muted-foreground">
                  We'll weight your portfolio based on your preferences
                </p>
              </div>

              {/* Asset Classes */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Asset Classes to Include
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {ASSET_CLASSES.map(asset => (
                    <button
                      key={asset.id}
                      onClick={() => toggleAssetClass(asset.id)}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all text-left",
                        assetClasses.includes(asset.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{asset.label}</span>
                        {assetClasses.includes(asset.id) && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{asset.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sector Preferences */}
              <div>
                <h3 className="text-sm font-medium mb-3">Sector Preferences (optional)</h3>
                <div className="grid grid-cols-2 gap-2">
                  {SECTOR_PREFERENCES.map(sector => {
                    const isLoved = lovedSectors.includes(sector.id);
                    const isHated = hatedSectors.includes(sector.id);
                    
                    return (
                      <div key={sector.id} className="p-3 rounded-lg border border-border">
                        <p className="font-medium text-sm mb-1">{sector.label}</p>
                        <p className="text-xs text-muted-foreground mb-2">{sector.description}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleSector(sector.id, 'loved')}
                            className={cn(
                              "flex-1 py-1 px-2 rounded text-xs transition-colors",
                              isLoved 
                                ? "bg-emerald-500 text-white" 
                                : "bg-muted hover:bg-emerald-500/20"
                            )}
                          >
                            ❤️ Love
                          </button>
                          <button
                            onClick={() => toggleSector(sector.id, 'hated')}
                            className={cn(
                              "flex-1 py-1 px-2 rounded text-xs transition-colors",
                              isHated 
                                ? "bg-rose-500 text-white" 
                                : "bg-muted hover:bg-rose-500/20"
                            )}
                          >
                            👎 Avoid
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Review Step */}
          {currentStep === 'review' && (
            <div className="space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-4">
                  <Sparkles className="h-8 w-8 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Ready to build your portfolio!</h2>
                <p className="text-muted-foreground">
                  Review your profile and let our AI create your optimized portfolio
                </p>
              </div>

              <Card>
                <CardContent className="py-6 space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-muted-foreground" />
                      <span>Starting Capital</span>
                    </div>
                    <span className="font-bold text-lg">{formatCurrency(capital)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <span>Time Horizon</span>
                    </div>
                    <span className="font-bold">{horizon} years</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <span>Risk Tolerance</span>
                    </div>
                    <Badge variant={
                      riskTolerance <= 30 ? 'default' : 
                      riskTolerance <= 60 ? 'secondary' : 
                      'destructive'
                    }>
                      {riskTolerance <= 30 ? 'Conservative' : 
                       riskTolerance <= 60 ? 'Moderate' : 
                       'Aggressive'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                      <span>Asset Classes</span>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {assetClasses.map(ac => (
                        <Badge key={ac} variant="outline" className="text-xs">{ac}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  {needsLiquidity && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">High liquidity preference noted</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button 
                size="lg" 
                className="w-full h-14 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                onClick={handleComplete}
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Generate My Portfolio
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Footer */}
      {currentStep !== 'review' && (
        <div className="flex justify-between mt-12 pt-6 border-t border-border">
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {stepIndex === 0 ? 'Choose Path' : 'Back'}
          </Button>
          <Button onClick={goNext} disabled={!canProceed()}>
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
      
      {currentStep === 'review' && (
        <div className="flex justify-center mt-6">
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back to Edit
          </Button>
        </div>
      )}
    </div>
  );
}
