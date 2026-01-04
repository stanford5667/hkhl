import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { 
  Target, Settings, RefreshCw, TrendingUp, TrendingDown, 
  Sparkles, AlertTriangle, Clock, ChevronDown, ChevronUp,
  ExternalLink, Calculator, Eye, X, Trophy, Percent, BarChart3,
  FileText, Zap, MessageSquare, Anchor, Shield
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { TradeIdeaCard } from './TradeIdeaCard';
import { FullAnalysisModal } from './FullAnalysisModal';
import { CalculateSizeModal } from './CalculateSizeModal';

export interface TradeIdea {
  id: string;
  market_id: string | null;
  generated_at: string;
  direction: string;
  entry_price: number;
  target_price: number;
  stop_loss_price: number;
  confidence: number;
  thesis_summary: string;
  thesis_detailed: string;
  supporting_evidence: Array<{
    type: string;
    description: string;
    strength: string;
    source_id?: string;
  }>;
  counter_arguments: Array<{
    argument: string;
    severity: string;
    mitigation: string;
  }>;
  risk_level: string;
  suggested_allocation: number;
  kelly_fraction: number;
  time_horizon: string;
  catalyst_events: Array<{
    event: string;
    date: string;
    impact: string;
  }>;
  status: string;
  outcome: string | null;
  actual_return: number | null;
  is_public: boolean;
  // Joined market data
  market?: {
    title: string;
    platform: string;
    category: string;
  };
}

interface PerformanceStats {
  winRate: number;
  totalReturn: number;
  ideasCount: number;
  avgConfidence: number;
}

export function TradeIdeasDashboard() {
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [selectedIdea, setSelectedIdea] = useState<TradeIdea | null>(null);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [showCalculateSize, setShowCalculateSize] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userBankroll, setUserBankroll] = useState(10000);
  const [riskTolerance, setRiskTolerance] = useState(50);

  const queryClient = useQueryClient();

  // Fetch trade ideas
  const { data: ideas = [], isLoading, refetch } = useQuery({
    queryKey: ['trade-ideas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trade_ideas')
        .select('*')
        .eq('is_public', true)
        .order('generated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Fetch market data for ideas that have market_id
      const marketIds = (data || []).map(i => i.market_id).filter(Boolean) as string[];
      let marketsMap: Record<string, { title: string; platform: string; category: string }> = {};
      
      if (marketIds.length > 0) {
        const { data: markets } = await supabase
          .from('prediction_markets')
          .select('id, title, platform, category')
          .in('id', marketIds);
        
        if (markets) {
          marketsMap = markets.reduce((acc, m) => {
            acc[m.id] = { title: m.title, platform: m.platform, category: m.category };
            return acc;
          }, {} as Record<string, { title: string; platform: string; category: string }>);
        }
      }
      
      // Transform data to match TradeIdea interface
      return (data || []).map((item): TradeIdea => ({
        id: item.id,
        market_id: item.market_id,
        generated_at: item.generated_at || '',
        direction: item.direction || '',
        entry_price: item.entry_price || 0,
        target_price: item.target_price || 0,
        stop_loss_price: item.stop_loss_price || 0,
        confidence: item.confidence || 0,
        thesis_summary: item.thesis_summary || '',
        thesis_detailed: item.thesis_detailed || '',
        supporting_evidence: (item.supporting_evidence as TradeIdea['supporting_evidence']) || [],
        counter_arguments: (item.counter_arguments as TradeIdea['counter_arguments']) || [],
        risk_level: item.risk_level || 'medium',
        suggested_allocation: item.suggested_allocation || 0,
        kelly_fraction: item.kelly_fraction || 0,
        time_horizon: item.time_horizon || '',
        catalyst_events: (item.catalyst_events as TradeIdea['catalyst_events']) || [],
        status: item.status || 'active',
        outcome: item.outcome,
        actual_return: item.actual_return,
        is_public: item.is_public ?? true,
        market: item.market_id ? marketsMap[item.market_id] : undefined,
      }));
    },
  });

  // Generate new ideas mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-trade-ideas', {
        body: {
          mode: 'generate_new',
          filters: {
            categories: categoryFilter !== 'all' ? [categoryFilter] : undefined,
            min_confidence: confidenceFilter !== 'all' ? parseInt(confidenceFilter) : undefined,
            max_risk: riskFilter !== 'all' ? riskFilter : undefined,
            platforms: platformFilter !== 'all' ? [platformFilter] : undefined,
          },
          count: 10,
          user_context: {
            bankroll: userBankroll,
            risk_tolerance: riskTolerance < 33 ? 'conservative' : riskTolerance < 66 ? 'moderate' : 'aggressive',
          },
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade-ideas'] });
    },
  });

  // Calculate performance stats
  const stats = useMemo<PerformanceStats>(() => {
    const resolvedIdeas = ideas.filter(i => i.outcome);
    const wins = resolvedIdeas.filter(i => i.outcome === 'win').length;
    const winRate = resolvedIdeas.length > 0 ? (wins / resolvedIdeas.length) * 100 : 0;
    const totalReturn = resolvedIdeas.reduce((sum, i) => sum + (i.actual_return || 0), 0);
    const avgConfidence = ideas.length > 0
      ? ideas.reduce((sum, i) => sum + i.confidence, 0) / ideas.length
      : 0;

    return {
      winRate,
      totalReturn,
      ideasCount: ideas.length,
      avgConfidence,
    };
  }, [ideas]);

  // Filter ideas
  const filteredIdeas = useMemo(() => {
    return ideas.filter(idea => {
      if (confidenceFilter !== 'all' && idea.confidence < parseInt(confidenceFilter)) return false;
      if (riskFilter !== 'all' && idea.risk_level !== riskFilter) return false;
      if (categoryFilter !== 'all' && idea.market?.category !== categoryFilter) return false;
      if (platformFilter !== 'all' && idea.market?.platform !== platformFilter) return false;
      return true;
    });
  }, [ideas, confidenceFilter, riskFilter, categoryFilter, platformFilter]);

  // Get unique values for filters
  const categories = useMemo(() => {
    const cats = new Set(ideas.map(i => i.market?.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [ideas]);

  const platforms = useMemo(() => {
    const plats = new Set(ideas.map(i => i.market?.platform).filter(Boolean));
    return Array.from(plats) as string[];
  }, [ideas]);

  const handleViewAnalysis = (idea: TradeIdea) => {
    setSelectedIdea(idea);
    setShowFullAnalysis(true);
  };

  const handleCalculateSize = (idea: TradeIdea) => {
    setSelectedIdea(idea);
    setShowCalculateSize(true);
  };

  const handleDismiss = async (ideaId: string) => {
    // In a real app, this would mark as dismissed in user preferences
    console.log('Dismissed idea:', ideaId);
  };

  const handleTrack = async (ideaId: string) => {
    // In a real app, this would add to user's tracked ideas
    console.log('Tracking idea:', ideaId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Trade Ideas</h1>
            <p className="text-sm text-muted-foreground">AI-generated actionable recommendations</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate New
          </Button>
          
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generation Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label>Bankroll ($)</Label>
                  <Input
                    type="number"
                    value={userBankroll}
                    onChange={(e) => setUserBankroll(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Risk Tolerance</Label>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">Conservative</span>
                    <Slider
                      value={[riskTolerance]}
                      onValueChange={([v]) => setRiskTolerance(v)}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">Aggressive</span>
                  </div>
                </div>
                <Separator />
                <p className="text-sm text-muted-foreground">
                  These settings affect position sizing recommendations and which trade ideas are generated.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Win Rate</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {stats.winRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Total Return</span>
            </div>
            <p className={cn(
              "text-2xl font-bold mt-1",
              stats.totalReturn >= 0 ? "text-emerald-500" : "text-rose-500"
            )}>
              {stats.totalReturn >= 0 ? '+' : ''}{stats.totalReturn.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Ideas YTD</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.ideasCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Avg Confidence</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.avgConfidence.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Filters:</span>
        
        <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Confidence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Confidence</SelectItem>
            <SelectItem value="80">80%+</SelectItem>
            <SelectItem value="70">70%+</SelectItem>
            <SelectItem value="60">60%+</SelectItem>
            <SelectItem value="50">50%+</SelectItem>
          </SelectContent>
        </Select>

        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Risk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {platforms.map(plat => (
              <SelectItem key={plat} value={plat}>{plat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />
        
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
          {filteredIdeas.length} ideas
        </Badge>
      </div>

      {/* Trade Ideas List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredIdeas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 text-center">
              <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="font-medium">No trade ideas found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Generate New" to create AI-powered trade recommendations
              </p>
              <Button className="mt-4" onClick={() => generateMutation.mutate()}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Ideas
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-4 pr-4">
              {filteredIdeas.map(idea => (
                <TradeIdeaCard
                  key={idea.id}
                  idea={idea}
                  userBankroll={userBankroll}
                  onViewAnalysis={() => handleViewAnalysis(idea)}
                  onCalculateSize={() => handleCalculateSize(idea)}
                  onTrack={() => handleTrack(idea.id)}
                  onDismiss={() => handleDismiss(idea.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Full Analysis Modal */}
      <FullAnalysisModal
        idea={selectedIdea}
        open={showFullAnalysis}
        onOpenChange={setShowFullAnalysis}
      />

      {/* Calculate Size Modal */}
      <CalculateSizeModal
        idea={selectedIdea}
        open={showCalculateSize}
        onOpenChange={setShowCalculateSize}
        userBankroll={userBankroll}
        onBankrollChange={setUserBankroll}
      />
    </div>
  );
}
