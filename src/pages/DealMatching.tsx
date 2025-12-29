import { Shuffle, Landmark, DollarSign, Building2, TrendingUp, Badge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge as BadgeComponent } from '@/components/ui/badge';

export default function DealMatching() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="h1 flex items-center gap-3">
          <Shuffle className="h-8 w-8 text-primary" />
          Deal Matching
        </h1>
        <p className="text-muted-foreground mt-1">
          Match deals with optimal financing structures and capital sources
        </p>
      </div>

      {/* Financing Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Landmark className="h-5 w-5 text-primary" />
              ABL Financing
              <BadgeComponent variant="outline" className="ml-auto">Coming Soon</BadgeComponent>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Deals with high asset coverage (≥80% of loan value) suitable for
              asset-based lending structures.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-success" />
              Bank Financing
              <BadgeComponent variant="outline" className="ml-auto">Coming Soon</BadgeComponent>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Investment-grade or near-investment-grade deals suitable for
              traditional bank syndication.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-warning" />
              Private Credit
              <BadgeComponent variant="outline" className="ml-auto">Coming Soon</BadgeComponent>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Middle-market deals with strong cash flow suitable for direct
              lenders and unitranche solutions.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              Bond Investors
              <BadgeComponent variant="outline" className="ml-auto">Coming Soon</BadgeComponent>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Larger deals with structures suitable for high-yield bond issuance
              or institutional placement.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Badge className="h-5 w-5 text-cyan-400" />
              Platform Services
              <BadgeComponent variant="outline" className="ml-auto">Coming Soon</BadgeComponent>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Owners willing to exchange equity for operational support and
              platform-building services.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>How Deal Matching Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium shrink-0">
              1
            </div>
            <div>
              <h4 className="font-medium text-foreground">Analyze Deal Profile</h4>
              <p className="text-sm text-muted-foreground">
                AI reviews financials, assets, and owner preferences to classify deal structure.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium shrink-0">
              2
            </div>
            <div>
              <h4 className="font-medium text-foreground">Match Financing Sources</h4>
              <p className="text-sm text-muted-foreground">
                Identify optimal lenders based on deal size, industry, and structure requirements.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium shrink-0">
              3
            </div>
            <div>
              <h4 className="font-medium text-foreground">Stress Test Assumptions</h4>
              <p className="text-sm text-muted-foreground">
                Run sensitivity analysis on key assumptions to validate financing viability.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
