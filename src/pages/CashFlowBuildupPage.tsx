import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Upload, Building2, FileSpreadsheet, Loader2 } from 'lucide-react';
import { CashFlowBuildup } from '@/components/models/CashFlowBuildup';
import { toast } from 'sonner';

type Step = 'company' | 'upload' | 'model';

// Mock companies for demo
const mockCompanies = [
  { id: '1', name: 'TechCorp Industries', sector: 'Technology' },
  { id: '2', name: 'HealthPlus Medical', sector: 'Healthcare' },
  { id: '3', name: 'GreenEnergy Solutions', sector: 'Energy' },
  { id: '4', name: 'RetailMax Holdings', sector: 'Consumer' },
];

export default function CashFlowBuildupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('company');
  const [company, setCompany] = useState<{ id: string; name: string; sector: string } | null>(null);
  const [historicalData, setHistoricalData] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [customCompanyName, setCustomCompanyName] = useState('');

  const handleCompanySelect = (selectedCompany: typeof mockCompanies[0]) => {
    setCompany(selectedCompany);
    setStep('upload');
  };

  const handleCustomCompany = () => {
    if (!customCompanyName.trim()) {
      toast.error('Please enter a company name');
      return;
    }
    setCompany({ id: 'custom', name: customCompanyName.trim(), sector: 'Custom' });
    setStep('upload');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      // Simulate file processing - in production this would call n8n extract endpoint
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock historical data for demo
      const mockHistoricalData = {
        income_statement: {
          revenue: { '2021': 100, '2022': 110, '2023': 121 },
          ebitda: { '2021': 20, '2022': 23, '2023': 26 },
          net_income: { '2021': 10, '2022': 12, '2023': 14 },
        },
        balance_sheet: {
          accounts_receivable: { '2021': 15, '2022': 17, '2023': 19 },
          inventory: { '2021': 8, '2022': 9, '2023': 10 },
          accounts_payable: { '2021': 12, '2022': 13, '2023': 15 },
        },
        calculated_metrics: {
          revenue_growth: 0.10,
          ebitda_margin: 0.21,
        },
        historical_years: ['2021', '2022', '2023'],
        currency: 'USD',
        units: 'millions',
      };

      setHistoricalData(mockHistoricalData);
      setStep('model');
      toast.success('Financial data extracted successfully!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to process file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkipUpload = () => {
    // Use default assumptions without historical data
    setHistoricalData({
      income_statement: {},
      balance_sheet: {},
      calculated_metrics: {},
      historical_years: [],
      currency: 'USD',
      units: 'millions',
    });
    setStep('model');
  };

  if (step === 'model' && company) {
    return (
      <CashFlowBuildup
        companyName={company.name}
        historicalData={historicalData}
        onBack={() => navigate('/models')}
      />
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => step === 'company' ? navigate('/models') : setStep('company')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="h1">Cash Flow Buildup Model</h1>
          <p className="text-muted-foreground">
            {step === 'company' ? 'Select a company to analyze' : 'Upload financial data'}
          </p>
        </div>
      </div>

      {step === 'company' && (
        <div className="space-y-6">
          {/* Quick Select */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Select Company
              </CardTitle>
              <CardDescription>Choose from your portfolio or enter a new company</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mockCompanies.map((c) => (
                  <Button
                    key={c.id}
                    variant="outline"
                    className="h-auto p-4 justify-start text-left hover:border-primary"
                    onClick={() => handleCompanySelect(c)}
                  >
                    <div>
                      <div className="font-medium text-foreground">{c.name}</div>
                      <div className="text-sm text-muted-foreground">{c.sector}</div>
                    </div>
                  </Button>
                ))}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or enter manually</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Input
                  placeholder="Enter company name..."
                  value={customCompanyName}
                  onChange={(e) => setCustomCompanyName(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomCompany()}
                />
                <Button onClick={handleCustomCompany}>Continue</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'upload' && company && (
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Upload Financial Data
              </CardTitle>
              <CardDescription>
                Upload historical financials for {company.name} to improve projections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={isUploading}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {isUploading ? (
                    <div className="space-y-3">
                      <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                      <p className="text-foreground font-medium">Processing file...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      <div>
                        <p className="text-foreground font-medium">Drop files here or click to upload</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Supports Excel, CSV, or PDF financial statements
                        </p>
                      </div>
                    </div>
                  )}
                </label>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button variant="ghost" onClick={() => setStep('company')}>
                  Change Company
                </Button>
                <Button variant="outline" onClick={handleSkipUpload}>
                  Skip & Use Defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
