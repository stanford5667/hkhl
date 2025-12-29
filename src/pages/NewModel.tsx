import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  DollarSign,
  TrendingUp,
  GitMerge,
  FileUp,
  Sparkles,
  Loader2,
  CheckCircle,
  Building2,
  Upload,
} from "lucide-react";
import { useCompanies } from "@/hooks/useCompanies";
import { useModels } from "@/hooks/useModels";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ModelTypeOption {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const modelTypes: ModelTypeOption[] = [
  {
    id: "lbo",
    icon: <BarChart3 className="h-6 w-6" />,
    title: "LBO Model",
    description: "Leveraged buyout with debt schedules and returns analysis",
  },
  {
    id: "dcf",
    icon: <DollarSign className="h-6 w-6" />,
    title: "DCF Model",
    description: "Intrinsic value with WACC & terminal value calculation",
  },
  {
    id: "pro_forma",
    icon: <TrendingUp className="h-6 w-6" />,
    title: "Pro Forma",
    description: "Operating projections & scenario planning",
  },
  {
    id: "merger",
    icon: <GitMerge className="h-6 w-6" />,
    title: "Merger Model",
    description: "M&A accretion/dilution with synergy analysis",
  },
];

const steps = [
  { id: 1, title: "Model Type", description: "Choose model type" },
  { id: 2, title: "Company", description: "Select company" },
  { id: 3, title: "Data", description: "Upload historical data" },
  { id: 4, title: "Generate", description: "AI generation" },
];

export default function NewModel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companies, loading: companiesLoading } = useCompanies();
  const { saveModel, saving } = useModels();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [modelName, setModelName] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState("");

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!selectedType;
      case 2:
        return !!selectedCompany && !!modelName;
      case 3:
        return true; // File upload is optional
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate("/models");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!user || !selectedCompany) return;

    setGenerating(true);
    setGenerationProgress(0);

    // Simulate AI generation process
    const generationSteps = [
      { progress: 20, text: "Analyzing historical data..." },
      { progress: 40, text: "Building financial structure..." },
      { progress: 60, text: "Calculating projections..." },
      { progress: 80, text: "Generating assumptions..." },
      { progress: 95, text: "Finalizing model..." },
    ];

    for (const step of generationSteps) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setGenerationProgress(step.progress);
      setGenerationStep(step.text);
    }

    // Generate mock data
    const mockHistoricalData = {
      revenue: 100,
      ebitda: 25,
      years: [
        { year: 2021, revenue: 85, ebitda: 20 },
        { year: 2022, revenue: 92, ebitda: 22 },
        { year: 2023, revenue: 100, ebitda: 25 },
      ],
    };

    const mockAssumptions = {
      revenueGrowth: 8,
      ebitdaMargin: 25,
      capexPercent: 3,
      nwcPercent: 10,
      exitMultiple: 8,
      entryMultiple: 7,
      leverage: 50,
      interestRate: 6,
      holdingPeriod: 5,
    };

    // Save the model
    const model = await saveModel({
      companyId: selectedCompany,
      modelType: selectedType,
      name: modelName,
      modelData: {},
      assumptions: mockAssumptions,
      historicalData: mockHistoricalData,
      status: "draft",
    });

    setGenerationProgress(100);
    setGenerationStep("Complete!");

    await new Promise((resolve) => setTimeout(resolve, 500));

    if (model) {
      navigate(`/models/${model.id}/edit`);
    } else {
      setGenerating(false);
      toast.error("Failed to create model");
    }
  };

  const selectedCompanyData = companies.find((c) => c.id === selectedCompany);

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Model</h1>
          <p className="text-muted-foreground">Create a new financial model with AI</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-2",
                step.id <= currentStep ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                  step.id < currentStep
                    ? "bg-primary border-primary text-primary-foreground"
                    : step.id === currentStep
                    ? "border-primary text-primary"
                    : "border-border"
                )}
              >
                {step.id < currentStep ? <CheckCircle className="h-4 w-4" /> : step.id}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{step.title}</p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "hidden sm:block w-16 h-0.5 mx-2",
                    step.id < currentStep ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="min-h-[400px]">
        <CardContent className="p-6">
          {/* Step 1: Model Type */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">Select Model Type</h2>
                <p className="text-sm text-muted-foreground">
                  Choose the type of financial model you want to create
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modelTypes.map((type) => (
                  <Card
                    key={type.id}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      selectedType === type.id && "border-primary bg-primary/5"
                    )}
                    onClick={() => setSelectedType(type.id)}
                  >
                    <CardContent className="p-4 flex items-start gap-4">
                      <div
                        className={cn(
                          "p-3 rounded-lg",
                          selectedType === type.id ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                        )}
                      >
                        {type.icon}
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{type.title}</h3>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Company Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">Select Company</h2>
                <p className="text-sm text-muted-foreground">
                  Choose a company and name your model
                </p>
              </div>

              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Company</Label>
                  {companiesLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading companies...
                    </div>
                  ) : companies.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No companies found.{" "}
                      <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/companies")}>
                        Create one first
                      </Button>
                    </div>
                  ) : (
                    <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {company.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Model Name</Label>
                  <Input
                    placeholder={`${selectedCompanyData?.name || "Company"} ${selectedType.toUpperCase()} Model`}
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Data Upload */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">Upload Historical Data</h2>
                <p className="text-sm text-muted-foreground">
                  Upload Excel or CSV files with historical financials (optional)
                </p>
              </div>

              <div className="max-w-lg">
                <label
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                    uploadedFile
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50 hover:bg-secondary/30"
                  )}
                >
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                  />
                  {uploadedFile ? (
                    <div className="flex flex-col items-center gap-2 text-primary">
                      <CheckCircle className="h-10 w-10" />
                      <span className="font-medium">{uploadedFile.name}</span>
                      <span className="text-sm text-muted-foreground">
                        Click to change file
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="h-10 w-10" />
                      <span className="font-medium">Drop files here or click to browse</span>
                      <span className="text-sm">Supports .xlsx, .xls, .csv</span>
                    </div>
                  )}
                </label>

                <p className="text-sm text-muted-foreground mt-4">
                  💡 If no file is uploaded, we'll use placeholder data that you can edit later.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Generate */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">Generate Model</h2>
                <p className="text-sm text-muted-foreground">
                  Review your selections and generate the model
                </p>
              </div>

              {!generating ? (
                <div className="space-y-6">
                  {/* Summary */}
                  <Card className="bg-secondary/30">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model Type</span>
                        <span className="font-medium">
                          {modelTypes.find((t) => t.id === selectedType)?.title}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Company</span>
                        <span className="font-medium">{selectedCompanyData?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model Name</span>
                        <span className="font-medium">{modelName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Data Source</span>
                        <span className="font-medium">
                          {uploadedFile ? uploadedFile.name : "Placeholder data"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Button size="lg" className="gap-2" onClick={handleGenerate}>
                    <Sparkles className="h-5 w-5" />
                    Generate Model with AI
                  </Button>
                </div>
              ) : (
                <div className="space-y-6 py-8">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full border-4 border-primary/20 flex items-center justify-center">
                        <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                      </div>
                      {generationProgress < 100 && (
                        <div className="absolute inset-0">
                          <svg className="w-20 h-20 -rotate-90">
                            <circle
                              cx="40"
                              cy="40"
                              r="36"
                              stroke="hsl(var(--primary))"
                              strokeWidth="4"
                              fill="none"
                              strokeDasharray={`${(generationProgress / 100) * 226} 226`}
                              className="transition-all duration-500"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground">{generationStep}</p>
                      <p className="text-sm text-muted-foreground">{generationProgress}% complete</p>
                    </div>
                  </div>
                  <Progress value={generationProgress} className="max-w-md mx-auto" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      {!generating && (
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={handleBack}>
            {currentStep === 1 ? "Cancel" : "Back"}
          </Button>
          {currentStep < 4 && (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
