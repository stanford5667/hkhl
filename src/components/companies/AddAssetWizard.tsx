import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Plus, 
  X,
  Building2,
  DollarSign,
  Globe,
  CheckCircle,
  Briefcase,
  TrendingUp,
  Building,
  CreditCard,
  Package,
  Loader2,
  LineChart,
  Search,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppCompany, CompanyStage } from '@/hooks/useAppData';
import { useOrganization, AssetType } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AddAssetWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (company: AppCompany) => void;
  onCreate: (data: Partial<AppCompany>) => Promise<AppCompany | null>;
}

interface WizardForm {
  // Asset type
  assetType: AssetType | '';
  
  // Basic
  name: string;
  website: string;
  industry: string;
  description: string;
  
  // Stage
  stage: CompanyStage | '';
  pipelineStage: string;
  
  // Financials (Private Equity)
  revenue: string;
  ebitda: string;
  
  // Public Equity
  tickerSymbol: string;
  exchange: string;
  currentPrice: number | null;
  marketCap: string;
  sharesOwned: string;
  costBasisTotal: string;
  costBasisPerShare: string;
  
  // Real Estate
  propertyType: string;
  address: string;
  purchasePrice: string;
  currentValue: string;
  noi: string;
}

interface StockQuoteData {
  price: number;
  change: number;
  changePercent: number;
  companyName: string;
  marketCap: string;
  chartData: { time: string; price: number }[];
}

