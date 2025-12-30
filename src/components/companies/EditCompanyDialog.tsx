import { useState, useEffect } from 'react';
import { 
  Building2, 
  Globe, 
  DollarSign,
  FileText,
  Users,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: {
    id: string;
    name: string;
    industry: string | null;
    website: string | null;
    description: string | null;
    company_type: string | null;
    pipeline_stage: string | null;
    revenue_ltm: number | null;
    ebitda_ltm: number | null;
    deal_lead: string | null;
    status: string | null;
  };
  onSave: () => void;
}

interface CompanyForm {
  name: string;
  website: string;
  industry: string;
  description: string;
  company_type: string;
  pipeline_stage: string;
  revenue_ltm: string;
  ebitda_ltm: string;
  deal_lead: string;
  status: string;
  // Extended fields
  summary: string;
  investment_thesis: string;
  key_risks: string;
  revenue_baseline: string;
  ebitda_baseline: string;
  employees: string;
  founded_year: string;
  headquarters: string;
  target_close_date: string;
  deal_value: string;
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
  { id: 'sourcing', label: 'Sourcing' },
  { id: 'initial-review', label: 'Initial Review' },
  { id: 'deep-dive', label: 'Deep Dive' },
  { id: 'loi', label: 'LOI' },
  { id: 'due-diligence', label: 'Due Diligence' },
  { id: 'closing', label: 'Closing' },
];

