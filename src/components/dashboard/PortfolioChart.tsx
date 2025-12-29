import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const data = [
  { month: "Jan", revenue: 580, ebitda: 95 },
  { month: "Feb", revenue: 610, ebitda: 102 },
  { month: "Mar", revenue: 645, ebitda: 110 },
  { month: "Apr", revenue: 680, ebitda: 118 },
  { month: "May", revenue: 720, ebitda: 128 },
  { month: "Jun", revenue: 755, ebitda: 135 },
  { month: "Jul", revenue: 790, ebitda: 142 },
  { month: "Aug", revenue: 810, ebitda: 148 },
  { month: "Sep", revenue: 835, ebitda: 155 },
  { month: "Oct", revenue: 860, ebitda: 162 },
  { month: "Nov", revenue: 890, ebitda: 170 },
  { month: "Dec", revenue: 920, ebitda: 178 },
];

export function PortfolioChart() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Portfolio Performance</CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-muted-foreground">Revenue ($M)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-muted-foreground">EBITDA ($M)</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorEbitda" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160 84% 39%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 28% 17%)" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222 47% 8%)",
                  border: "1px solid hsl(215 28% 17%)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 24px hsl(222 47% 3% / 0.5)",
                }}
                labelStyle={{ color: "hsl(210 40% 98%)", fontWeight: 500 }}
                itemStyle={{ color: "hsl(215 20% 65%)" }}
                formatter={(value: number) => [`$${value}M`, ""]}
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
              <Area
                type="monotone"
                dataKey="ebitda"
                stroke="hsl(160 84% 39%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorEbitda)"
                name="EBITDA"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
