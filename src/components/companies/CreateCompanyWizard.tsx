import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgId } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  ArrowLeft, ArrowRight, Building2, Check, FileText, Loader2, 
  Sparkles, Upload, X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileUploadZone, UploadFile } from './FileUploadZone';
import { triggerDocumentProcessing } from '@/hooks/useAppData';

interface CreateCompanyWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (companyId: string) => void;
}

const INDUSTRIES = [
  'Healthcare', 'Technology', 'Manufacturing', 'Business Services',
  'Consumer', 'Financial Services', 'Energy', 'Real Estate',
  'Transportation', 'Education', 'Retail', 'Other'
];

const STAGES = [
  { value: 'sourcing', label: 'Sourcing' },
  { value: 'initial_review', label: 'Initial Review' },
  { value: 'management_meeting', label: 'Management Meeting' },
  { value: 'due_diligence', label: 'Due Diligence' },
  { value: 'loi', label: 'LOI' },
  { value: 'closing', label: 'Closing' },
  { value: 'passed', label: 'Passed' },
];

const SOURCES = [
  'Banker/Broker', 'Direct Outreach', 'Referral', 'Conference', 'Other'
];

const STEPS = [
  { id: 1, name: 'Basic Info', icon: Building2 },
  { id: 2, name: 'Details', icon: FileText },
  { id: 3, name: 'Data Room', icon: Upload },
  { id: 4, name: 'AI Analysis', icon: Sparkles },
  { id: 5, name: 'Review', icon: Check },
];

interface WizardData {
  // Step 1
  name: string;
  website: string;
  industry: string;
  stage: string;
  source: string;
  // Step 2
  description: string;
  yearFounded: string;
  headquarters: string;
  employeeCount: string;
  revenueLtm: string;
  ebitdaLtm: string;
  // Step 3
  uploadFiles: UploadFile[];
  // Step 4/5
  extractedData: Record<string, any>;
  aiSummary: string;
}

interface CompanySuggestion {
  name: string;
  industry: string;
  hint?: string;
}