export function EditCompanyDialog({ open, onOpenChange, company, onSave }: EditCompanyDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basics');
  const [form, setForm] = useState<CompanyForm>({
    name: '',
    website: '',
    industry: '',
    description: '',
    company_type: '',
    pipeline_stage: '',
    revenue_ltm: '',
    ebitda_ltm: '',
    deal_lead: '',
    status: '',
    summary: '',
    investment_thesis: '',
    key_risks: '',
    revenue_baseline: '',
    ebitda_baseline: '',
    employees: '',
    founded_year: '',
    headquarters: '',
    target_close_date: '',
    deal_value: '',
  });

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || '',
        website: company.website || '',
        industry: company.industry || '',
        description: company.description || '',
        company_type: company.company_type || 'pipeline',
        pipeline_stage: company.pipeline_stage || 'sourcing',
        revenue_ltm: company.revenue_ltm?.toString() || '',
        ebitda_ltm: company.ebitda_ltm?.toString() || '',
        deal_lead: company.deal_lead || '',
        status: company.status || 'active',
        // Extended fields would come from extended company data
        summary: '',
        investment_thesis: '',
        key_risks: '',
        revenue_baseline: '',
        ebitda_baseline: '',
        employees: '',
        founded_year: '',
        headquarters: '',
        target_close_date: '',
        deal_value: '',
      });
    }
  }, [company]);

  const updateForm = (updates: Partial<CompanyForm>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Company name is required');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: form.name,
          website: form.website || null,
          industry: form.industry || null,
          description: form.description || null,
          company_type: form.company_type as any,
          pipeline_stage: form.company_type === 'pipeline' ? form.pipeline_stage : null,
          revenue_ltm: form.revenue_ltm ? parseFloat(form.revenue_ltm) : null,
          ebitda_ltm: form.ebitda_ltm ? parseFloat(form.ebitda_ltm) : null,
          deal_lead: form.deal_lead || null,
          status: form.status || 'active',
        })
        .eq('id', company.id);

      if (error) throw error;

      toast.success('Company updated successfully');
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error('Failed to update company');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Edit Company
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basics">
              <Building2 className="h-4 w-4 mr-2" />
              Basics
            </TabsTrigger>
            <TabsTrigger value="financials">
              <DollarSign className="h-4 w-4 mr-2" />
              Financials
            </TabsTrigger>
            <TabsTrigger value="thesis">
              <FileText className="h-4 w-4 mr-2" />
              Thesis
            </TabsTrigger>
            <TabsTrigger value="deal">
              <Users className="h-4 w-4 mr-2" />
              Deal Info
            </TabsTrigger>
          </TabsList>

          {/* Basics Tab */}
          <TabsContent value="basics" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="headquarters">Headquarters</Label>
                <Input
                  id="headquarters"
                  value={form.headquarters}
                  onChange={(e) => updateForm({ headquarters: e.target.value })}
                  placeholder="City, State"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_type">Company Type</Label>
                <Select value={form.company_type} onValueChange={(v) => updateForm({ company_type: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pipeline">Pipeline</SelectItem>
                    <SelectItem value="portfolio">Portfolio</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.company_type === 'pipeline' && (
                <div>
                  <Label htmlFor="pipeline_stage">Pipeline Stage</Label>
                  <Select value={form.pipeline_stage} onValueChange={(v) => updateForm({ pipeline_stage: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map(stage => (
                        <SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                placeholder="Brief company description..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="summary">Executive Summary</Label>
              <Textarea
                id="summary"
                value={form.summary}
                onChange={(e) => updateForm({ summary: e.target.value })}
                placeholder="High-level summary of the company and opportunity..."
                className="mt-1"
                rows={4}
              />
            </div>
          </TabsContent>

          {/* Financials Tab */}
          <TabsContent value="financials" className="space-y-4 mt-4">
            <Card className="p-4 bg-muted/30">
              <h4 className="font-medium mb-4">Current Financials (LTM)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="revenue_ltm">Revenue</Label>
                  <div className="flex items-center mt-1">
                    <span className="text-muted-foreground mr-2">$</span>
                    <Input
                      id="revenue_ltm"
                      type="number"
                      value={form.revenue_ltm}
                      onChange={(e) => updateForm({ revenue_ltm: e.target.value })}
                      placeholder="50"
                    />
                    <span className="text-muted-foreground ml-2">M</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="ebitda_ltm">EBITDA</Label>
                  <div className="flex items-center mt-1">
                    <span className="text-muted-foreground mr-2">$</span>
                    <Input
                      id="ebitda_ltm"
                      type="number"
                      value={form.ebitda_ltm}
                      onChange={(e) => updateForm({ ebitda_ltm: e.target.value })}
                      placeholder="10"
                    />
                    <span className="text-muted-foreground ml-2">M</span>
                  </div>
                </div>
              </div>
              {form.revenue_ltm && form.ebitda_ltm && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-muted-foreground text-sm">EBITDA Margin</p>
                  <p className="text-emerald-400 text-lg font-medium">
                    {((parseFloat(form.ebitda_ltm) / parseFloat(form.revenue_ltm)) * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </Card>

            <Card className="p-4 bg-muted/30">
              <h4 className="font-medium mb-4">Baseline / Entry Financials</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="revenue_baseline">Revenue at Entry</Label>
                  <div className="flex items-center mt-1">
                    <span className="text-muted-foreground mr-2">$</span>
                    <Input
                      id="revenue_baseline"
                      type="number"
                      value={form.revenue_baseline}
                      onChange={(e) => updateForm({ revenue_baseline: e.target.value })}
                      placeholder="45"
                    />
                    <span className="text-muted-foreground ml-2">M</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="ebitda_baseline">EBITDA at Entry</Label>
                  <div className="flex items-center mt-1">
                    <span className="text-muted-foreground mr-2">$</span>
                    <Input
                      id="ebitda_baseline"
                      type="number"
                      value={form.ebitda_baseline}
                      onChange={(e) => updateForm({ ebitda_baseline: e.target.value })}
                      placeholder="8"
                    />
                    <span className="text-muted-foreground ml-2">M</span>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employees">Employees</Label>
                <Input
                  id="employees"
                  type="number"
                  value={form.employees}
                  onChange={(e) => updateForm({ employees: e.target.value })}
                  placeholder="250"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="founded_year">Founded Year</Label>
                <Input
                  id="founded_year"
                  type="number"
                  value={form.founded_year}
                  onChange={(e) => updateForm({ founded_year: e.target.value })}
                  placeholder="2010"
                  className="mt-1"
                />
              </div>
            </div>
          </TabsContent>

          {/* Thesis Tab */}
          <TabsContent value="thesis" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="investment_thesis">Investment Thesis</Label>
              <Textarea
                id="investment_thesis"
                value={form.investment_thesis}
                onChange={(e) => updateForm({ investment_thesis: e.target.value })}
                placeholder="Why is this an attractive investment opportunity? What are the key value drivers?"
                className="mt-1"
                rows={6}
              />
            </div>

            <div>
              <Label htmlFor="key_risks">Key Risks & Mitigants</Label>
              <Textarea
                id="key_risks"
                value={form.key_risks}
                onChange={(e) => updateForm({ key_risks: e.target.value })}
                placeholder="What are the main risks? How can they be mitigated?"
                className="mt-1"
                rows={6}
              />
            </div>
          </TabsContent>

          {/* Deal Info Tab */}
          <TabsContent value="deal" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deal_value">Deal Value / Enterprise Value</Label>
                <div className="flex items-center mt-1">
                  <span className="text-muted-foreground mr-2">$</span>
                  <Input
                    id="deal_value"
                    type="number"
                    value={form.deal_value}
                    onChange={(e) => updateForm({ deal_value: e.target.value })}
                    placeholder="100"
                  />
                  <span className="text-muted-foreground ml-2">M</span>
                </div>
              </div>
              <div>
                <Label htmlFor="target_close_date">Target Close Date</Label>
                <Input
                  id="target_close_date"
                  type="date"
                  value={form.target_close_date}
                  onChange={(e) => updateForm({ target_close_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deal_lead">Deal Lead</Label>
                <Input
                  id="deal_lead"
                  value={form.deal_lead}
                  onChange={(e) => updateForm({ deal_lead: e.target.value })}
                  placeholder="John Smith"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => updateForm({ status: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.deal_value && form.ebitda_ltm && (
              <Card className="p-4 bg-emerald-900/20 border-emerald-500/30">
                <p className="text-muted-foreground text-sm">Implied Multiple</p>
                <p className="text-emerald-400 text-2xl font-bold">
                  {(parseFloat(form.deal_value) / parseFloat(form.ebitda_ltm)).toFixed(1)}x EBITDA
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
