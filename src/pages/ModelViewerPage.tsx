import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CashFlowBuildupViewer } from '@/components/models/CashFlowBuildupViewer';

interface ModelData {
  id: string;
  company_id: string;
  model_type: string;
  name: string;
  model_data: any;
  assumptions: any;
  historical_data: any;
  interview_responses: any;
  status: string | null;
  created_at: string;
  updated_at: string;
}

interface CompanyData {
  id: string;
  name: string;
}

export default function ModelViewerPage() {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [model, setModel] = useState<ModelData | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!modelId || !user) return;

    const fetchModel = async () => {
      setLoading(true);
      try {
        // Fetch model
        const { data: modelData, error: modelError } = await supabase
          .from('models')
          .select('*')
          .eq('id', modelId)
          .maybeSingle();

        if (modelError) throw modelError;
        if (!modelData) {
          setError('Model not found');
          return;
        }

        setModel(modelData);

        // Fetch company name
        const { data: companyData } = await supabase
          .from('companies')
          .select('id, name')
          .eq('id', modelData.company_id)
          .maybeSingle();

        if (companyData) {
          setCompany(companyData);
        }
      } catch (err) {
        console.error('Error fetching model:', err);
        setError('Failed to load model');
      } finally {
        setLoading(false);
      }
    };

    fetchModel();
  }, [modelId, user]);

  if (!user) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Please sign in to view this model.</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card className="p-8 text-center">
          <p className="text-destructive">{error || 'Model not found'}</p>
        </Card>
      </div>
    );
  }

  // Render based on model type
  if (model.model_type === 'cash_flow_buildup') {
    return (
      <CashFlowBuildupViewer
        model={model}
        companyName={company?.name || 'Unknown Company'}
        onBack={() => navigate(-1)}
      />
    );
  }

  // Default fallback for unsupported model types
  return (
    <div className="p-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          Viewer for "{model.model_type}" models is not yet implemented.
        </p>
      </Card>
    </div>
  );
}
