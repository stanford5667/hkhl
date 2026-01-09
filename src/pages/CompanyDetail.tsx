import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompanyTypeBadge } from '@/components/companies/CompanyTypeBadge';
import { EditCompanyDialog } from '@/components/companies/EditCompanyDialog';
import { MarketIntelTab } from '@/components/companies/MarketIntelTab';
import { EmbeddedDataRoom } from '@/components/companies/EmbeddedDataRoom';
import { CompanyTeamPanel } from '@/components/companies/CompanyTeamPanel';
import { CompanyTasksTab } from '@/components/companies/CompanyTasksTab';
import { ProcessingBanner, ProcessingIndicator, AIAnalyzedBadge } from '@/components/companies/ProcessingBanner';
import { AISummaryCard } from '@/components/companies/AISummaryCard';
import { PublicEquityDetailView } from '@/components/equity/PublicEquityDetailView';
import { AssetBacktestPanel } from '@/components/equity/AssetBacktestPanel';

import { CompanySummaryCard } from '@/components/companies/CompanySummaryCard';
import { CompanyContactsCard } from '@/components/companies/CompanyContactsCard';
import { CompanyNotesSection } from '@/components/companies/CompanyNotesSection';
import { DataExtractionPanel } from '@/components/companies/DataExtractionPanel';
import { ExtractedFieldsDisplay } from '@/components/companies/ExtractedFieldsDisplay';
import {
  ArrowLeft,
  Building2,
  Globe,
  Users,
  FolderOpen,
  Brain,
  Edit,
  ExternalLink,
  FileText,
  TrendingUp,
  Newspaper,
  LayoutDashboard,
  StickyNote,
  Mail,
  Phone,
  CheckSquare,
  LineChart,
  Briefcase,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';
import { useCompanyTasks } from '@/hooks/useTasks';

interface CompanyDetail {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  description: string | null;
  company_type: 'pipeline' | 'portfolio' | 'prospect' | 'passed' | null;
  pipeline_stage: string | null;
  revenue_ltm: number | null;
  ebitda_ltm: number | null;
  deal_lead: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  // Public equity fields
  asset_class: string | null;
  ticker_symbol: string | null;
  exchange: string | null;
  shares_owned: number | null;
  cost_basis: number | null;
  current_price: number | null;
  market_value: number | null;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  category: string;
}

interface Document {
  id: string;
  name: string;
  file_type: string | null;
  file_path: string;
  folder: string | null;
  subfolder: string | null;
  file_size: number | null;
  doc_status: string | null;
  created_at: string;
  updated_at: string;
}

interface Model {
  id: string;
  name: string;
  model_type: string;
  status: string | null;
  created_at: string;
}


export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [extractionKey, setExtractionKey] = useState(0);

  const fetchData = async () => {
    if (!id) return;

    setLoading(true);
    try {
      // Fetch company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (companyError) throw companyError;
      if (!companyData) {
        toast.error('Company not found');
        navigate('/companies');
        return;
      }
      setCompany(companyData as CompanyDetail);

      // Fetch related contacts
      const { data: contactsData } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, title, category')
        .eq('company_id', id);
      setContacts(contactsData || []);

      // Fetch related documents
      const { data: docsData } = await supabase
        .from('documents')
        .select('*')
        .eq('company_id', id)
        .order('created_at', { ascending: false });
      setDocuments((docsData as Document[]) || []);

      // Fetch related models
      const { data: modelsData } = await supabase
        .from('models')
        .select('id, name, model_type, status, created_at')
        .eq('company_id', id)
        .order('created_at', { ascending: false });
      setModels(modelsData || []);
    } catch (error) {
      console.error('Error fetching company:', error);
      toast.error('Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!company) {
    return null;
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return '—';
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
    return `$${value.toFixed(0)}M`;
  };

  const getHealthScore = () => {
    if (company.ebitda_ltm && company.revenue_ltm) {
      return Math.min(100, Math.round((company.ebitda_ltm / company.revenue_ltm) * 100 * 5));
    }
    return 75;
  };

  const isPublicEquity = company.asset_class === 'public_equity' && company.ticker_symbol;

  // Unified company view for both public and private companies
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              {isPublicEquity && <LineChart className="h-6 w-6 text-emerald-400" />}
              <h1 className="h1">{company.name}</h1>
              {isPublicEquity && company.ticker_symbol && (
                <Badge variant="secondary" className="text-base font-mono">
                  {company.ticker_symbol}
                </Badge>
              )}
              {isPublicEquity && company.exchange && (
                <Badge variant="outline">
                  {company.exchange}
                </Badge>
              )}
              {!isPublicEquity && <CompanyTypeBadge type={company.company_type} />}
              {!isPublicEquity && company.pipeline_stage && (
                <Badge variant="outline" className="capitalize">
                  {company.pipeline_stage.replace('-', ' ')}
                </Badge>
              )}
              {!isPublicEquity && <ProcessingIndicator companyId={company.id} />}
              {!isPublicEquity && <AIAnalyzedBadge companyId={company.id} />}
            </div>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              {company.industry && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {company.industry}
                </span>
              )}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  {company.website.replace(/^https?:\/\//, '')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Key Metrics - Different for public vs private companies */}
      {!isPublicEquity && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Revenue LTM</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(company.revenue_ltm)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">EBITDA LTM</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(company.ebitda_ltm)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">EV (8x)</p>
              <p className="text-2xl font-bold mt-1">
                {company.ebitda_ltm ? formatCurrency(company.ebitda_ltm * 8) : '—'}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Health Score</p>
              <p className={`text-2xl font-bold mt-1 ${getHealthScore() >= 70 ? 'text-emerald-400' : getHealthScore() >= 40 ? 'text-yellow-400' : 'text-rose-400'}`}>
                {getHealthScore()}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Documents</p>
              <p className="text-2xl font-bold mt-1">{documents.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-secondary h-12 flex-wrap">
          <TabsTrigger value="overview" className="gap-2 text-base px-5 py-3">
            <LayoutDashboard className="h-5 w-5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2 text-base px-5 py-3">
            <CheckSquare className="h-5 w-5" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="dataroom" className="gap-2 text-base px-5 py-3">
            <FolderOpen className="h-5 w-5" />
            Data Room
            {documents.length > 0 && (
              <Badge variant="secondary" className="ml-1">{documents.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2 text-base px-5 py-3">
            <StickyNote className="h-5 w-5" />
            Notes
          </TabsTrigger>
          {isPublicEquity && (
            <TabsTrigger value="transactions" className="gap-2 text-base px-5 py-3">
              <Briefcase className="h-5 w-5" />
              Transactions
            </TabsTrigger>
          )}
          {isPublicEquity && (
            <TabsTrigger value="backtest" className="gap-2 text-base px-5 py-3">
              <BarChart3 className="h-5 w-5" />
              Backtest
            </TabsTrigger>
          )}
          <TabsTrigger value="news" className="gap-2 text-base px-5 py-3">
            <Newspaper className="h-5 w-5" />
            {isPublicEquity ? 'News' : 'Industry Intel'}
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2 text-base px-5 py-3">
            <Users className="h-5 w-5" />
            Contacts
            {contacts.length > 0 && (
              <Badge variant="secondary" className="ml-1">{contacts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="models" className="gap-2 text-base px-5 py-3">
            <Brain className="h-5 w-5" />
            Models
            {models.length > 0 && (
              <Badge variant="secondary" className="ml-1">{models.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <CompanyTasksTab companyId={company.id} companyName={company.name} />
        </TabsContent>

        {/* Data Room Tab */}
        <TabsContent value="dataroom">
          <EmbeddedDataRoom companyId={company.id} companyName={company.name} />
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {isPublicEquity ? (
            /* Public Equity Overview */
            <PublicEquityDetailView company={company} onUpdate={fetchData} />
          ) : (
            /* Private Company Overview */
            <>
              {/* Processing Banner - Shows when documents are being analyzed */}
              <ProcessingBanner companyId={company.id} />

              {/* AI Summary Card - Shows AI-generated insights */}
              <AISummaryCard companyId={company.id} companyName={company.name} />

              {/* Data Extraction Panel */}
              <DataExtractionPanel 
                company={company} 
                onComplete={() => setExtractionKey(prev => prev + 1)} 
              />

              {/* Extracted Fields Display */}
              <ExtractedFieldsDisplay key={extractionKey} companyId={company.id} />

              {/* Company Summary Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info Card */}
                <Card className="glass-card lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      About {company.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {company.description ? (
                      <p className="text-foreground">{company.description}</p>
                    ) : (
                      <p className="text-muted-foreground italic">No description available. Click Edit to add one.</p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Industry</p>
                        <p className="text-foreground font-medium mt-1">{company.industry || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Website</p>
                        {company.website ? (
                          <a 
                            href={company.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-medium mt-1 flex items-center gap-1"
                          >
                            {company.website.replace(/^https?:\/\//, '')}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <p className="text-foreground font-medium mt-1">—</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                        <p className="text-foreground font-medium mt-1 capitalize">{company.status || 'Active'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Deal Lead</p>
                        <p className="text-foreground font-medium mt-1">{company.deal_lead || '—'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats Card */}
                <div className="space-y-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-success" />
                        Quick Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Health Score</span>
                        <span className={`text-xl font-bold ${getHealthScore() >= 70 ? 'text-emerald-400' : getHealthScore() >= 40 ? 'text-yellow-400' : 'text-rose-400'}`}>
                          {getHealthScore()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">EBITDA Margin</span>
                        <span className="text-foreground font-medium">
                          {company.revenue_ltm && company.ebitda_ltm 
                            ? `${((company.ebitda_ltm / company.revenue_ltm) * 100).toFixed(1)}%`
                            : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Est. EV (8x)</span>
                        <span className="text-foreground font-medium">
                          {company.ebitda_ltm ? formatCurrency(company.ebitda_ltm * 8) : '—'}
                        </span>
                      </div>
                      <div className="pt-3 border-t border-border space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            Contacts
                          </span>
                          <span className="text-foreground">{contacts.length}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <FolderOpen className="h-3.5 w-3.5" />
                            Documents
                          </span>
                          <span className="text-foreground">{documents.length}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Brain className="h-3.5 w-3.5" />
                            Models
                          </span>
                          <span className="text-foreground">{models.length}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Team Panel */}
                  <CompanyTeamPanel companyId={company.id} />
                </div>
              </div>

              {/* Financials Summary */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Revenue (LTM)</p>
                      <p className="text-2xl font-bold mt-1">{formatCurrency(company.revenue_ltm)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">EBITDA (LTM)</p>
                      <p className="text-2xl font-bold mt-1">{formatCurrency(company.ebitda_ltm)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">EBITDA Margin</p>
                      <p className="text-2xl font-bold mt-1">
                        {company.revenue_ltm && company.ebitda_ltm 
                          ? `${((company.ebitda_ltm / company.revenue_ltm) * 100).toFixed(1)}%`
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Est. Enterprise Value</p>
                      <p className="text-2xl font-bold mt-1">
                        {company.ebitda_ltm ? formatCurrency(company.ebitda_ltm * 8) : '—'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Three Column Grid for Summaries */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Recent Documents */}
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-amber-400" />
                      Recent Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {documents.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No documents uploaded yet</p>
                    ) : (
                      <ul className="space-y-2">
                        {documents.slice(0, 4).map((doc) => (
                          <li key={doc.id} className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate flex-1 text-foreground">{doc.name}</span>
                            <span className="text-muted-foreground text-xs shrink-0">
                              {format(new Date(doc.created_at), 'MMM d')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {documents.length > 4 && (
                      <p className="text-xs text-muted-foreground mt-3">+{documents.length - 4} more documents</p>
                    )}
                  </CardContent>
                </Card>

                {/* Contacts Preview */}
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      Key Contacts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {contacts.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No contacts assigned yet</p>
                    ) : (
                      <ul className="space-y-3">
                        {contacts.slice(0, 4).map((contact) => (
                          <li key={contact.id} className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                              {contact.first_name[0]}{contact.last_name[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">
                                {contact.first_name} {contact.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {contact.title || contact.category}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {contacts.length > 4 && (
                      <p className="text-xs text-muted-foreground mt-3">+{contacts.length - 4} more contacts</p>
                    )}
                  </CardContent>
                </Card>

                {/* Models Preview */}
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-400" />
                      Financial Models
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {models.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No models created yet</p>
                    ) : (
                      <ul className="space-y-2">
                        {models.slice(0, 4).map((model) => (
                          <li key={model.id} className="flex items-center justify-between gap-2 text-sm">
                            <div className="min-w-0 flex-1">
                              <p className="text-foreground truncate">{model.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{model.model_type}</p>
                            </div>
                            <Badge variant={model.status === 'complete' ? 'default' : 'secondary'} className="shrink-0 text-xs">
                              {model.status || 'Draft'}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                    {models.length > 4 && (
                      <p className="text-xs text-muted-foreground mt-3">+{models.length - 4} more models</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Timeline */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">{format(new Date(company.created_at), 'MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="font-medium">{format(new Date(company.updated_at), 'MMMM d, yyyy')}</span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <CompanyNotesSection companyId={company.id} />
        </TabsContent>

        {/* Transactions Tab - Public Equity Only */}
        {isPublicEquity && (
          <TabsContent value="transactions">
            <PublicEquityDetailView 
              company={company} 
              onUpdate={fetchData} 
              showOnlyTransactions={true}
            />
          </TabsContent>
        )}

        {/* Backtest Tab - Public Equity Only */}
        {isPublicEquity && company.ticker_symbol && (
          <TabsContent value="backtest">
            <AssetBacktestPanel 
              ticker={company.ticker_symbol}
              companyName={company.name}
            />
          </TabsContent>
        )}

        {/* Market Intel / News Tab */}
        <TabsContent value="news">
          <MarketIntelTab companyId={company.id} companyName={company.name} industry={company.industry} />
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          {contacts.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No contacts linked to this company</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/contacts')}>
                  Add Contact
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contacts.map((contact) => (
                <Card key={contact.id} className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                        {contact.first_name[0]}{contact.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">
                          {contact.first_name} {contact.last_name}
                        </h4>
                        {contact.title && (
                          <p className="text-sm text-muted-foreground truncate">{contact.title}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} className="text-muted-foreground hover:text-primary">
                              <Mail className="h-4 w-4" />
                            </a>
                          )}
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="text-muted-foreground hover:text-primary">
                              <Phone className="h-4 w-4" />
                            </a>
                          )}
                          <Badge variant="outline" className="ml-auto text-xs capitalize">
                            {contact.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models">
          {models.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No models created</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate(`/models/new?company=${company.id}`)}>
                  Create Model
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {models.map((model) => (
                <Card
                  key={model.id}
                  className="glass-card hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/models/view/${model.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{model.name}</h4>
                        <p className="text-sm text-muted-foreground capitalize">
                          {model.model_type.replace('-', ' ')}
                        </p>
                      </div>
                      <Badge variant={model.status === 'complete' ? 'default' : 'outline'}>
                        {model.status || 'Draft'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Created {format(new Date(model.created_at), 'MMM d, yyyy')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <EditCompanyDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        company={company}
        onSave={fetchData}
      />
    </div>
  );
}
