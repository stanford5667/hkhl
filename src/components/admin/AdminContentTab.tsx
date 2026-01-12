import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Building2, FileText, Briefcase, Users, Loader2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContentStats {
  companies: number;
  documents: number;
  deals: number;
  organizations: number;
}

interface ContentItem {
  id: string;
  name: string;
  type: string;
  owner?: string;
  created_at: string;
  status?: string;
}

export function AdminContentTab() {
  const [stats, setStats] = useState<ContentStats>({ companies: 0, documents: 0, deals: 0, organizations: 0 });
  const [companies, setCompanies] = useState<ContentItem[]>([]);
  const [documents, setDocuments] = useState<ContentItem[]>([]);
  const [deals, setDeals] = useState<ContentItem[]>([]);
  const [organizations, setOrganizations] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      // Fetch all content in parallel
      const [companiesRes, documentsRes, dealsRes, orgsRes] = await Promise.all([
        supabase.from('companies').select('id, name, company_type, user_id, created_at, status').order('created_at', { ascending: false }).limit(100),
        supabase.from('documents').select('id, name, document_type, user_id, created_at, doc_status').order('created_at', { ascending: false }).limit(100),
        supabase.from('deals').select('id, name, stage, user_id, created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('organizations').select('id, name, type, created_at, plan').order('created_at', { ascending: false }).limit(100),
      ]);

      setStats({
        companies: companiesRes.data?.length || 0,
        documents: documentsRes.data?.length || 0,
        deals: dealsRes.data?.length || 0,
        organizations: orgsRes.data?.length || 0,
      });

      setCompanies((companiesRes.data || []).map(c => ({
        id: c.id,
        name: c.name,
        type: c.company_type || 'Unknown',
        created_at: c.created_at,
        status: c.status,
      })));

      setDocuments((documentsRes.data || []).map(d => ({
        id: d.id,
        name: d.name,
        type: d.document_type || 'Unknown',
        created_at: d.created_at,
        status: d.doc_status,
      })));

      setDeals((dealsRes.data || []).map(d => ({
        id: d.id,
        name: d.name,
        type: 'Deal',
        created_at: d.created_at,
        status: d.stage,
      })));

      setOrganizations((orgsRes.data || []).map(o => ({
        id: o.id,
        name: o.name,
        type: o.type || 'Unknown',
        created_at: o.created_at,
        status: o.plan,
      })));

    } catch (err) {
      console.error('Error fetching content:', err);
      toast({
        title: 'Error',
        description: 'Failed to load content',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterItems = (items: ContentItem[]) => {
    return items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Building2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.companies}</p>
                <p className="text-sm text-muted-foreground">Companies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <FileText className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.documents}</p>
                <p className="text-sm text-muted-foreground">Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10">
                <Briefcase className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.deals}</p>
                <p className="text-sm text-muted-foreground">Deals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Users className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.organizations}</p>
                <p className="text-sm text-muted-foreground">Organizations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Browser */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Content Browser</CardTitle>
              <CardDescription>View and manage all content across the platform</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="companies">
            <TabsList>
              <TabsTrigger value="companies">Companies</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="deals">Deals</TabsTrigger>
              <TabsTrigger value="organizations">Organizations</TabsTrigger>
            </TabsList>

            <TabsContent value="companies" className="mt-4">
              <ContentTable items={filterItems(companies)} />
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <ContentTable items={filterItems(documents)} />
            </TabsContent>

            <TabsContent value="deals" className="mt-4">
              <ContentTable items={filterItems(deals)} />
            </TabsContent>

            <TabsContent value="organizations" className="mt-4">
              <ContentTable items={filterItems(organizations)} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function ContentTable({ items }: { items: ContentItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              No items found
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{item.type}</Badge>
              </TableCell>
              <TableCell>
                {item.status && <Badge variant="outline">{item.status}</Badge>}
              </TableCell>
              <TableCell>
                {new Date(item.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
