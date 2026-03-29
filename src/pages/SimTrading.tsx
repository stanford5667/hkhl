import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Activity, Wallet, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { SimPortfolioDetail } from '@/components/sim-trading/SimPortfolioDetail';
import { format, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface SimPortfolio {
  id: string;
  name: string;
  initial_capital: number;
  cash_balance: number;
  status: string;
  created_at: string;
  closed_at: string | null;
  strategy_name?: string | null;
  linked_ticker?: string | null;
}

export default function SimTrading() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<SimPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCapital, setNewCapital] = useState('100000');
  const [creating, setCreating] = useState(false);

  const fetchPortfolios = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('sim_portfolios')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Failed to fetch sim portfolios:', error);
        toast.error('Failed to load simulations');
      }
      if (data) setPortfolios(data as SimPortfolio[]);
    } catch (e) {
      console.error('SimTrading fetch error:', e);
    }
    setLoading(false);
  };

  useEffect(() => { 
    fetchPortfolios(); 
  }, [user]);

  const createPortfolio = async () => {
    if (!user || !newName.trim()) return;
    setCreating(true);
    const capital = Math.max(1000, parseFloat(newCapital) || 100000);
    const { error } = await supabase.from('sim_portfolios').insert({
      user_id: user.id,
      name: newName.trim(),
      initial_capital: capital,
      cash_balance: capital,
    });
    if (error) {
      console.error('Create portfolio error:', error);
      toast.error('Failed to create simulation: ' + error.message);
    } else {
      toast.success('Simulation created!');
      setNewName('');
      setNewCapital('100000');
      setCreateOpen(false);
      fetchPortfolios();
    }
    setCreating(false);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Activity className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-bold text-foreground">Sign in to use Simulation Trading</h2>
        <p className="text-muted-foreground text-sm">Create paper trading portfolios to practice without risk.</p>
        <Button onClick={() => navigate('/auth')}>Sign In</Button>
      </div>
    );
  }

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
          <p className="text-muted-foreground text-sm">Paper trade stocks & options with virtual capital — track real performance forward</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Simulation</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Paper Trading Portfolio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Portfolio Name</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Growth Strategy" />
              </div>
              <div>
                <Label>Starting Capital ($)</Label>
                <Input type="number" value={newCapital} onChange={e => setNewCapital(e.target.value)} min="1000" step="1000" />
                <p className="text-xs text-muted-foreground mt-1">Minimum $1,000</p>
              </div>
              <Button onClick={createPortfolio} disabled={creating || !newName.trim()} className="w-full">
                {creating ? 'Creating...' : 'Create Portfolio'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      {portfolios.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Portfolios</p>
                <p className="text-lg font-bold">{portfolios.filter(p => p.status === 'active').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Capital Deployed</p>
                <p className="text-lg font-bold font-mono">
                  ${portfolios.reduce((s, p) => s + p.initial_capital, 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/30">
                <Activity className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Simulations</p>
                <p className="text-lg font-bold">{portfolios.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="text-muted-foreground text-center py-12">Loading simulations...</div>
      ) : portfolios.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-4">
            <Activity className="w-16 h-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Start Paper Trading</h3>
              <p className="text-muted-foreground text-sm mt-1">Create a virtual portfolio and practice trading stocks & options with no risk.</p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Your First Simulation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {portfolios.map(p => {
            const daysActive = differenceInDays(new Date(), new Date(p.created_at));
            return (
              <Card
                key={p.id}
                className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md"
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
                    {format(new Date(p.created_at), 'MMM d, yyyy')} • {daysActive} day{daysActive !== 1 ? 's' : ''} active
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Cash</span>
                    <span className="font-mono text-sm">${p.cash_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Initial Capital</span>
                    <span className="font-mono text-sm text-muted-foreground">${p.initial_capital.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-border text-xs text-muted-foreground text-center">
                    Click to view positions & trade →
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
