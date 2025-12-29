import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Save,
  Copy,
  Loader2,
  TrendingUp,
  BarChart3,
  Table as TableIcon,
  Settings2,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from "recharts";
import { useModels, Model } from "@/hooks/useModels";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Assumptions {
  revenueGrowth: number;
  ebitdaMargin: number;
  capexPercent: number;
  nwcPercent: number;
  exitMultiple: number;
  entryMultiple: number;
  leverage: number;
  interestRate: number;
  holdingPeriod: number;
}

const defaultAssumptions: Assumptions = {
  revenueGrowth: 8,
  ebitdaMargin: 25,
  capexPercent: 3,
  nwcPercent: 10,
  exitMultiple: 8,
  entryMultiple: 7,
  leverage: 50,
  interestRate: 6,
  holdingPeriod: 5,
};

export default function ModelEditor() {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getModel, updateModel, saveAsNewVersion, saving } = useModels();

  const [model, setModel] = useState<Model | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [assumptions, setAssumptions] = useState<Assumptions>(defaultAssumptions);
  const [activeTab, setActiveTab] = useState("projections");

  useEffect(() => {
    if (!modelId || !user) return;

    const loadModel = async () => {
      setLoading(true);
      const data = await getModel(modelId);
      if (data) {
        setModel(data);
        if (data.assumptions) {
          setAssumptions({ ...defaultAssumptions, ...data.assumptions });
        }
        // Fetch company name
        const { data: company } = await supabase
          .from("companies")
          .select("name")
          .eq("id", data.company_id)
          .maybeSingle();
        if (company) setCompanyName(company.name);
      }
      setLoading(false);
    };

    loadModel();
  }, [modelId, user]);

  const handleAssumptionChange = useCallback((key: keyof Assumptions, value: number) => {
    setAssumptions((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Calculate projections based on assumptions
  const projections = useMemo(() => {
    const baseRevenue = model?.historical_data?.revenue || 100;
    const years = [];
    let currentRevenue = baseRevenue;

    for (let i = 0; i <= assumptions.holdingPeriod; i++) {
      const revenue = i === 0 ? baseRevenue : currentRevenue * (1 + assumptions.revenueGrowth / 100);
      const ebitda = revenue * (assumptions.ebitdaMargin / 100);
      const capex = revenue * (assumptions.capexPercent / 100);
      const nwcChange = i === 0 ? 0 : (revenue - currentRevenue) * (assumptions.nwcPercent / 100);
      const freeCashFlow = ebitda - capex - nwcChange;

      years.push({
        year: `Year ${i}`,
        revenue: Math.round(revenue * 10) / 10,
        ebitda: Math.round(ebitda * 10) / 10,
        capex: Math.round(capex * 10) / 10,
        nwcChange: Math.round(nwcChange * 10) / 10,
        freeCashFlow: Math.round(freeCashFlow * 10) / 10,
      });

      currentRevenue = revenue;
    }

    return years;
  }, [assumptions, model?.historical_data]);

  // Calculate returns
  const returns = useMemo(() => {
    if (projections.length < 2) return { irr: 0, moic: 0, exitValue: 0 };

    const entryEbitda = projections[0].ebitda;
    const exitEbitda = projections[projections.length - 1].ebitda;
    const entryEV = entryEbitda * assumptions.entryMultiple;
    const exitEV = exitEbitda * assumptions.exitMultiple;

    const debtAmount = entryEV * (assumptions.leverage / 100);
    const equityInvested = entryEV - debtAmount;

    // Simple debt paydown from FCF
    let remainingDebt = debtAmount;
    for (let i = 1; i < projections.length; i++) {
      const interestPayment = remainingDebt * (assumptions.interestRate / 100);
      const debtPaydown = Math.min(remainingDebt, projections[i].freeCashFlow - interestPayment);
      remainingDebt = Math.max(0, remainingDebt - debtPaydown);
    }

    const equityValue = exitEV - remainingDebt;
    const moic = equityValue / equityInvested;
    const irr = (Math.pow(moic, 1 / assumptions.holdingPeriod) - 1) * 100;

    return {
      irr: Math.round(irr * 10) / 10,
      moic: Math.round(moic * 100) / 100,
      exitValue: Math.round(exitEV),
      equityValue: Math.round(equityValue),
      entryEV: Math.round(entryEV),
    };
  }, [projections, assumptions]);

  const handleSave = async () => {
    if (!modelId) return;
    await updateModel(modelId, {
      assumptions,
      modelData: { projections, returns },
    });
  };

  const handleSaveNewVersion = async () => {
    if (!modelId) return;
    const newModel = await saveAsNewVersion(modelId, {
      assumptions,
      modelData: { projections, returns },
    });
    if (newModel) {
      navigate(`/models/${newModel.id}/edit`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="p-8">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Model not found</h2>
          <Button variant="outline" onClick={() => navigate("/models")}>
            Back to Models
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Sidebar - Assumptions */}
      <div className="w-80 border-r border-border bg-card/30 flex flex-col">
        <div className="p-4 border-b border-border">
          <Button variant="ghost" size="sm" onClick={() => navigate("/models")} className="mb-3">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="font-semibold text-foreground">{model.name}</h2>
          <p className="text-sm text-muted-foreground">{companyName}</p>
          <Badge variant="outline" className="mt-2">
            {model.model_type.toUpperCase()}
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Settings2 className="h-4 w-4" />
            Assumptions
          </div>

          <div className="space-y-5">
            {/* Growth & Margins */}
            <div className="space-y-4">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Operating
              </h4>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Revenue Growth</Label>
                  <span className="text-primary font-medium">{assumptions.revenueGrowth}%</span>
                </div>
                <Slider
                  value={[assumptions.revenueGrowth]}
                  onValueChange={([v]) => handleAssumptionChange("revenueGrowth", v)}
                  min={-10}
                  max={30}
                  step={0.5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>EBITDA Margin</Label>
                  <span className="text-primary font-medium">{assumptions.ebitdaMargin}%</span>
                </div>
                <Slider
                  value={[assumptions.ebitdaMargin]}
                  onValueChange={([v]) => handleAssumptionChange("ebitdaMargin", v)}
                  min={5}
                  max={50}
                  step={0.5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>CapEx % Revenue</Label>
                  <span className="text-primary font-medium">{assumptions.capexPercent}%</span>
                </div>
                <Slider
                  value={[assumptions.capexPercent]}
                  onValueChange={([v]) => handleAssumptionChange("capexPercent", v)}
                  min={1}
                  max={15}
                  step={0.5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>NWC % Revenue</Label>
                  <span className="text-primary font-medium">{assumptions.nwcPercent}%</span>
                </div>
                <Slider
                  value={[assumptions.nwcPercent]}
                  onValueChange={([v]) => handleAssumptionChange("nwcPercent", v)}
                  min={0}
                  max={25}
                  step={0.5}
                />
              </div>
            </div>

            <Separator />

            {/* Transaction */}
            <div className="space-y-4">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Transaction
              </h4>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Entry Multiple</Label>
                  <span className="text-primary font-medium">{assumptions.entryMultiple}x</span>
                </div>
                <Slider
                  value={[assumptions.entryMultiple]}
                  onValueChange={([v]) => handleAssumptionChange("entryMultiple", v)}
                  min={4}
                  max={15}
                  step={0.5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Exit Multiple</Label>
                  <span className="text-primary font-medium">{assumptions.exitMultiple}x</span>
                </div>
                <Slider
                  value={[assumptions.exitMultiple]}
                  onValueChange={([v]) => handleAssumptionChange("exitMultiple", v)}
                  min={4}
                  max={15}
                  step={0.5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Leverage</Label>
                  <span className="text-primary font-medium">{assumptions.leverage}%</span>
                </div>
                <Slider
                  value={[assumptions.leverage]}
                  onValueChange={([v]) => handleAssumptionChange("leverage", v)}
                  min={0}
                  max={70}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Interest Rate</Label>
                  <span className="text-primary font-medium">{assumptions.interestRate}%</span>
                </div>
                <Slider
                  value={[assumptions.interestRate]}
                  onValueChange={([v]) => handleAssumptionChange("interestRate", v)}
                  min={3}
                  max={15}
                  step={0.5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Holding Period</Label>
                  <span className="text-primary font-medium">{assumptions.holdingPeriod} years</span>
                </div>
                <Slider
                  value={[assumptions.holdingPeriod]}
                  onValueChange={([v]) => handleAssumptionChange("holdingPeriod", v)}
                  min={3}
                  max={10}
                  step={1}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Buttons */}
        <div className="p-4 border-t border-border space-y-2">
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
          <Button variant="outline" className="w-full" onClick={handleSaveNewVersion} disabled={saving}>
            <Copy className="h-4 w-4 mr-2" />
            Save as New Version
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Returns Summary */}
        <div className="p-4 border-b border-border bg-card/30">
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">IRR</p>
                <p className="text-2xl font-bold text-primary">{returns.irr}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">MOIC</p>
                <p className="text-2xl font-bold text-foreground">{returns.moic}x</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Entry EV</p>
                <p className="text-2xl font-bold text-foreground">${returns.entryEV}M</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Exit Equity</p>
                <p className="text-2xl font-bold text-foreground">${returns.equityValue}M</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-4 pt-4 border-b border-border">
            <TabsList>
              <TabsTrigger value="projections" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Projections
              </TabsTrigger>
              <TabsTrigger value="bridge" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                EBITDA Bridge
              </TabsTrigger>
              <TabsTrigger value="cashflow" className="gap-2">
                <TableIcon className="h-4 w-4" />
                Cash Flow Table
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="projections" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base">Revenue & EBITDA Projections</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={projections}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="year" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        fill="hsl(var(--primary) / 0.2)"
                        stroke="hsl(var(--primary))"
                        name="Revenue"
                      />
                      <Bar dataKey="ebitda" fill="hsl(var(--chart-2))" name="EBITDA" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bridge" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base">EBITDA Bridge (Entry to Exit)</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: "Entry EBITDA", value: projections[0]?.ebitda || 0, fill: "hsl(var(--primary))" },
                        { name: "Revenue Growth", value: (projections[projections.length - 1]?.ebitda || 0) - (projections[0]?.ebitda || 0), fill: "hsl(var(--chart-2))" },
                        { name: "Exit EBITDA", value: projections[projections.length - 1]?.ebitda || 0, fill: "hsl(var(--chart-3))" },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="value" name="EBITDA ($M)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cashflow" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cash Flow Projections</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Metric</th>
                          {projections.map((p) => (
                            <th key={p.year} className="text-right py-3 px-4 font-medium text-muted-foreground">
                              {p.year}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4 font-medium">Revenue</td>
                          {projections.map((p) => (
                            <td key={p.year} className="text-right py-3 px-4">
                              ${p.revenue}M
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4 font-medium">EBITDA</td>
                          {projections.map((p) => (
                            <td key={p.year} className="text-right py-3 px-4">
                              ${p.ebitda}M
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4 text-muted-foreground">(-) CapEx</td>
                          {projections.map((p) => (
                            <td key={p.year} className="text-right py-3 px-4 text-destructive">
                              (${p.capex}M)
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4 text-muted-foreground">(-) ∆NWC</td>
                          {projections.map((p) => (
                            <td key={p.year} className="text-right py-3 px-4 text-destructive">
                              {p.nwcChange > 0 ? `($${p.nwcChange}M)` : "—"}
                            </td>
                          ))}
                        </tr>
                        <tr className="bg-secondary/30">
                          <td className="py-3 px-4 font-semibold">Free Cash Flow</td>
                          {projections.map((p) => (
                            <td key={p.year} className="text-right py-3 px-4 font-semibold text-primary">
                              ${p.freeCashFlow}M
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