export function CreateCompanyWizard({ open, onOpenChange, onComplete }: CreateCompanyWizardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const orgId = useOrgId();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<WizardData>({
    name: '',
    website: '',
    industry: '',
    stage: 'sourcing',
    source: '',
    description: '',
    yearFounded: '',
    headquarters: '',
    employeeCount: '',
    revenueLtm: '',
    ebitdaLtm: '',
    uploadFiles: [],
    extractedData: {},
    aiSummary: '',
  });

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const lastLookedUpName = useRef<string>('');

  const updateData = (updates: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  // Auto-fill company info when name changes (debounced 500ms)
  useEffect(() => {
    if (data.name.trim().length < 3) {
      return;
    }

    // Don't re-lookup the same name
    if (data.name.trim().toLowerCase() === lastLookedUpName.current.toLowerCase()) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsAutoFilling(true);
      lastLookedUpName.current = data.name.trim();
      try {
        const { data: result, error } = await supabase.functions.invoke('lookup-company', {
          body: { companyName: data.name.trim() }
        });

        if (!error && result?.success && result?.data) {
          const updates: Partial<WizardData> = {};
          const filled = new Set<string>();

          if (result.data.website && !data.website) {
            updates.website = result.data.website;
            filled.add('website');
          }
          if (result.data.industry) {
            const matchedIndustry = INDUSTRIES.find(ind => 
              result.data.industry.toLowerCase().includes(ind.toLowerCase()) ||
              ind.toLowerCase().includes(result.data.industry.toLowerCase())
            );
            if (matchedIndustry && !data.industry) {
              updates.industry = matchedIndustry;
              filled.add('industry');
            }
          }
          if (result.data.description && !data.description) {
            updates.description = result.data.description;
            filled.add('description');
          }
          if (result.data.headquarters && !data.headquarters) {
            updates.headquarters = result.data.headquarters;
            filled.add('headquarters');
          }
          if (result.data.founded && !data.yearFounded) {
            updates.yearFounded = String(result.data.founded);
            filled.add('yearFounded');
          }

          if (Object.keys(updates).length > 0) {
            updateData(updates);
            setAutoFilledFields(filled);
            toast.success('Found company info!', { duration: 2000 });
          }
        }
      } catch (e) {
        console.error('Auto-fill error:', e);
      } finally {
        setIsAutoFilling(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [data.name]);

  // Debounced suggestion fetch (for dropdown)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (data.name.length >= 2 && !isAutoFilling) {
        setIsLoadingSuggestions(true);
        try {
          const { data: result } = await supabase.functions.invoke('suggest-companies', {
            body: { query: data.name }
          });
          if (result?.suggestions) {
            setSuggestions(result.suggestions);
            setShowSuggestions(true);
          }
        } catch (e) {
          console.error('Suggestion error:', e);
        } finally {
          setIsLoadingSuggestions(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [data.name, isAutoFilling]);

  // Click-outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clearAutoFilled = (field: string) => {
    const newSet = new Set(autoFilledFields);
    newSet.delete(field);
    setAutoFilledFields(newSet);
  };

  // Select a suggestion and trigger auto-fill
  const selectSuggestion = (name: string) => {
    updateData({ name });
    setShowSuggestions(false);
    lastLookedUpName.current = ''; // Reset to trigger lookup for the selected name
  };

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleClose = () => {
    if (data.name && !confirm('You have unsaved changes. Are you sure you want to close?')) {
      return;
    }
    onOpenChange(false);
    setCurrentStep(1);
    setAutoFilledFields(new Set());
    setSuggestions([]);
    lastLookedUpName.current = '';
    setData({
      name: '', website: '', industry: '', stage: 'sourcing', source: '',
      description: '', yearFounded: '', headquarters: '', employeeCount: '',
      revenueLtm: '', ebitdaLtm: '', uploadFiles: [], extractedData: {}, aiSummary: '',
    });
  };

  const handleCreateCompany = async () => {
    if (!user || !orgId) {
      toast.error('You must be logged in and have an organization selected');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Create the company
      const { data: company, error } = await supabase
        .from('companies')
        .insert({
          name: data.name,
          website: data.website || null,
          industry: data.industry || null,
          pipeline_stage: data.stage,
          description: data.description || null,
          revenue_ltm: data.revenueLtm ? parseFloat(data.revenueLtm) : null,
          ebitda_ltm: data.ebitdaLtm ? parseFloat(data.ebitdaLtm) : null,
          user_id: user.id,
          organization_id: orgId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Upload documents if any
      if (data.uploadFiles.length > 0) {
        toast.info(`Uploading ${data.uploadFiles.length} documents...`);
        
        for (const item of data.uploadFiles) {
          const { file, documentType } = item;
          const timestamp = Date.now();
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filePath = `${orgId}/${company.id}/${timestamp}_${safeName}`;
          
          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file);
          
          if (uploadError) {
            console.error('Upload failed:', uploadError);
            continue;
          }
          
          // Create document record
          await supabase.from('documents').insert({
            company_id: company.id,
            user_id: user.id,
            organization_id: orgId,
            name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.name.split('.').pop()?.toLowerCase(),
            document_type: documentType,
            processing_status: 'pending',
            folder: 'General'
          });
        }
        
        // 3. Trigger AI processing
        toast.info('Starting AI analysis...');
        triggerDocumentProcessing(company.id);
      }

      toast.success('Company created successfully!');
      onOpenChange(false);
      onComplete?.(company.id);
      navigate(`/portfolio/${company.id}`);
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Failed to create company');
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return data.name.trim() && data.industry;
      case 2: return true; // Optional step
      case 3: return true; // Optional step
      case 4: return true; // Auto-proceeds
      case 5: return true;
      default: return false;
    }
  };

  const AIBadge = () => (
    <Badge className="bg-purple-500/20 text-purple-300 text-xs border-0 gap-1">
      <Sparkles className="h-3 w-3" />
      AI
    </Badge>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl bg-slate-900 border-slate-800 p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Add Company</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                  disabled={step.id > currentStep}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors',
                    currentStep === step.id 
                      ? 'bg-purple-500/20 text-purple-400' 
                      : step.id < currentStep
                        ? 'text-slate-300 hover:bg-slate-800 cursor-pointer'
                        : 'text-slate-600 cursor-not-allowed'
                  )}
                >
                  <step.icon className="h-4 w-4" />
                  <span className="text-sm font-medium hidden sm:inline">{step.name}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    'w-8 h-px mx-2',
                    step.id < currentStep ? 'bg-purple-500' : 'bg-slate-700'
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px] max-h-[60vh] overflow-y-auto">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">Let's start with the basics</h3>
                <p className="text-sm text-slate-400">Enter the company name and key details</p>
              </div>

              <div className="space-y-4">
                {/* Company Name Input with Auto-Fill */}
                <div className="space-y-2 relative" ref={suggestionsRef}>
                  <Label className="text-slate-300">Company Name *</Label>
                  <div className="relative">
                    <Input
                      value={data.name}
                      onChange={e => {
                        updateData({ name: e.target.value });
                        setAutoFilledFields(new Set());
                      }}
                      onFocus={() => data.name.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
                      placeholder="Enter company name..."
                      className="bg-slate-800 border-slate-700 text-white text-lg"
                    />
                    {isAutoFilling && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                      </div>
                    )}
                  </div>
                  {isAutoFilling && (
                    <p className="text-xs text-purple-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Looking up company info...
                    </p>
                  )}
                  
                  {/* Suggestions Dropdown */}
                  {showSuggestions && data.name.length >= 2 && !isAutoFilling && (
                    <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
                      {isLoadingSuggestions ? (
                        <div className="p-4 text-center text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          Finding suggestions...
                        </div>
                      ) : suggestions.length > 0 ? (
                        <>
                          {suggestions.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => selectSuggestion(s.name)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-700/50 border-b border-slate-700/50 last:border-0"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-white font-medium">{s.name}</p>
                                  {s.hint && <p className="text-slate-400 text-sm">{s.hint}</p>}
                                </div>
                                <Badge variant="outline" className="text-slate-400 border-slate-600 text-xs">
                                  {s.industry}
                                </Badge>
                              </div>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setShowSuggestions(false)}
                            className="w-full px-4 py-2 text-purple-400 hover:bg-slate-700/50 text-sm border-t border-slate-700"
                          >
                            Continue with "{data.name}" →
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowSuggestions(false)}
                          className="w-full px-4 py-3 text-slate-400 hover:bg-slate-700/50"
                        >
                          Continue with "{data.name}" →
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Website with AI badge */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-slate-300">Website</Label>
                    {autoFilledFields.has('website') && <AIBadge />}
                  </div>
                  <Input
                    value={data.website}
                    onChange={e => {
                      updateData({ website: e.target.value });
                      clearAutoFilled('website');
                    }}
                    placeholder="https://acme.com"
                    className={cn(
                      "bg-slate-800 border-slate-700 text-white",
                      autoFilledFields.has('website') && "ring-1 ring-purple-500/30"
                    )}
                  />
                  <p className="text-xs text-slate-500">We'll try to pull info from here</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Industry with AI badge */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-slate-300">Industry *</Label>
                      {autoFilledFields.has('industry') && <AIBadge />}
                    </div>
                    <Select 
                      value={data.industry} 
                      onValueChange={val => {
                        updateData({ industry: val });
                        clearAutoFilled('industry');
                      }}
                    >
                      <SelectTrigger className={cn(
                        "bg-slate-800 border-slate-700 text-white",
                        autoFilledFields.has('industry') && "ring-1 ring-purple-500/30"
                      )}>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {INDUSTRIES.map(ind => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Stage *</Label>
                    <Select value={data.stage} onValueChange={val => updateData({ stage: val })}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {STAGES.map(stage => (
                          <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">How did you hear about this company?</Label>
                  <Select value={data.source} onValueChange={val => updateData({ source: val })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {SOURCES.map(src => (
                        <SelectItem key={src} value={src}>{src}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">Tell us more about the opportunity</h3>
                <p className="text-sm text-slate-400">These details help with analysis (all optional)</p>
              </div>

              <div className="space-y-4">
                {/* Description with AI badge */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-slate-300">Business Description</Label>
                    {autoFilledFields.has('description') && <AIBadge />}
                  </div>
                  <Textarea
                    value={data.description}
                    onChange={e => {
                      updateData({ description: e.target.value });
                      clearAutoFilled('description');
                    }}
                    placeholder="What does the company do?"
                    rows={3}
                    className={cn(
                      "bg-slate-800 border-slate-700 text-white",
                      autoFilledFields.has('description') && "ring-1 ring-purple-500/30"
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Year Founded with AI badge */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-slate-300">Year Founded</Label>
                      {autoFilledFields.has('yearFounded') && <AIBadge />}
                    </div>
                    <Input
                      type="number"
                      value={data.yearFounded}
                      onChange={e => {
                        updateData({ yearFounded: e.target.value });
                        clearAutoFilled('yearFounded');
                      }}
                      placeholder="2010"
                      className={cn(
                        "bg-slate-800 border-slate-700 text-white",
                        autoFilledFields.has('yearFounded') && "ring-1 ring-purple-500/30"
                      )}
                    />
                  </div>

                  {/* Headquarters with AI badge */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-slate-300">Headquarters</Label>
                      {autoFilledFields.has('headquarters') && <AIBadge />}
                    </div>
                    <Input
                      value={data.headquarters}
                      onChange={e => {
                        updateData({ headquarters: e.target.value });
                        clearAutoFilled('headquarters');
                      }}
                      placeholder="New York, NY"
                      className={cn(
                        "bg-slate-800 border-slate-700 text-white",
                        autoFilledFields.has('headquarters') && "ring-1 ring-purple-500/30"
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Employee Count</Label>
                  <Select value={data.employeeCount} onValueChange={val => updateData({ employeeCount: val })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="1-10">1-10</SelectItem>
                      <SelectItem value="11-50">11-50</SelectItem>
                      <SelectItem value="51-200">51-200</SelectItem>
                      <SelectItem value="201-500">201-500</SelectItem>
                      <SelectItem value="500+">500+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">LTM Revenue ($M)</Label>
                    <Input
                      type="number"
                      value={data.revenueLtm}
                      onChange={e => updateData({ revenueLtm: e.target.value })}
                      placeholder="25"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">LTM EBITDA ($M)</Label>
                    <Input
                      type="number"
                      value={data.ebitdaLtm}
                      onChange={e => updateData({ ebitdaLtm: e.target.value })}
                      placeholder="5"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Data Room */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">Upload Documents (Optional)</h3>
                <p className="text-sm text-slate-400">
                  Upload CIMs, financials, or other documents to auto-populate company data
                </p>
              </div>

              <FileUploadZone
                files={data.uploadFiles}
                onChange={(files) => updateData({ uploadFiles: files })}
                maxFiles={10}
                maxSizeMB={50}
              />

              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <p className="text-sm text-purple-300">
                  <Sparkles className="h-4 w-4 inline mr-2" />
                  After creation, our AI will analyze these documents to extract key metrics, 
                  company info, and generate investment summaries.
                </p>
              </div>

              <p className="text-sm text-slate-500 text-center">
                You can skip this and add documents later
              </p>
            </div>
          )}

          {/* Step 4: AI Analysis */}
          {currentStep === 4 && (
            <div className="space-y-6 text-center py-8">
              <Sparkles className="h-16 w-16 text-purple-400 mx-auto animate-pulse" />
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Ready to Create</h3>
                <p className="text-sm text-slate-400">
                  {data.uploadFiles.length > 0 
                    ? `${data.uploadFiles.length} documents ready for AI analysis`
                    : 'No documents uploaded - you can add them later'}
                </p>
              </div>
              
              <div className="max-w-sm mx-auto space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Company profile will be created</span>
                </div>
                {data.uploadFiles.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span>Documents will be stored in data room</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span>AI will extract key metrics & generate summary</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">Review your company</h3>
                <p className="text-sm text-slate-400">Confirm the details before creating</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-slate-800/50">
                    <h4 className="text-sm font-medium text-slate-400 mb-3">Company Info</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Name</span>
                        <span className="text-white font-medium">{data.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Industry</span>
                        <div className="flex items-center gap-2">
                          {autoFilledFields.has('industry') && <AIBadge />}
                          <span className="text-white">{data.industry}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Stage</span>
                        <Badge variant="outline" className="text-purple-400 border-purple-400/50">
                          {STAGES.find(s => s.value === data.stage)?.label}
                        </Badge>
                      </div>
                      {data.website && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Website</span>
                          <div className="flex items-center gap-2">
                            {autoFilledFields.has('website') && <AIBadge />}
                            <span className="text-white truncate max-w-[150px]">{data.website}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {(data.revenueLtm || data.ebitdaLtm) && (
                    <div className="p-4 rounded-lg bg-slate-800/50">
                      <h4 className="text-sm font-medium text-slate-400 mb-3">Financials</h4>
                      <div className="space-y-2">
                        {data.revenueLtm && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Revenue</span>
                            <span className="text-white">${data.revenueLtm}M</span>
                          </div>
                        )}
                        {data.ebitdaLtm && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">EBITDA</span>
                            <span className="text-white">${data.ebitdaLtm}M</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {data.uploadFiles.length > 0 && (
                    <div className="p-4 rounded-lg bg-slate-800/50">
                      <h4 className="text-sm font-medium text-slate-400 mb-3">Documents</h4>
                      <p className="text-white">{data.uploadFiles.length} files ready to upload</p>
                    </div>
                  )}
                </div>
              </div>

              {data.description && (
                <div className="p-4 rounded-lg bg-slate-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-medium text-slate-400">Description</h4>
                    {autoFilledFields.has('description') && <AIBadge />}
                  </div>
                  <p className="text-slate-300">{data.description}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-800">
          <Button 
            variant="ghost" 
            onClick={currentStep === 1 ? handleClose : handleBack}
            className="text-slate-400"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep < 5 ? (
            <Button 
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-purple-600 hover:bg-purple-500"
            >
              {currentStep === 3 && data.uploadFiles.length === 0 ? 'Skip' : 'Continue'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleCreateCompany}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-500"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create Company
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
