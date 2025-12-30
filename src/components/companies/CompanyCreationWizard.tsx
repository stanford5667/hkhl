import { useState } from 'react';
import { 
  Target, 
  Briefcase, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X,
  Building2,
  DollarSign,
  Globe,
  CheckCircle,
  Users
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
import { cn } from '@/lib/utils';

interface CompanyCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (company: AppCompany) => void;
  onCreate: (data: Partial<AppCompany>) => Promise<AppCompany | null>;
}

interface WizardForm {
  // Basic
  name: string;
  website: string;
  industry: string;
  description: string;
  
  // Stage
  stage: CompanyStage | '';
  pipelineStage: string;
  
  // Financials
  revenue: string;
  ebitda: string;
}

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Consumer',
  'Industrial',
  'Financial Services',
  'Energy',
  'Real Estate',
  'Media & Entertainment',
  'Other',
];

const PIPELINE_STAGES = [
  { id: 'sourcing', label: 'Sourcing', desc: 'Just identified' },
  { id: 'initial-review', label: 'Initial Review', desc: 'First look' },
  { id: 'deep-dive', label: 'Deep Dive', desc: 'Detailed analysis' },
  { id: 'loi', label: 'LOI', desc: 'Letter of intent' },
  { id: 'due-diligence', label: 'Due Diligence', desc: 'Final verification' },
  { id: 'closing', label: 'Closing', desc: 'Finalizing deal' },
];

