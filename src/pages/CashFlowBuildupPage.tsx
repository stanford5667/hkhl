import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, Loader2, CheckCircle, AlertTriangle, MessageSquare, Sparkles, Building2 } from 'lucide-react';
import { CashFlowBuildup } from '@/components/models/CashFlowBuildup';
import { CompanySelector } from '@/components/models/CompanySelector';
import { useCompanies, Company } from '@/hooks/useCompanies';
import { useModels } from '@/hooks/useModels';
import { useDocuments } from '@/hooks/useDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Step = 'upload' | 'review' | 'interview' | 'model';

interface ExtractedData {
  success: boolean;
  company_name: string;
  currency: string;
  units: string;
  historical_years: string[];
  income_statement: {
    revenue: Record<string, number>;
    ebitda: Record<string, number>;
    cogs?: Record<string, number>;
    gross_profit?: Record<string, number>;
    depreciation_amortization?: Record<string, number>;
    operating_income?: Record<string, number>;
    net_income?: Record<string, number>;
  };
  balance_sheet: {
    cash?: Record<string, number>;
    accounts_receivable?: Record<string, number>;
    inventory?: Record<string, number>;
    accounts_payable?: Record<string, number>;
  };
  calculated_metrics: {
    ebitda_margin_pct?: Record<string, number>;
    avg_revenue_growth?: number;
    yoy_revenue_growth?: number;
    latest_revenue?: number;
    latest_ebitda?: number;
    dso_days?: number;
    dio_days?: number;
    dpo_days?: number;
  };
  data_quality?: {
    completeness_score: string;
    missing_items: string[];
    assumptions_made: string[];
    excluded_projections?: string[];
  };
}

interface GeneratedAssumptions {
  revenue_growth: number;
  ebitda_margin: number;
  capex_pct: number;
  nwc_pct: number;
  tax_rate: number;
  da_pct: number;
  interest_rate: number;
}

const interviewQuestions = [
  {
    id: 'growth_outlook',
    question: 'What is management\'s revenue growth outlook for the next 3-5 years?',
    placeholder: 'e.g., Expecting 10-15% annual growth driven by new product launches and market expansion...'
  },
  {
    id: 'margin_drivers',
    question: 'What are the key drivers for EBITDA margin improvement or pressure?',
    placeholder: 'e.g., Operational efficiencies should improve margins by 200bps, but raw material costs are a headwind...'
  },
  {
    id: 'capex_plans',
    question: 'What are the capital expenditure requirements over the projection period?',
    placeholder: 'e.g., Maintenance capex of ~3% revenue, plus $20M growth investment in Year 2 for new facility...'
  },
  {
    id: 'working_capital',
    question: 'Are there any expected changes to working capital (AR, inventory, AP)?',
    placeholder: 'e.g., Implementing new inventory management system, expect DSO improvement from 45 to 40 days...'
  },
  {
    id: 'debt_structure',
    question: 'What is the current debt structure and expected interest rate?',
    placeholder: 'e.g., $50M senior term loan at SOFR + 300bps, planning to refinance in Year 2...'
  }
];

