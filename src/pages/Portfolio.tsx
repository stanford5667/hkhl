import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendingUp, TrendingDown, DollarSign, Building2, ArrowUpRight, ArrowDownRight } from "lucide-react";

const portfolioCompanies = [
  {
    id: "1",
    name: "TechCo",
    invested: 45,
    current: 142,
    moic: 3.2,
    irr: 32,
    revenueGrowth: 24,
    ebitdaGrowth: 31,
    status: "on-track",
  },
  {
    id: "2",
    name: "MedDevice",
    invested: 62,
    current: 98,
    moic: 1.6,
    irr: 18,
    revenueGrowth: 12,
    ebitdaGrowth: 8,
    status: "monitor",
  },
  {
    id: "3",
    name: "LogiCorp",
    invested: 38,
    current: 89,
    moic: 2.3,
    irr: 28,
    revenueGrowth: 18,
    ebitdaGrowth: 22,
    status: "on-track",
  },
  {
    id: "4",
    name: "RetailCo",
    invested: 55,
    current: 71,
    moic: 1.3,
    irr: 11,
    revenueGrowth: -3,
    ebitdaGrowth: -8,
    status: "at-risk",
  },
];

export default function Portfolio() {
  const totalInvested = portfolioCompanies.reduce((sum, c) => sum + c.invested, 0);
  const totalCurrent = portfolioCompanies.reduce((sum, c) => sum + c.current, 0);
  const avgMoic = (portfolioCompanies.reduce((sum, c) => sum + c.moic, 0) / portfolioCompanies.length).toFixed(1);
  const avgIrr = (portfolioCompanies.reduce((sum, c) => sum + c.irr, 0) / portfolioCompanies.length).toFixed(0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "on-track":
        return <Badge variant="success">On Track</Badge>;
      case "monitor":
        return <Badge variant="warning">Monitor</Badge>;
      case "at-risk":
        return <Badge variant="destructive">At Risk</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="p-8 space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="h1">Portfolio</h1>
          <p className="text-muted-foreground mt-1">
            {portfolioCompanies.length} active investments • 3 realized exits
          </p>
        </div>
        <Button variant="outline">Export Report</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 stagger-children">
        <MetricCard
          title="Total Value"
          value={`$${totalCurrent}M`}
          change={((totalCurrent - totalInvested) / totalInvested * 100)}
          subtitle="vs cost"
          icon={<DollarSign className="h-5 w-5" />}
          variant="success"
        />
        <MetricCard
          title="Total IRR"
          value={`${avgIrr}%`}
          subtitle="vs 22% target"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Total MOIC"
          value={`${avgMoic}x`}
          subtitle="vs 2.0x target"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Companies"
          value={`${portfolioCompanies.length}`}
          subtitle="Active"
          icon={<Building2 className="h-5 w-5" />}
        />
      </div>

      {/* Portfolio Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Portfolio Companies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Company
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Invested
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Current
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    MOIC
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    IRR
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    EBITDA
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {portfolioCompanies.map((company) => (
                  <tr
                    key={company.id}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-4">
                      <span className="font-medium text-foreground">{company.name}</span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-muted-foreground">
                      ${company.invested}M
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-foreground">
                      ${company.current}M
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-foreground">
                      {company.moic}x
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-mono text-success">{company.irr}%</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`flex items-center justify-end gap-1 font-mono ${company.revenueGrowth >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {company.revenueGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(company.revenueGrowth)}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`flex items-center justify-end gap-1 font-mono ${company.ebitdaGrowth >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {company.ebitdaGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(company.ebitdaGrowth)}%
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(company.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