export function CompanyCreationWizard({ open, onOpenChange, onComplete, onCreate }: CompanyCreationWizardProps) {
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<WizardForm>({
    name: '',
    website: '',
    industry: '',
    description: '',
    stage: '',
    pipelineStage: 'sourcing',
    revenue: '',
    ebitda: '',
  });

  const totalSteps = 4;

  const updateForm = (updates: Partial<WizardForm>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const resetForm = () => {
    setForm({
      name: '',
      website: '',
      industry: '',
      description: '',
      stage: '',
      pipelineStage: 'sourcing',
      revenue: '',
      ebitda: '',
    });
    setStep(1);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleCreate = async () => {
    if (!form.name || !form.stage) return;

    setIsCreating(true);
    const company = await onCreate({
      name: form.name,
      website: form.website || null,
      industry: form.industry || null,
      description: form.description || null,
      company_type: form.stage as CompanyStage,
      pipeline_stage: form.stage === 'pipeline' ? form.pipelineStage : null,
      revenue_ltm: form.revenue ? parseFloat(form.revenue) : null,
      ebitda_ltm: form.ebitda ? parseFloat(form.ebitda) : null,
    });
    setIsCreating(false);

    if (company) {
      onComplete(company);
      handleClose();
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return form.name.trim().length > 0;
      case 2:
        return form.stage !== '';
      case 3:
        return true; // Financials are optional
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Add New Company</h2>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress */}
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div 
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all",
                  i < step ? "bg-emerald-500" : "bg-muted"
                )}
              />
            ))}
          </div>
          <p className="text-muted-foreground text-sm mt-2">Step {step} of {totalSteps}</p>
        </div>
        
        {/* Content */}
        <div className="p-6 min-h-[350px]">
          {step === 1 && <StepBasicInfo form={form} updateForm={updateForm} />}
          {step === 2 && <StepStageSelection form={form} updateForm={updateForm} />}
          {step === 3 && <StepFinancials form={form} updateForm={updateForm} />}
          {step === 4 && <StepReview form={form} />}
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-between">
          <Button 
            variant="ghost" 
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            
            {step < totalSteps ? (
              <Button 
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button 
                className="bg-emerald-600 hover:bg-emerald-500"
                onClick={handleCreate}
                disabled={isCreating}
              >
                <Plus className="h-4 w-4 mr-1" />
                {isCreating ? 'Creating...' : 'Create Company'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Step 1: Basic Info
function StepBasicInfo({ form, updateForm }: { form: WizardForm; updateForm: (u: Partial<WizardForm>) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-xl font-bold text-foreground">Company Basics</h3>
        <p className="text-muted-foreground mt-2">Tell us about this company</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Company Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => updateForm({ name: e.target.value })}
            placeholder="e.g., Acme Corp"
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="website">Website</Label>
          <div className="flex items-center mt-1">
            <Globe className="h-4 w-4 text-muted-foreground mr-2" />
            <Input
              id="website"
              value={form.website}
              onChange={(e) => updateForm({ website: e.target.value })}
              placeholder="https://example.com"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="industry">Industry</Label>
          <Select value={form.industry} onValueChange={(v) => updateForm({ industry: v })}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map(ind => (
                <SelectItem key={ind} value={ind}>{ind}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => updateForm({ description: e.target.value })}
            placeholder="Brief description of the company..."
            className="mt-1"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}

// Step 2: Stage Selection
function StepStageSelection({ form, updateForm }: { form: WizardForm; updateForm: (u: Partial<WizardForm>) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-foreground">What type of company is this?</h3>
        <p className="text-muted-foreground mt-2">This determines where the company appears and what data we collect</p>
      </div>
      
      {/* Main Stage Selection */}
      <div className="grid grid-cols-2 gap-4">
        <Card 
          className={cn(
            "p-6 cursor-pointer transition-all",
            form.stage === 'pipeline' 
              ? "bg-blue-900/20 border-blue-500" 
              : "bg-card border-border hover:border-muted-foreground"
          )}
          onClick={() => updateForm({ stage: 'pipeline', pipelineStage: 'sourcing' })}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Target className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-foreground font-medium">Pipeline Deal</p>
              <p className="text-muted-foreground text-sm">Evaluating for investment</p>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            Track this opportunity through your deal pipeline from sourcing to closing.
          </p>
          {form.stage === 'pipeline' && (
            <div className="mt-4 pt-4 border-t border-blue-800">
              <CheckCircle className="h-5 w-5 text-blue-400" />
            </div>
          )}
        </Card>
        
        <Card 
          className={cn(
            "p-6 cursor-pointer transition-all",
            form.stage === 'portfolio' 
              ? "bg-emerald-900/20 border-emerald-500" 
              : "bg-card border-border hover:border-muted-foreground"
          )}
          onClick={() => updateForm({ stage: 'portfolio', pipelineStage: '' })}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-600/20 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-foreground font-medium">Portfolio Company</p>
              <p className="text-muted-foreground text-sm">Already invested</p>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            Track performance, monitor health, and manage an existing investment.
          </p>
          {form.stage === 'portfolio' && (
            <div className="mt-4 pt-4 border-t border-emerald-800">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
          )}
        </Card>
      </div>
      
      {/* Pipeline Sub-Stage */}
      {form.stage === 'pipeline' && (
        <div className="mt-6">
          <Label>Where in the pipeline?</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {PIPELINE_STAGES.map(stage => (
              <Button
                key={stage.id}
                type="button"
                variant={form.pipelineStage === stage.id ? 'default' : 'outline'}
                className={cn(
                  "h-auto py-3 justify-start",
                  form.pipelineStage === stage.id && "bg-blue-600 hover:bg-blue-500"
                )}
                onClick={() => updateForm({ pipelineStage: stage.id })}
              >
                <div className="text-left">
                  <p className="font-medium">{stage.label}</p>
                  <p className="text-xs opacity-75">{stage.desc}</p>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Step 3: Financials
function StepFinancials({ form, updateForm }: { form: WizardForm; updateForm: (u: Partial<WizardForm>) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <DollarSign className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-foreground">Financial Overview</h3>
        <p className="text-muted-foreground mt-2">Add key financial metrics (optional)</p>
      </div>
      
      <Card className="p-4 bg-muted/30 border-border">
        <h4 className="text-foreground font-medium mb-4">Key Metrics</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="revenue">Revenue (LTM)</Label>
            <div className="flex items-center mt-1">
              <span className="text-muted-foreground mr-2">$</span>
              <Input
                id="revenue"
                type="number"
                value={form.revenue}
                onChange={(e) => updateForm({ revenue: e.target.value })}
                placeholder="50"
              />
              <span className="text-muted-foreground ml-2">M</span>
            </div>
          </div>
          <div>
            <Label htmlFor="ebitda">EBITDA (LTM)</Label>
            <div className="flex items-center mt-1">
              <span className="text-muted-foreground mr-2">$</span>
              <Input
                id="ebitda"
                type="number"
                value={form.ebitda}
                onChange={(e) => updateForm({ ebitda: e.target.value })}
                placeholder="10"
              />
              <span className="text-muted-foreground ml-2">M</span>
            </div>
          </div>
        </div>
        
        {form.revenue && form.ebitda && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-muted-foreground text-sm">Calculated Margin</p>
            <p className="text-emerald-400 text-lg font-medium">
              {((parseFloat(form.ebitda) / parseFloat(form.revenue)) * 100).toFixed(1)}%
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

// Step 4: Review
function StepReview({ form }: { form: WizardForm }) {
  const stageLabel = form.stage === 'pipeline' ? 'Pipeline' : 'Portfolio';
  const pipelineLabel = PIPELINE_STAGES.find(s => s.id === form.pipelineStage)?.label;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-foreground">Review & Create</h3>
        <p className="text-muted-foreground mt-2">
          {form.stage === 'pipeline' 
            ? "This company will be added to your pipeline" 
            : "This company will be added to your portfolio"
          }
        </p>
      </div>
      
      {/* Stage Badge */}
      <div className="flex justify-center">
        {form.stage === 'pipeline' ? (
          <Badge className="bg-blue-600 text-lg px-4 py-1">
            <Target className="h-4 w-4 mr-2" />
            Pipeline → {pipelineLabel}
          </Badge>
        ) : (
          <Badge className="bg-emerald-600 text-lg px-4 py-1">
            <Briefcase className="h-4 w-4 mr-2" />
            Portfolio Company
          </Badge>
        )}
      </div>
      
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-muted/30 border-border">
          <h4 className="text-muted-foreground text-sm mb-2">Company</h4>
          <p className="text-foreground font-medium">{form.name}</p>
          <p className="text-muted-foreground text-sm">
            {form.industry || 'No industry'} 
            {form.website && ` • ${form.website}`}
          </p>
        </Card>
        
        <Card className="p-4 bg-muted/30 border-border">
          <h4 className="text-muted-foreground text-sm mb-2">Financials</h4>
          <p className="text-foreground">
            {form.revenue ? `$${form.revenue}M Revenue` : 'No revenue data'}
          </p>
          <p className="text-muted-foreground text-sm">
            {form.ebitda ? `$${form.ebitda}M EBITDA` : 'No EBITDA data'}
          </p>
        </Card>
      </div>
      
      {form.description && (
        <Card className="p-4 bg-muted/30 border-border">
          <h4 className="text-muted-foreground text-sm mb-2">Description</h4>
          <p className="text-foreground text-sm">{form.description}</p>
        </Card>
      )}
    </div>
  );
}