const ASSET_TYPES: { id: AssetType; name: string; description: string; icon: React.ElementType; color: string }[] = [
  { id: 'private_equity', name: 'Private Equity', description: 'Deals, pipeline, and portfolio companies', icon: Briefcase, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'public_equity', name: 'Public Equities', description: 'Stocks and ETFs with live prices', icon: TrendingUp, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'real_estate', name: 'Real Estate', description: 'Properties and REITs', icon: Building, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { id: 'credit', name: 'Credit', description: 'Loans and bonds', icon: CreditCard, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'other', name: 'Other Assets', description: 'Custom asset types', icon: Package, color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
];

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Consumer', 'Industrial', 
  'Financial Services', 'Energy', 'Real Estate', 'Media & Entertainment', 'Other',
];

const PIPELINE_STAGES = [
  { id: 'sourcing', label: 'Sourcing', desc: 'Just identified' },
  { id: 'initial-review', label: 'Initial Review', desc: 'First look' },
  { id: 'deep-dive', label: 'Deep Dive', desc: 'Detailed analysis' },
  { id: 'loi', label: 'LOI', desc: 'Letter of intent' },
  { id: 'due-diligence', label: 'Due Diligence', desc: 'Final verification' },
  { id: 'closing', label: 'Closing', desc: 'Finalizing deal' },
];

const PROPERTY_TYPES = [
  'Office', 'Retail', 'Industrial', 'Multifamily', 
  'Hotel', 'Mixed Use', 'Land', 'Other',
];

const EXCHANGES = ['NYSE', 'NASDAQ', 'LSE', 'TSE', 'Other'];

export function AddAssetWizard({ open, onOpenChange, onComplete, onCreate }: AddAssetWizardProps) {
  const { enabledAssetTypes } = useOrganization();
  const [step, setStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteData, setQuoteData] = useState<StockQuoteData | null>(null);
  
  const [form, setForm] = useState<WizardForm>({
    assetType: '',
    name: '',
    website: '',
    industry: '',
    description: '',
    stage: '',
    pipelineStage: 'sourcing',
    revenue: '',
    ebitda: '',
    tickerSymbol: '',
    exchange: 'NYSE',
    currentPrice: null,
    marketCap: '',
    sharesOwned: '',
    costBasisTotal: '',
    costBasisPerShare: '',
    propertyType: '',
    address: '',
    purchasePrice: '',
    currentValue: '',
    noi: '',
  });

  const availableAssetTypes = ASSET_TYPES.filter(t => enabledAssetTypes.includes(t.id));

  const getTotalSteps = () => {
    switch (form.assetType) {
      case 'private_equity': return 4; // Type, Details, Stage, Financials
      case 'public_equity': return 3;  // Type, Ticker, Holdings
      case 'real_estate': return 3;    // Type, Property, Financials
      default: return 3;               // Type, Details, Financials
    }
  };

  const updateForm = (updates: Partial<WizardForm>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const resetForm = () => {
    setForm({
      assetType: '',
      name: '',
      website: '',
      industry: '',
      description: '',
      stage: '',
      pipelineStage: 'sourcing',
      revenue: '',
      ebitda: '',
      tickerSymbol: '',
      exchange: 'NYSE',
      currentPrice: null,
      marketCap: '',
      sharesOwned: '',
      costBasisTotal: '',
      costBasisPerShare: '',
      propertyType: '',
      address: '',
      purchasePrice: '',
      currentValue: '',
      noi: '',
    });
    setStep(0);
    setQuoteData(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Fetch stock quote when ticker changes
  const fetchStockQuote = useCallback(async (ticker: string) => {
    if (!ticker || ticker.length < 1) {
      setQuoteData(null);
      return;
    }

    setIsLoadingQuote(true);
    try {
      const { data, error } = await supabase.functions.invoke('stock-quote', {
        body: { ticker: ticker.toUpperCase() }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setQuoteData(data.data);
        updateForm({
          name: data.data.companyName || ticker.toUpperCase(),
          currentPrice: data.data.price,
          marketCap: data.data.marketCap,
          exchange: 'NYSE', // Default, could be improved with real data
        });
        toast.success(`Found ${data.data.companyName}`);
      }
    } catch (e) {
      console.error('Quote fetch error:', e);
      setQuoteData(null);
    } finally {
      setIsLoadingQuote(false);
    }
  }, []);

  // Debounced ticker lookup
  useEffect(() => {
    if (form.assetType !== 'public_equity' || !form.tickerSymbol) return;
    
    const timer = setTimeout(() => {
      if (form.tickerSymbol.length >= 1) {
        fetchStockQuote(form.tickerSymbol);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [form.tickerSymbol, form.assetType, fetchStockQuote]);

  const handleCreate = async () => {
    if (!form.name || !form.assetType) return;

    setIsCreating(true);
    
    const baseData: Partial<AppCompany> = {
      name: form.name,
      website: form.website || null,
      industry: form.industry || null,
      description: form.description || null,
      company_type: form.stage as CompanyStage || 'portfolio',
      pipeline_stage: form.stage === 'pipeline' ? form.pipelineStage : null,
    };

    // Add asset-type specific fields
    const extendedData: any = {
      ...baseData,
      asset_class: form.assetType,
    };

    if (form.assetType === 'private_equity') {
      extendedData.revenue_ltm = form.revenue ? parseFloat(form.revenue) : null;
      extendedData.ebitda_ltm = form.ebitda ? parseFloat(form.ebitda) : null;
    } else if (form.assetType === 'public_equity') {
      extendedData.ticker_symbol = form.tickerSymbol.toUpperCase();
      extendedData.exchange = form.exchange;
      extendedData.current_price = form.currentPrice;
      extendedData.shares_owned = form.sharesOwned ? parseFloat(form.sharesOwned) : null;
      extendedData.cost_basis = form.costBasisTotal ? parseFloat(form.costBasisTotal) : null;
      extendedData.market_value = form.currentPrice && form.sharesOwned 
        ? form.currentPrice * parseFloat(form.sharesOwned) 
        : null;
      extendedData.company_type = 'portfolio'; // Public equities are holdings
    } else if (form.assetType === 'real_estate') {
      extendedData.cost_basis = form.purchasePrice ? parseFloat(form.purchasePrice) : null;
      extendedData.market_value = form.currentValue ? parseFloat(form.currentValue) : null;
      extendedData.ebitda_ltm = form.noi ? parseFloat(form.noi) : null;
      extendedData.company_type = 'portfolio';
    }

    const company = await onCreate(extendedData);
    setIsCreating(false);

    if (company) {
      onComplete(company);
      handleClose();
    }
  };

  const handleAssetTypeSelect = (type: AssetType) => {
    updateForm({ assetType: type });
    setStep(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canProceed()) {
        if (step < getTotalSteps() - 1) {
          setStep(s => s + 1);
        } else {
          handleCreate();
        }
      }
    }
  };

  const canProceed = () => {
    if (step === 0) return form.assetType !== '';
    
    switch (form.assetType) {
      case 'private_equity':
        if (step === 1) return form.name.trim().length > 0;
        if (step === 2) return form.stage !== '';
        return true;
      case 'public_equity':
        if (step === 1) return form.tickerSymbol.length > 0 && quoteData !== null;
        return true;
      case 'real_estate':
        if (step === 1) return form.name.trim().length > 0;
        return true;
      default:
        if (step === 1) return form.name.trim().length > 0;
        return true;
    }
  };

  // Calculate preview values for public equity
  const publicEquityPreview = {
    marketValue: form.currentPrice && form.sharesOwned 
      ? form.currentPrice * parseFloat(form.sharesOwned || '0') 
      : 0,
    costBasis: parseFloat(form.costBasisTotal || '0'),
    gainLoss: 0,
    gainLossPercent: 0,
  };
  publicEquityPreview.gainLoss = publicEquityPreview.marketValue - publicEquityPreview.costBasis;
  publicEquityPreview.gainLossPercent = publicEquityPreview.costBasis > 0 
    ? (publicEquityPreview.gainLoss / publicEquityPreview.costBasis) * 100 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-slate-900 border-slate-800" onKeyDown={handleKeyDown}>
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Add Asset</h2>
            <Button variant="ghost" size="sm" onClick={handleClose} className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress Dots */}
          {form.assetType && (
            <div className="flex items-center gap-2">
              {Array.from({ length: getTotalSteps() }).map((_, i) => (
                <div 
                  key={i}
                  className={cn(
                    "h-2 w-2 rounded-full transition-all",
                    i <= step ? "bg-emerald-500" : "bg-slate-700",
                    i === step && "w-6"
                  )}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-6 min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <StepAssetTypeSelection 
                  availableTypes={availableAssetTypes}
                  onSelect={handleAssetTypeSelect}
                />
              )}
              
              {step > 0 && form.assetType === 'private_equity' && (
                <>
                  {step === 1 && <StepPrivateEquityBasics form={form} updateForm={updateForm} />}
                  {step === 2 && <StepPrivateEquityStage form={form} updateForm={updateForm} />}
                  {step === 3 && <StepPrivateEquityFinancials form={form} updateForm={updateForm} />}
                </>
              )}
              
              {step > 0 && form.assetType === 'public_equity' && (
                <>
                  {step === 1 && (
                    <StepPublicEquityTicker 
                      form={form} 
                      updateForm={updateForm}
                      isLoading={isLoadingQuote}
                      quoteData={quoteData}
                    />
                  )}
                  {step === 2 && (
                    <StepPublicEquityHoldings 
                      form={form} 
                      updateForm={updateForm}
                      quoteData={quoteData}
                      preview={publicEquityPreview}
                    />
                  )}
                </>
              )}
              
              {step > 0 && form.assetType === 'real_estate' && (
                <>
                  {step === 1 && <StepRealEstateProperty form={form} updateForm={updateForm} />}
                  {step === 2 && <StepRealEstateFinancials form={form} updateForm={updateForm} />}
                </>
              )}
              
              {step > 0 && (form.assetType === 'credit' || form.assetType === 'other') && (
                <>
                  {step === 1 && <StepGenericDetails form={form} updateForm={updateForm} />}
                  {step === 2 && <StepGenericFinancials form={form} updateForm={updateForm} />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Footer */}
        {step > 0 && (
          <div className="p-6 border-t border-slate-800 flex justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setStep(s => s - 1)}
              className="text-slate-400 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="border-slate-700 text-slate-300">
                Cancel
              </Button>
              
              {step < getTotalSteps() - 1 ? (
                <Button 
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canProceed()}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  Continue
                </Button>
              ) : (
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-500"
                  onClick={handleCreate}
                  disabled={isCreating || !canProceed()}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Asset
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Step 0: Asset Type Selection
function StepAssetTypeSelection({ 
  availableTypes, 
  onSelect 
}: { 
  availableTypes: typeof ASSET_TYPES;
  onSelect: (type: AssetType) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-white">What type of asset?</h3>
        <p className="text-slate-400 mt-2">Select the asset class to get started</p>
      </div>
      
      <div className="grid gap-3">
        {availableTypes.map((type) => {
          const Icon = type.icon;
          return (
            <motion.button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className={cn(
                "w-full p-4 rounded-xl border text-left transition-all",
                "bg-slate-800/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800",
                "focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              )}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-lg", type.color)}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{type.name}</p>
                  <p className="text-slate-400 text-sm">{type.description}</p>
                </div>
                <ChevronLeft className="h-5 w-5 text-slate-500 rotate-180" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// Private Equity Steps
function StepPrivateEquityBasics({ form, updateForm }: { form: WizardForm; updateForm: (u: Partial<WizardForm>) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
          <Briefcase className="h-6 w-6 text-purple-400" />
        </div>
        <h3 className="text-xl font-bold text-white">Company Details</h3>
        <p className="text-slate-400 mt-2">Basic information about the company</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label className="text-slate-300">Company Name *</Label>
          <Input
            value={form.name}
            onChange={(e) => updateForm({ name: e.target.value })}
            placeholder="e.g., Acme Corp"
            className="mt-1 bg-slate-800 border-slate-700 text-white"
            autoFocus
          />
        </div>
        
        <div>
          <Label className="text-slate-300">Website</Label>
          <div className="flex items-center mt-1">
            <Globe className="h-4 w-4 text-slate-500 mr-2" />
            <Input
              value={form.website}
              onChange={(e) => updateForm({ website: e.target.value })}
              placeholder="https://example.com"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
        </div>
        
        <div>
          <Label className="text-slate-300">Industry</Label>
          <Select value={form.industry} onValueChange={(v) => updateForm({ industry: v })}>
            <SelectTrigger className="mt-1 bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {INDUSTRIES.map(ind => (
                <SelectItem key={ind} value={ind}>{ind}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="text-slate-300">Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => updateForm({ description: e.target.value })}
            placeholder="Brief description..."
            className="mt-1 bg-slate-800 border-slate-700 text-white"
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}

function StepPrivateEquityStage({ form, updateForm }: { form: WizardForm; updateForm: (u: Partial<WizardForm>) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white">Investment Stage</h3>
        <p className="text-slate-400 mt-2">Where is this company in your process?</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Card 
          className={cn(
            "p-4 cursor-pointer transition-all border",
            form.stage === 'pipeline' 
              ? "bg-blue-500/10 border-blue-500" 
              : "bg-slate-800/50 border-slate-700 hover:border-slate-500"
          )}
          onClick={() => updateForm({ stage: 'pipeline', pipelineStage: 'sourcing' })}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <LineChart className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-medium">Pipeline</p>
              <p className="text-slate-400 text-sm">Evaluating</p>
            </div>
          </div>
        </Card>
        
        <Card 
          className={cn(
            "p-4 cursor-pointer transition-all border",
            form.stage === 'portfolio' 
              ? "bg-emerald-500/10 border-emerald-500" 
              : "bg-slate-800/50 border-slate-700 hover:border-slate-500"
          )}
          onClick={() => updateForm({ stage: 'portfolio', pipelineStage: '' })}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-medium">Portfolio</p>
              <p className="text-slate-400 text-sm">Invested</p>
            </div>
          </div>
        </Card>
      </div>
      
      {form.stage === 'pipeline' && (
        <div className="mt-4">
          <Label className="text-slate-300">Pipeline Stage</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {PIPELINE_STAGES.map(stage => (
              <Button
                key={stage.id}
                type="button"
                variant={form.pipelineStage === stage.id ? 'default' : 'outline'}
                className={cn(
                  "h-auto py-2 justify-start text-left",
                  form.pipelineStage === stage.id 
                    ? "bg-blue-600 hover:bg-blue-500 border-blue-600" 
                    : "border-slate-700 text-slate-300 hover:bg-slate-800"
                )}
                onClick={() => updateForm({ pipelineStage: stage.id })}
              >
                <div>
                  <p className="text-sm font-medium">{stage.label}</p>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepPrivateEquityFinancials({ form, updateForm }: { form: WizardForm; updateForm: (u: Partial<WizardForm>) => void }) {
  const margin = form.revenue && form.ebitda 
    ? ((parseFloat(form.ebitda) / parseFloat(form.revenue)) * 100).toFixed(1) 
    : null;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <DollarSign className="h-6 w-6 text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-white">Financials</h3>
        <p className="text-slate-400 mt-2">Key metrics (optional)</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-slate-300">Revenue (LTM)</Label>
          <div className="flex items-center mt-1">
            <span className="text-slate-500 mr-2">$</span>
            <Input
              type="number"
              value={form.revenue}
              onChange={(e) => updateForm({ revenue: e.target.value })}
              placeholder="50"
              className="bg-slate-800 border-slate-700 text-white"
            />
            <span className="text-slate-500 ml-2">M</span>
          </div>
        </div>
        <div>
          <Label className="text-slate-300">EBITDA (LTM)</Label>
          <div className="flex items-center mt-1">
            <span className="text-slate-500 mr-2">$</span>
            <Input
              type="number"
              value={form.ebitda}
              onChange={(e) => updateForm({ ebitda: e.target.value })}
              placeholder="10"
              className="bg-slate-800 border-slate-700 text-white"
            />
            <span className="text-slate-500 ml-2">M</span>
          </div>
        </div>
      </div>
      
      {margin && (
        <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">EBITDA Margin</span>
            <span className="text-emerald-400 font-bold text-lg">{margin}%</span>
          </div>
        </Card>
      )}
    </div>
  );
}

// Public Equity Steps
function StepPublicEquityTicker({ 
  form, 
  updateForm, 
  isLoading,
  quoteData 
}: { 
  form: WizardForm; 
  updateForm: (u: Partial<WizardForm>) => void;
  isLoading: boolean;
  quoteData: StockQuoteData | null;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="h-6 w-6 text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-white">Enter Ticker Symbol</h3>
        <p className="text-slate-400 mt-2">We'll auto-populate the details</p>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
        <Input
          value={form.tickerSymbol}
          onChange={(e) => updateForm({ tickerSymbol: e.target.value.toUpperCase() })}
          placeholder="e.g., AAPL, MSFT, GOOGL"
          className="pl-10 py-6 text-xl font-mono bg-slate-800 border-slate-700 text-white uppercase"
          autoFocus
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400 animate-spin" />
        )}
      </div>
      
      {/* Auto-populated data */}
      <AnimatePresence>
        {quoteData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">Found!</span>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white font-bold text-lg">{quoteData.companyName}</p>
                  <p className="text-slate-400 text-sm">{form.exchange}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-2xl">${quoteData.price.toFixed(2)}</p>
                  <p className={cn(
                    "text-sm",
                    quoteData.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {quoteData.changePercent >= 0 ? '+' : ''}{quoteData.changePercent.toFixed(2)}%
                  </p>
                </div>
              </div>
              
              {/* Mini Chart */}
              {quoteData.chartData && quoteData.chartData.length > 0 && (
                <div className="h-16 flex items-end gap-1">
                  {quoteData.chartData.map((point, i) => {
                    const max = Math.max(...quoteData.chartData.map(p => p.price));
                    const min = Math.min(...quoteData.chartData.map(p => p.price));
                    const range = max - min || 1;
                    const height = ((point.price - min) / range) * 100;
                    
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex-1 rounded-t transition-all",
                          quoteData.changePercent >= 0 ? "bg-emerald-500/50" : "bg-rose-500/50"
                        )}
                        style={{ height: `${Math.max(height, 10)}%` }}
                      />
                    );
                  })}
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-emerald-500/30 flex justify-between text-sm">
                <span className="text-slate-400">Market Cap</span>
                <span className="text-white font-medium">{quoteData.marketCap}</span>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepPublicEquityHoldings({ 
  form, 
  updateForm,
  quoteData,
  preview
}: { 
  form: WizardForm; 
  updateForm: (u: Partial<WizardForm>) => void;
  quoteData: StockQuoteData | null;
  preview: { marketValue: number; costBasis: number; gainLoss: number; gainLossPercent: number };
}) {
  const handleSharesChange = (value: string) => {
    updateForm({ sharesOwned: value });
    // Auto-calculate cost basis total if per-share is set
    if (form.costBasisPerShare) {
      const total = parseFloat(value || '0') * parseFloat(form.costBasisPerShare);
      updateForm({ costBasisTotal: total.toFixed(2) });
    }
  };

  const handleCostBasisPerShareChange = (value: string) => {
    updateForm({ costBasisPerShare: value });
    // Auto-calculate total
    if (form.sharesOwned) {
      const total = parseFloat(form.sharesOwned) * parseFloat(value || '0');
      updateForm({ costBasisTotal: total.toFixed(2) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white">Your Position</h3>
        <p className="text-slate-400 mt-2">How much do you own?</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label className="text-slate-300">Shares Owned</Label>
          <Input
            type="number"
            value={form.sharesOwned}
            onChange={(e) => handleSharesChange(e.target.value)}
            placeholder="100"
            className="mt-1 bg-slate-800 border-slate-700 text-white text-lg"
            autoFocus
          />
        </div>
        
        <div>
          <Label className="text-slate-300">Cost Basis (per share)</Label>
          <div className="flex items-center mt-1">
            <span className="text-slate-500 mr-2">$</span>
            <Input
              type="number"
              value={form.costBasisPerShare}
              onChange={(e) => handleCostBasisPerShareChange(e.target.value)}
              placeholder={quoteData?.price.toFixed(2) || '0'}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
        </div>
        
        <div>
          <Label className="text-slate-300">Total Cost Basis</Label>
          <div className="flex items-center mt-1">
            <span className="text-slate-500 mr-2">$</span>
            <Input
              type="number"
              value={form.costBasisTotal}
              onChange={(e) => updateForm({ costBasisTotal: e.target.value })}
              placeholder="0"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
        </div>
      </div>
      
      {/* Preview */}
      {form.sharesOwned && parseFloat(form.sharesOwned) > 0 && (
        <Card className="p-4 bg-slate-800/50 border-slate-700">
          <h4 className="text-slate-400 text-sm mb-3">Position Preview</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-500 text-xs">Market Value</p>
              <p className="text-white font-bold">${preview.marketValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Gain/Loss</p>
              <p className={cn(
                "font-bold",
                preview.gainLoss >= 0 ? "text-emerald-400" : "text-rose-400"
              )}>
                {preview.gainLoss >= 0 ? '+' : ''}${preview.gainLoss.toLocaleString()}
                <span className="text-sm ml-1">
                  ({preview.gainLossPercent >= 0 ? '+' : ''}{preview.gainLossPercent.toFixed(1)}%)
                </span>
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// Real Estate Steps
function StepRealEstateProperty({ form, updateForm }: { form: WizardForm; updateForm: (u: Partial<WizardForm>) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
          <Building className="h-6 w-6 text-amber-400" />
        </div>
        <h3 className="text-xl font-bold text-white">Property Details</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label className="text-slate-300">Property Name *</Label>
          <Input
            value={form.name}
            onChange={(e) => updateForm({ name: e.target.value })}
            placeholder="e.g., Main Street Office Building"
            className="mt-1 bg-slate-800 border-slate-700 text-white"
            autoFocus
          />
        </div>
        
        <div>
          <Label className="text-slate-300">Property Type</Label>
          <Select value={form.propertyType} onValueChange={(v) => updateForm({ propertyType: v, industry: v })}>
            <SelectTrigger className="mt-1 bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {PROPERTY_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="text-slate-300">Address</Label>
          <Textarea
            value={form.address}
            onChange={(e) => updateForm({ address: e.target.value, description: e.target.value })}
            placeholder="Full property address"
            className="mt-1 bg-slate-800 border-slate-700 text-white"
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}

function StepRealEstateFinancials({ form, updateForm }: { form: WizardForm; updateForm: (u: Partial<WizardForm>) => void }) {
  const capRate = form.noi && form.currentValue 
    ? ((parseFloat(form.noi) / parseFloat(form.currentValue)) * 100).toFixed(2) 
    : null;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white">Property Financials</h3>
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-300">Purchase Price</Label>
            <div className="flex items-center mt-1">
              <span className="text-slate-500 mr-2">$</span>
              <Input
                type="number"
                value={form.purchasePrice}
                onChange={(e) => updateForm({ purchasePrice: e.target.value })}
                placeholder="0"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          <div>
            <Label className="text-slate-300">Current Value</Label>
            <div className="flex items-center mt-1">
              <span className="text-slate-500 mr-2">$</span>
              <Input
                type="number"
                value={form.currentValue}
                onChange={(e) => updateForm({ currentValue: e.target.value })}
                placeholder="0"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
        </div>
        
        <div>
          <Label className="text-slate-300">NOI (Annual)</Label>
          <div className="flex items-center mt-1">
            <span className="text-slate-500 mr-2">$</span>
            <Input
              type="number"
              value={form.noi}
              onChange={(e) => updateForm({ noi: e.target.value })}
              placeholder="0"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
        </div>
      </div>
      
      {capRate && (
        <Card className="p-4 bg-amber-500/10 border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Cap Rate</span>
            <span className="text-amber-400 font-bold text-lg">{capRate}%</span>
          </div>
        </Card>
      )}
    </div>
  );
}

// Generic Steps (for Credit and Other)
function StepGenericDetails({ form, updateForm }: { form: WizardForm; updateForm: (u: Partial<WizardForm>) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white">Asset Details</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label className="text-slate-300">Asset Name *</Label>
          <Input
            value={form.name}
            onChange={(e) => updateForm({ name: e.target.value })}
            placeholder="e.g., Corporate Bond XYZ"
            className="mt-1 bg-slate-800 border-slate-700 text-white"
            autoFocus
          />
        </div>
        
        <div>
          <Label className="text-slate-300">Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => updateForm({ description: e.target.value })}
            placeholder="Details about this asset..."
            className="mt-1 bg-slate-800 border-slate-700 text-white"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}

function StepGenericFinancials({ form, updateForm }: { form: WizardForm; updateForm: (u: Partial<WizardForm>) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white">Financials</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-slate-300">Cost Basis</Label>
          <div className="flex items-center mt-1">
            <span className="text-slate-500 mr-2">$</span>
            <Input
              type="number"
              value={form.costBasisTotal}
              onChange={(e) => updateForm({ costBasisTotal: e.target.value })}
              placeholder="0"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
        </div>
        <div>
          <Label className="text-slate-300">Current Value</Label>
          <div className="flex items-center mt-1">
            <span className="text-slate-500 mr-2">$</span>
            <Input
              type="number"
              value={form.currentValue}
              onChange={(e) => updateForm({ currentValue: e.target.value })}
              placeholder="0"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Re-export the old name for backwards compatibility
export { AddAssetWizard as CompanyCreationWizard };
