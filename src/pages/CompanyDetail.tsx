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
import { IndustryNews } from '@/components/companies/IndustryNews';
import { CompanyDocumentList } from '@/components/companies/CompanyDocumentList';
import { InlineUploadZone } from '@/components/dataroom/InlineUploadZone';
import {
  ArrowLeft,
  Building2,
  Globe,
  Users,
  FolderOpen,
  Brain,
  Activity,
  Edit,
  ExternalLink,
  Mail,
  Phone,
  FileText,
  TrendingUp,
  Newspaper,
  Upload,
  LayoutDashboard,
} from 'lucide-react';
import { format } from 'date-fns';

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

const FOLDERS = [
  { id: 'financials', name: 'Financials', icon: '📊' },
  { id: 'legal', name: 'Legal', icon: '⚖️' },
  { id: 'operations', name: 'Operations', icon: '⚙️' },
  { id: 'hr', name: 'HR & Employment', icon: '👥' },
  { id: 'commercial', name: 'Commercial', icon: '💼' },
  { id: 'technology', name: 'Technology', icon: '💻' },
  { id: 'other', name: 'Other', icon: '📁' },
];

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
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id || !user) return;

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

  const filteredDocuments = activeFolder 
    ? documents.filter(d => d.folder?.toLowerCase() === activeFolder.toLowerCase())
    : documents;

  const folderCounts = FOLDERS.reduce((acc, folder) => {
    acc[folder.id] = documents.filter(d => d.folder?.toLowerCase() === folder.id).length;
    return acc;
  }, {} as Record<string, number>);

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
              <h1 className="h1">{company.name}</h1>
              <CompanyTypeBadge type={company.company_type} />
              {company.pipeline_stage && (
                <Badge variant="outline" className="capitalize">
                  {company.pipeline_stage.replace('-', ' ')}
                </Badge>
              )}
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
          Edit Company
        </Button>
      </div>

      {/* Key Metrics */}
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

      {/* Tabs */}
      <Tabs defaultValue="dataroom" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="dataroom" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Data Room
            {documents.length > 0 && (
              <Badge variant="secondary" className="ml-1">{documents.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-2">
            <Newspaper className="h-4 w-4" />
            Industry Intel
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Users className="h-4 w-4" />
            Contacts
            {contacts.length > 0 && (
              <Badge variant="secondary" className="ml-1">{contacts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="models" className="gap-2">
            <Brain className="h-4 w-4" />
            Models
            {models.length > 0 && (
              <Badge variant="secondary" className="ml-1">{models.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Data Room Tab */}
        <TabsContent value="dataroom" className="space-y-6">
          <div className="flex gap-6">
            {/* Folder Sidebar */}
            <div className="w-64 shrink-0">
              <Card className="p-4">
                <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Folders
                </h3>
                <div className="space-y-1">
                  <Button
                    variant={activeFolder === null ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveFolder(null)}
                  >
                    <span className="mr-2">📂</span>
                    All Documents
                    <Badge variant="secondary" className="ml-auto">{documents.length}</Badge>
                  </Button>
                  {FOLDERS.map(folder => (
                    <Button
                      key={folder.id}
                      variant={activeFolder === folder.id ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setActiveFolder(folder.id)}
                    >
                      <span className="mr-2">{folder.icon}</span>
                      {folder.name}
                      {folderCounts[folder.id] > 0 && (
                        <Badge variant="secondary" className="ml-auto">{folderCounts[folder.id]}</Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </Card>
            </div>

            {/* Documents Area */}
            <div className="flex-1 space-y-4">
              {/* Upload Zone */}
              <InlineUploadZone 
                companyId={company.id}
                folder={activeFolder || undefined}
                onUploadComplete={fetchData}
              />

              {/* Documents Table */}
              {filteredDocuments.length === 0 ? (
                <Card className="p-12 text-center">
                  <FolderOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {activeFolder ? `No documents in ${FOLDERS.find(f => f.id === activeFolder)?.name || activeFolder}` : 'No documents uploaded yet'}
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Drag and drop files above to upload
                  </p>
                </Card>
              ) : (
                <CompanyDocumentList 
                  documents={filteredDocuments}
                  onRename={async (docId, newName) => {
                    await supabase.from('documents').update({ name: newName }).eq('id', docId);
                    fetchData();
                  }}
                  onDelete={async (docId) => {
                    await supabase.from('documents').delete().eq('id', docId);
                    fetchData();
                  }}
                  onStatusChange={async (docId, status) => {
                    await supabase.from('documents').update({ doc_status: status as any }).eq('id', docId);
                    fetchData();
                  }}
                />
              )}
            </div>
          </div>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              {company.description ? (
                <p className="text-muted-foreground">{company.description}</p>
              ) : (
                <p className="text-muted-foreground italic">No description available. Click Edit to add one.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contacts</span>
                  <span className="font-medium">{contacts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Documents</span>
                  <span className="font-medium">{documents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Models</span>
                  <span className="font-medium">{models.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Health Score</span>
                  <span className={`font-medium ${getHealthScore() >= 70 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                    {getHealthScore()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Recent Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No documents uploaded</p>
                ) : (
                  <ul className="space-y-2">
                    {documents.slice(0, 5).map((doc) => (
                      <li key={doc.id} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate flex-1">{doc.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {format(new Date(doc.created_at), 'MMM d')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

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
        </TabsContent>

        {/* Industry News Tab */}
        <TabsContent value="news">
          <IndustryNews companyName={company.name} industry={company.industry} />
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
