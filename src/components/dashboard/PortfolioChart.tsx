import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/hooks/useAppData";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Building2 } from "lucide-react";

const COLORS = ['hsl(217 91% 60%)', 'hsl(160 84% 39%)', 'hsl(38 92% 50%)', 'hsl(262 83% 58%)'];

export function PortfolioChart() {
  const { stats, isLoading, companies } = useDashboardStats();
  
  // Create stage distribution data
  const stageData = [
    { name: 'Pipeline', value: stats.pipeline, color: COLORS[0] },
    { name: 'Portfolio', value: stats.portfolio, color: COLORS[1] },
    { name: 'Prospect', value: stats.prospect, color: COLORS[2] },
    { name: 'Passed', value: stats.passed, color: COLORS[3] },
  ].filter(item => item.value > 0);

  // Group companies by industry for revenue breakdown
  const industryData = companies.reduce((acc, company) => {
    const industry = company.industry || 'Other';
    const existing = acc.find(item => item.name === industry);
    if (existing) {
      existing.revenue += company.revenue_ltm || 0;
      existing.ebitda += company.ebitda_ltm || 0;
    } else {
      acc.push({
        name: industry,
        revenue: company.revenue_ltm || 0,
        ebitda: company.ebitda_ltm || 0,
      });
    }
    return acc;
  }, [] as { name: string; revenue: number; ebitda: number }[]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Portfolio Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = stageData.length > 0 || industryData.length > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Portfolio Overview</CardTitle>
          {hasData && (
            <div className="flex items-center gap-4 text-sm">
              {stageData.map((stage, index) => (
                <div key={stage.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-muted-foreground">{stage.name} ({stage.value})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <Building2 className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm font-medium">No companies yet</p>
            <p className="text-xs">Add companies to see portfolio analytics</p>
          </div>
        ) : (
          <div className="h-[300px] w-full flex items-center justify-center gap-8">
            {/* Pie Chart for Stage Distribution */}
            <div className="h-full w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {stageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(222 47% 8%)",
                      border: "1px solid hsl(215 28% 17%)",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(210 40% 98%)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Industry Revenue Chart */}
            {industryData.length > 0 && industryData.some(d => d.revenue > 0) && (
              <div className="h-full w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={industryData.slice(0, 6)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 28% 17%)" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(215 20% 55%)", fontSize: 10 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }}
                      tickFormatter={(value) => `$${value}M`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222 47% 8%)",
                        border: "1px solid hsl(215 28% 17%)",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`$${value}M`, "Revenue"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(217 91% 60%)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      name="Revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
