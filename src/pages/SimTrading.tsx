import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Activity, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { SimPortfolioDetail } from '@/components/sim-trading/SimPortfolioDetail';
import { format } from 'date-fns';

interface SimPortfolio {
  id: string;
  name: string;
  initial_capital: number;
  cash_balance: number;
  status: string;
  created_at: string;
  closed_at: string | null;
}

export default function SimTrading() {
  const { user } = useAuth();
  const [portfolios, setPortfolios] = useState<SimPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCapital, setNewCapital] = useState('100000');
  const [creating, setCreating] = useState(false);

  const fetchPortfolios = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('sim_portfolios')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setPortfolios(data as SimPortfolio[]);
    setLoading(false);
  };

  useEffect(() => { fetchPortfolios(); }, [user]);

  const createPortfolio = async () => {
    if (!user || !newName.trim()) return;
    setCreating(true);
    const capital = parseFloat(newCapital) || 100000;
    const { error } = await supabase.from('sim_portfolios').insert({
      user_id: user.id,
      name: newName.trim(),
      initial_capital: capital,
      cash_balance: capital,
    });
    if (error) {
      toast.error('Failed to create simulation');
    } else {
      toast.success('Simulation created!');
      setNewName('');
      setNewCapital('100000');
      setCreateOpen(false);
      fetchPortfolios();
    }
    setCreating(false);
  };

  if (selectedPortfolio) {
    return (
      <SimPortfolioDetail
        portfolioId={selectedPortfolio}
        onBack={() => { setSelectedPortfolio(null); fetchPortfolios(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Simulation Trading</h1>
          <p className="text-muted-foreground text-sm">Paper trade stocks & options with virtual capital</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Simulation</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Simulation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="My Paper Portfolio" />
              </div>
              <div>
                <Label>Starting Capital ($)</Label>
                <Input type="number" value={newCapital} onChange={e => setNewCapital(e.target.value)} />
              </div>
              <Button onClick={createPortfolio} disabled={creating || !newName.trim()} className="w-full">
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-center py-12">Loading...</div>
      ) : portfolios.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No simulations yet. Create one to start paper trading!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {portfolios.map(p => {
            const pnl = p.cash_balance - p.initial_capital;
            const pnlPct = (pnl / p.initial_capital) * 100;
            return (
              <Card
                key={p.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedPortfolio(p.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {format(new Date(p.created_at), 'MMM d, yyyy')}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Cash Balance</span>
                    <span className="font-mono text-sm">${p.cash_balance.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Initial Capital</span>
                    <span className="font-mono text-sm">${p.initial_capital.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
