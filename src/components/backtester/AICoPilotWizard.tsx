/**
 * AI Co-Pilot Wizard - Conversational step-by-step portfolio builder
 * Uses unified questionnaire components for consistent UI
 */
import { useState } from 'react';
import { 
  ArrowRight, 
  DollarSign,
  Clock,
  Shield,
  Heart,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Briefcase,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { InvestorProfile, AssetClass } from '@/types/portfolio';
import { POLYGON_CONFIG } from '@/config/apiConfig';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Import unified questionnaire components
import {
  QuestionnaireShell,
  QuestionnaireStep,
  QuestionCard,
  OptionCard,
  MultiSelectGrid,
  AmountInput,
} from '@/components/questionnaire';

type WizardStep = 'capital' | 'horizon' | 'risk' | 'preferences' | 'review';

interface AICoPilotWizardProps {
  onComplete: (profile: InvestorProfile) => void;
  onBack: () => void;
}

const WIZARD_STEPS: QuestionnaireStep[] = [
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
  const [horizon, setHorizon] = useState(5);
  const [riskTolerance, setRiskTolerance] = useState(60);
  const [lovedSectors, setLovedSectors] = useState<string[]>([]);
  const [hatedSectors, setHatedSectors] = useState<string[]>([]);
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>(['stocks', 'etfs', 'bonds']);
  const [needsLiquidity, setNeedsLiquidity] = useState(false);

  const stepIndex = WIZARD_STEPS.findIndex(s => s.id === currentStep);
  const progress = ((stepIndex + 1) / WIZARD_STEPS.length) * 100;

  const goNext = () => {
    const idx = WIZARD_STEPS.findIndex(s => s.id === currentStep);
    if (idx < WIZARD_STEPS.length - 1) {
      setCurrentStep(WIZARD_STEPS[idx + 1].id as WizardStep);
    }
  };

  const goBack = () => {
    const idx = WIZARD_STEPS.findIndex(s => s.id === currentStep);
    if (idx > 0) {
      setCurrentStep(WIZARD_STEPS[idx - 1].id as WizardStep);
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

  const handleStepClick = (idx: number) => {
    if (idx <= stepIndex) {
      setCurrentStep(WIZARD_STEPS[idx].id as WizardStep);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'capital':
        return (
          <QuestionCard
            icon={<Wallet className="h-7 w-7 text-purple-500" />}
            iconGradient="from-purple-500/20 to-pink-500/10"
            question="How much capital are we working with?"
            subtitle="This helps us determine appropriate position sizes and diversification"
            explanation="Your starting capital influences how we diversify your portfolio. Larger amounts allow for more granular position sizing and access to certain investments."
            onNext={goNext}
            onBack={goBack}
            showBack={true}
            canProceed={canProceed()}
          >
            <AmountInput
              value={capital}
              onChange={setCapital}
              presets={PRESET_CAPITALS}
            />
          </QuestionCard>
        );

      case 'horizon':
        return (
          <QuestionCard
            icon={<Clock className="h-7 w-7 text-blue-500" />}
            iconGradient="from-blue-500/20 to-cyan-500/10"
            question="When do you realistically need this money back?"
            subtitle="Longer horizons allow for more aggressive growth strategies"
            explanation="Your investment timeline is one of the most important factors. Longer horizons let us take more calculated risks for potentially higher returns."
            onNext={goNext}
            onBack={goBack}
            canProceed={canProceed()}
          >
            <div className="space-y-4">
              {TIME_HORIZONS.map(option => (
                <OptionCard
                  key={option.years}
                  label={option.label}
                  description={option.description}
                  selected={horizon === option.years}
                  onClick={() => setHorizon(option.years)}
                />
              ))}
              
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
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
          </QuestionCard>
        );

      case 'risk':
        return (
          <QuestionCard
            icon={<TrendingDown className="h-7 w-7 text-rose-500" />}
            iconGradient="from-rose-500/20 to-orange-500/10"
            question="How would you react if your portfolio dropped 20% in a month?"
            subtitle="Your honest answer helps us calibrate your risk tolerance"
            explanation="This scenario-based question reveals your true emotional tolerance for volatility, which is often different from your theoretical risk tolerance."
            onNext={goNext}
            onBack={goBack}
            canProceed={canProceed()}
          >
            <div className="space-y-3">
              {RISK_REACTIONS.map(reaction => (
                <OptionCard
                  key={reaction.tolerance}
                  label={reaction.label}
                  description={reaction.description}
                  emoji={reaction.emoji}
                  selected={riskTolerance === reaction.tolerance}
                  onClick={() => setRiskTolerance(reaction.tolerance)}
                />
              ))}
              
              <Card className={cn(
                "border-2 mt-4",
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
          </QuestionCard>
        );

      case 'preferences':
        return (
          <QuestionCard
            icon={<Heart className="h-7 w-7 text-pink-500" />}
            iconGradient="from-pink-500/20 to-rose-500/10"
            question="What asset classes and sectors interest you?"
            subtitle="We'll weight your portfolio based on your preferences"
            explanation="While diversification is key, we can tilt your portfolio towards areas you understand and believe in, which often leads to better long-term commitment."
            onNext={goNext}
            onBack={goBack}
            canProceed={canProceed()}
          >
            <div className="space-y-6">
              {/* Asset Classes */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Asset Classes to Include
                </h3>
                <MultiSelectGrid
                  options={ASSET_CLASSES.map(a => ({
                    value: a.id,
                    label: a.label,
                    description: a.description,
                  }))}
                  selected={assetClasses}
                  onChange={(selected) => setAssetClasses(selected as AssetClass[])}
                  columns={2}
                />
              </div>

              {/* Sector Preferences */}
              <div>
                <h3 className="text-sm font-medium mb-3">Sector Preferences (optional)</h3>
                <div className="grid grid-cols-2 gap-2">
                  {SECTOR_PREFERENCES.map(sector => {
                    const isLoved = lovedSectors.includes(sector.id);
                    const isHated = hatedSectors.includes(sector.id);
                    
                    return (
                      <div key={sector.id} className="p-3 rounded-xl border border-border bg-card">
                        <p className="font-medium text-sm mb-1">{sector.label}</p>
                        <p className="text-xs text-muted-foreground mb-2">{sector.description}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleSector(sector.id, 'loved')}
                            className={cn(
                              "flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors",
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
                              "flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors",
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
          </QuestionCard>
        );

      case 'review':
        return (
          <QuestionCard
            icon={<CheckCircle2 className="h-7 w-7 text-emerald-500" />}
            iconGradient="from-emerald-500/20 to-teal-500/10"
            question="Ready to build your portfolio!"
            subtitle="Review your profile and let our AI create your optimized portfolio"
            onNext={handleComplete}
            onBack={goBack}
            nextLabel="Generate My Portfolio"
            isLastStep={true}
            canProceed={true}
          >
            <Card className="bg-card/50">
              <CardContent className="py-6 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span>Starting Capital</span>
                  </div>
                  <span className="font-bold text-lg">{formatCurrency(capital)}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span>Time Horizon</span>
                  </div>
                  <span className="font-bold">{horizon} years</span>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
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
                
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
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
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">High liquidity preference noted</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </QuestionCard>
        );

      default:
        return null;
    }
  };

  return (
    <QuestionnaireShell
      steps={WIZARD_STEPS}
      currentStepIndex={stepIndex}
      onBack={onBack}
      onStepClick={handleStepClick}
      progress={progress}
      currentStepProgress={`Step ${stepIndex + 1} of ${WIZARD_STEPS.length}`}
      accentColor="purple"
    >
      {renderStepContent()}
    </QuestionnaireShell>
  );
}
