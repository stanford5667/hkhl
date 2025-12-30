import { useNavigate } from 'react-router-dom';
import { ArrowRight, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Company } from '@/hooks/useCompanies';
import { CompanyAvatar } from './CompanyAvatar';
import { HealthScore } from './HealthScore';
import { cn } from '@/lib/utils';

interface PortfolioGridViewProps {
  companies: Company[];
  onViewChange?: (view: string) => void;
}

export function PortfolioGridView({ companies, onViewChange }: PortfolioGridViewProps) {
  const navigate = useNavigate();

  // Filter only portfolio companies
  const portfolioCompanies = companies.filter(c => c.company_type === 'portfolio');

  // Calculate portfolio totals
  const totals = {
    totalRevenue: portfolioCompanies.reduce((sum, c) => sum + (c.revenue_ltm || 0), 0),
    totalEbitda: portfolioCompanies.reduce((sum, c) => sum + (c.ebitda_ltm || 0), 0),
    avgMargin: portfolioCompanies.length > 0 
      ? portfolioCompanies.reduce((sum, c) => {
          if (c.revenue_ltm && c.ebitda_ltm) {
            return sum + (c.ebitda_ltm / c.revenue_ltm) * 100;
          }
          return sum;
        }, 0) / portfolioCompanies.filter(c => c.revenue_ltm && c.ebitda_ltm).length
      : 0,
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '—';
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
    return `$${value.toFixed(0)}M`;
  };

  const getHealthScore = (company: Company) => {
    if (company.ebitda_ltm && company.revenue_ltm) {
      return Math.min(100, Math.round((company.ebitda_ltm / company.revenue_ltm) * 100 * 5));
    }
    return 75;
  };

  return (
    <div>
      {/* Portfolio Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-card border-border">
          <p className="text-muted-foreground text-sm">Total Revenue</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totals.totalRevenue)}</p>
          <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Across portfolio
          </p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-muted-foreground text-sm">Portfolio Companies</p>
          <p className="text-2xl font-bold text-foreground">{portfolioCompanies.length}</p>
          <p className="text-muted-foreground text-xs mt-1">Active investments</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-muted-foreground text-sm">Total EBITDA</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totals.totalEbitda)}</p>
          <p className="text-muted-foreground text-xs mt-1">Combined earnings</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-muted-foreground text-sm">Avg Margin</p>
          <p className="text-2xl font-bold text-emerald-400">
            {totals.avgMargin > 0 ? `${totals.avgMargin.toFixed(1)}%` : '—'}
          </p>
          <p className="text-muted-foreground text-xs mt-1">EBITDA margin</p>
        </Card>
      </div>
      
      {/* Portfolio Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {portfolioCompanies.map(company => (
          <PortfolioCard 
            key={company.id} 
            company={company} 
            healthScore={getHealthScore(company)}
            onClick={() => navigate(`/companies/${company.id}`)}
          />
        ))}
        
        {/* Add from Pipeline CTA */}
        <Card 
          className="p-6 bg-card/50 border-border border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 min-h-[280px] transition-colors"
          onClick={() => onViewChange?.('pipeline')}
        >
          <ArrowRight className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-center">
            Move deals from Pipeline<br />to add to Portfolio
          </p>
        </Card>
      </div>

      {portfolioCompanies.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No portfolio companies yet. Move deals from Pipeline to add them here.</p>
        </div>
      )}
    </div>
  );
}

interface PortfolioCardProps {
  company: Company;
  healthScore: number;
  onClick: () => void;
}

function PortfolioCard({ company, healthScore, onClick }: PortfolioCardProps) {
  const formatCurrency = (value: number | null) => {
    if (!value) return '—';
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
    return `$${value.toFixed(0)}M`;
  };

  const margin = company.revenue_ltm && company.ebitda_ltm 
    ? ((company.ebitda_ltm / company.revenue_ltm) * 100).toFixed(1)
    : null;

  return (
    <Card 
      className="bg-card border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-all"
      onClick={onClick}
    >
      {/* Health indicator bar */}
      <div className={cn(
        "h-1",
        healthScore >= 70 && "bg-emerald-500",
        healthScore >= 40 && healthScore < 70 && "bg-yellow-500",
        healthScore < 40 && "bg-rose-500"
      )} />
      
      <div className="p-4">
        {/* Company Info */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <CompanyAvatar company={company} size="lg" />
            <div>
              <p className="text-foreground font-medium">{company.name}</p>
              <p className="text-muted-foreground text-sm">{company.industry || 'N/A'}</p>
            </div>
          </div>
          <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30">Portfolio</Badge>
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 py-3 border-y border-border">
          <div>
            <p className="text-muted-foreground text-xs">Revenue</p>
            <p className="text-foreground font-medium">{formatCurrency(company.revenue_ltm)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">EBITDA</p>
            <p className="text-foreground font-medium">{formatCurrency(company.ebitda_ltm)}</p>
          </div>
        </div>
        
        {/* Performance Indicators */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Health:</span>
            <HealthScore score={healthScore} size="sm" showLabel />
          </div>
          {margin && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Margin:</span>
              <span className={cn(
                "text-sm font-medium",
                parseFloat(margin) >= 20 ? "text-emerald-400" : parseFloat(margin) >= 10 ? "text-yellow-400" : "text-rose-400"
              )}>
                {margin}%
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