export default function CashFlowBuildupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companies, loading: companiesLoading, createCompany } = useCompanies();
  const { saveModel, saving } = useModels();
  const { saveDocument } = useDocuments();
  
  const [step, setStep] = useState<Step>('upload');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGeneratingAssumptions, setIsGeneratingAssumptions] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [interviewResponses, setInterviewResponses] = useState<Record<string, string>>({});
  const [generatedAssumptions, setGeneratedAssumptions] = useState<GeneratedAssumptions | null>(null);
  const [assumptionsRationale, setAssumptionsRationale] = useState<Record<string, string>>({});
  const [savedModelId, setSavedModelId] = useState<string | null>(null);
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);

  // Sync company name when company is selected
  const handleSelectCompany = (company: Company | null) => {
    setSelectedCompany(company);
    if (company) {
      setCompanyName(company.name);
    }
  };

  // Handle file upload and extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadedFile(file);
    setIsExtracting(true);

    try {
      let fileContent = '';
      
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          fileContent += `=== Sheet: ${sheetName} ===\n${csv}\n\n`;
        });
      } else {
        fileContent = await file.text();
      }

      console.log('File content preview:', fileContent.substring(0, 500));

      let extracted: ExtractedData | null = null;
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/extract-historical`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_data: fileContent,
            file_name: file.name,
            company_name: companyName || file.name.replace(/\.[^/.]+$/, '')
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            extracted = result;
            console.log('Extracted historical data:', extracted);
          }
        } else if (response.status === 429) {
          toast.error('Rate limit exceeded. Please try again.');
        } else if (response.status === 402) {
          toast.error('AI credits exhausted.');
        }
      } catch (err) {
        console.log('AI extraction failed, using local parser:', err);
      }

      if (!extracted?.success) {
        console.log('Using local extraction fallback');
        extracted = parseFinancialsLocally(fileContent, file.name);
      }

      if (extracted) {
        setExtractedData(extracted);
        if (!companyName && extracted.company_name) {
          setCompanyName(extracted.company_name);
        }
        toast.success('Historical data extracted!');
        setStep('review');
      } else {
        toast.error('Could not extract financial data');
      }

    } catch (error) {
      console.error('Extraction error:', error);
      toast.error('Error processing file');
    } finally {
      setIsExtracting(false);
    }
  };

  // Generate AI assumptions based on interview
  const handleGenerateAssumptions = async () => {
    setIsGeneratingAssumptions(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-assumptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historical_data: extractedData,
          interview_responses: interviewResponses,
          company_name: extractedData?.company_name || companyName
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.assumptions) {
          setGeneratedAssumptions({
            revenue_growth: result.assumptions.revenue_growth * 100,
            ebitda_margin: result.assumptions.ebitda_margin * 100,
            capex_pct: result.assumptions.capex_pct * 100,
            nwc_pct: result.assumptions.nwc_pct * 100,
            tax_rate: result.assumptions.tax_rate * 100,
            da_pct: result.assumptions.da_pct * 100,
            interest_rate: result.assumptions.interest_rate * 100
          });
          setAssumptionsRationale(result.rationale || {});
          toast.success('AI generated projection assumptions!');
          setStep('model');
        }
      } else {
        throw new Error('Failed to generate assumptions');
      }
    } catch (error) {
      console.error('Error generating assumptions:', error);
      toast.error('Failed to generate assumptions. Using defaults.');
      // Use defaults
      setGeneratedAssumptions({
        revenue_growth: 10,
        ebitda_margin: 20,
        capex_pct: 3,
        nwc_pct: 10,
        tax_rate: 25,
        da_pct: 4,
        interest_rate: 8
      });
      setStep('model');
    } finally {
      setIsGeneratingAssumptions(false);
    }
  };

  // Local fallback parser
  const parseFinancialsLocally = (content: string, fileName: string): ExtractedData => {
    const lines = content.split('\n');
    let revenue: Record<string, number> = {};
    let ebitda: Record<string, number> = {};
    let years: string[] = [];

    const yearPattern = /20\d{2}/g;
    for (const line of lines.slice(0, 10)) {
      const matches = line.match(yearPattern);
      if (matches && matches.length >= 2) {
        // Filter out future years (projections)
        const currentYear = new Date().getFullYear();
        const historicalYears = [...new Set(matches)].filter(y => parseInt(y) <= currentYear).sort();
        if (historicalYears.length > 0) {
          years = historicalYears;
          break;
        }
      }
    }

    if (years.length === 0) {
      years = ['2023', '2024'];
    }

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('revenue') || lowerLine.includes('net sales') || lowerLine.includes('total sales')) {
        const numbers = line.match(/[\d,]+\.?\d*/g);
        if (numbers) {
          const cleanNumbers = numbers.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => n > 0 && n < 1000000);
          years.forEach((year, i) => {
            if (cleanNumbers[i]) revenue[year] = cleanNumbers[i];
          });
        }
        break;
      }
    }

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('ebitda')) {
        const numbers = line.match(/[\d,]+\.?\d*/g);
        if (numbers) {
          const cleanNumbers = numbers.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => n > 0 && n < 1000000);
          years.forEach((year, i) => {
            if (cleanNumbers[i]) ebitda[year] = cleanNumbers[i];
          });
        }
        break;
      }
    }

    if (Object.keys(revenue).length === 0) {
      revenue = { '2023': 85, '2024': 100 };
      ebitda = { '2023': 14, '2024': 18 };
    }

    const lastYear = years[years.length - 1];
    const latestRevenue = revenue[lastYear] || 100;
    const latestEBITDA = ebitda[lastYear] || 18;

    return {
      success: true,
      company_name: fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
      currency: 'USD',
      units: 'millions',
      historical_years: years,
      income_statement: {
        revenue,
        ebitda,
        cogs: {},
        gross_profit: {},
        depreciation_amortization: {},
        operating_income: {},
        net_income: {}
      },
      balance_sheet: {
        cash: {},
        accounts_receivable: {},
        inventory: {},
        accounts_payable: {}
      },
      calculated_metrics: {
        ebitda_margin_pct: { [lastYear]: latestEBITDA / latestRevenue },
        avg_revenue_growth: years.length > 1 ? (revenue[lastYear] / revenue[years[0]] - 1) / (years.length - 1) : 0.10,
        latest_revenue: latestRevenue,
        latest_ebitda: latestEBITDA,
        dso_days: 45,
        dio_days: 30,
        dpo_days: 35
      },
      data_quality: {
        completeness_score: 'medium',
        missing_items: ['Full balance sheet', 'Cash flow statement'],
        assumptions_made: ['Used available line items'],
        excluded_projections: []
      }
    };
  };

  // Step 1: Upload
  if (step === 'upload') {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-up">
        <Button variant="ghost" size="sm" onClick={() => navigate('/models')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Models
        </Button>

        <h1 className="text-3xl font-bold text-foreground">Cash Flow Buildup Model</h1>
        <p className="text-muted-foreground">Upload historical financials to generate AI-powered projections</p>

        <Card className="glass-card">
          <CardContent className="pt-6 space-y-6">
            {/* Company Selection */}
            {user && (
              <div>
                <Label className="text-foreground flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4" />
                  Select or Create Company
                </Label>
                <CompanySelector
                  companies={companies}
                  selectedCompany={selectedCompany}
                  onSelectCompany={handleSelectCompany}
                  onCreateCompany={createCompany}
                  loading={companiesLoading}
                  placeholder="Select existing company or create new..."
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Attach this model to a company to save it to your portfolio
                </p>
              </div>
            )}

            {!user && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-200 font-medium">Sign in to save your work</p>
                    <p className="text-xs text-amber-200/70 mt-1">
                      You can still build models, but they won't be saved to your account.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="company-name" className="text-foreground">Company Name</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
                className="mt-2 bg-secondary border-border text-foreground"
                disabled={!!selectedCompany}
              />
              {selectedCompany && (
                <p className="text-xs text-muted-foreground mt-1">
                  Using selected company name
                </p>
              )}
            </div>

            <div>
              <Label className="text-foreground">Upload Historical Financial Data</Label>
              <div className="mt-2 border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isExtracting}
                />
                {isExtracting ? (
                  <div className="space-y-3">
                    <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                    <p className="text-foreground font-medium">Extracting historical data...</p>
                    <p className="text-sm text-muted-foreground">Analyzing {uploadedFile?.name}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-foreground font-medium">Drop Excel or CSV file here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Only historical data will be extracted. Projections in the file will be ignored.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Review extracted historical data
  if (step === 'review' && extractedData) {
    const is = extractedData.income_statement;
    const years = extractedData.historical_years || [];
    const lastYear = years[years.length - 1];
    const latestRevenue = extractedData.calculated_metrics?.latest_revenue || is?.revenue?.[lastYear] || 0;
    const latestEBITDA = extractedData.calculated_metrics?.latest_ebitda || is?.ebitda?.[lastYear] || 0;
    const metrics = extractedData.calculated_metrics || {};
    const ebitdaMargin = metrics.ebitda_margin_pct?.[lastYear] || (latestRevenue > 0 ? latestEBITDA / latestRevenue : 0);

    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-up">
        <Button variant="ghost" size="sm" onClick={() => setStep('upload')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-3">
          <CheckCircle className="h-8 w-8 text-emerald-500" />
          <h1 className="text-3xl font-bold text-foreground">Historical Data Extracted</h1>
        </div>

        <Card className="glass-card">
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{extractedData.company_name || companyName}</h2>
                <p className="text-muted-foreground">{uploadedFile?.name}</p>
              </div>
              <div className="px-3 py-1 bg-primary/10 rounded-full text-sm text-primary">
                {years.length} years of historical data
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Revenue ({lastYear})</p>
                <p className="text-2xl font-bold text-foreground">${latestRevenue.toFixed(1)}M</p>
              </div>
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">EBITDA ({lastYear})</p>
                <p className="text-2xl font-bold text-foreground">${latestEBITDA.toFixed(1)}M</p>
              </div>
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">EBITDA Margin</p>
                <p className="text-2xl font-bold text-emerald-500">
                  {(ebitdaMargin * 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Avg Growth</p>
                <p className="text-2xl font-bold text-emerald-500">
                  {((metrics.avg_revenue_growth || metrics.yoy_revenue_growth || 0) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {extractedData.data_quality?.excluded_projections && extractedData.data_quality.excluded_projections.length > 0 && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-300">
                  ℹ️ Excluded projected values: {extractedData.data_quality.excluded_projections.join(', ')}
                </p>
              </div>
            )}

            {extractedData.data_quality?.missing_items && extractedData.data_quality.missing_items.length > 0 && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <p className="text-sm text-amber-200">
                    Some items were estimated: {extractedData.data_quality.missing_items.join(', ')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button variant="outline" onClick={() => setStep('upload')} className="flex-1">
            Upload Different File
          </Button>
          <Button onClick={() => setStep('interview')} className="flex-1 bg-cyan-600 hover:bg-cyan-500">
            <MessageSquare className="h-4 w-4 mr-2" />
            Continue to Interview →
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Interview questions
  if (step === 'interview' && extractedData) {
    const answeredCount = Object.values(interviewResponses).filter(r => r.trim()).length;

    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-up">
        <Button variant="ghost" size="sm" onClick={() => setStep('review')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-cyan-500" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Management Interview</h1>
            <p className="text-muted-foreground">Answer questions to generate AI-powered projection assumptions</p>
          </div>
        </div>

        <Card className="glass-card">
          <CardContent className="pt-6 space-y-6">
            {interviewQuestions.map((q, idx) => (
              <div key={q.id} className="space-y-2">
                <Label className="text-foreground font-medium">
                  {idx + 1}. {q.question}
                </Label>
                <Textarea
                  value={interviewResponses[q.id] || ''}
                  onChange={(e) => setInterviewResponses(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder={q.placeholder}
                  className="bg-secondary border-border text-foreground min-h-[80px]"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button variant="outline" onClick={() => setStep('review')} className="flex-1">
            Back to Review
          </Button>
          <Button 
            onClick={handleGenerateAssumptions} 
            disabled={isGeneratingAssumptions}
            className="flex-1 bg-cyan-600 hover:bg-cyan-500"
          >
            {isGeneratingAssumptions ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Assumptions...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate AI Assumptions ({answeredCount}/{interviewQuestions.length} answered)
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Handle model save
  const handleSaveModel = async (modelData: any, assumptions: any) => {
    if (!selectedCompany) {
      toast.error('Please select a company to save the model');
      return null;
    }

    // Save the uploaded file as a document if not already saved
    if (uploadedFile && !savedDocumentId && user) {
      try {
        const fileExt = uploadedFile.name.split('.').pop()?.toLowerCase() || '';
        const timestamp = Date.now();
        const sanitizedName = uploadedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `${user.id}/${selectedCompany.id}/${timestamp}_${sanitizedName}`;

        // Upload to file storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, uploadedFile);

        if (uploadError) throw uploadError;

        const doc = await saveDocument({
          companyId: selectedCompany.id,
          name: uploadedFile.name,
          filePath: storagePath,
          fileType: fileExt,
          fileSize: uploadedFile.size,
          folder: 'Financial',
          subfolder: 'Historical'
        });
        if (doc) setSavedDocumentId(doc.id);
      } catch (e) {
        console.error('Failed to save uploaded file to data room:', e);
        toast.error('Model saved, but file upload failed. Please upload the file from the Data Room.');
      }
    }

    // Save the model
    const model = await saveModel({
      companyId: selectedCompany.id,
      modelType: 'cash_flow_buildup',
      name: `Cash Flow Buildup - ${new Date().toLocaleDateString()}`,
      modelData,
      assumptions,
      historicalData: extractedData,
      interviewResponses,
      status: 'draft'
    });

    if (model) {
      setSavedModelId(model.id);
    }
    return model;
  };

  // Step 4: Model builder
  return (
    <CashFlowBuildup
      companyName={extractedData?.company_name || companyName || 'Company'}
      historicalData={extractedData}
      initialAssumptions={generatedAssumptions}
      assumptionsRationale={assumptionsRationale}
      onBack={() => setStep('interview')}
      companyId={selectedCompany?.id}
      onSave={handleSaveModel}
      isSaving={saving}
    />
  );
}
