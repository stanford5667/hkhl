import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shuffle,
  Calculator,
  Building2,
  Landmark,
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone,
  Mail,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface FinancingMatch {
  type: string;
  label: string;
  match: "high" | "medium" | "low";
  score: number;
  description: string;
  icon: React.ReactNode;
  criteria: string[];
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  lender_type: string | null;
  category: string | null;
}

export default function DealMatching() {
  const { user } = useAuth();

  // Calculator inputs
  const [arPercent, setArPercent] = useState(25);
  const [inventoryPercent, setInventoryPercent] = useState(20);
  const [ebitda, setEbitda] = useState(10);
  const [leverage, setLeverage] = useState(4);
  const [cashAtClose, setCashAtClose] = useState(70);
  const [sellerRollover, setSellerRollover] = useState(30);

  // Lender contacts
  const [lenderContacts, setLenderContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Calculate financing matches
  const financingMatches = useMemo((): FinancingMatch[] => {
    const assetCoverage = arPercent + inventoryPercent;
    const totalDebt = ebitda * leverage;
    const rolloverPercent = 100 - cashAtClose;

    const matches: FinancingMatch[] = [];

    // ABL Match
    const ablScore = Math.min(100, assetCoverage * 1.5);
    matches.push({
      type: "abl",
      label: "ABL Financing",
      match: ablScore >= 70 ? "high" : ablScore >= 40 ? "medium" : "low",
      score: ablScore,
      description: "Asset-based lending secured by A/R and inventory",
      icon: <Landmark className="h-5 w-5" />,
      criteria: [
        `A/R + Inventory: ${assetCoverage}% of assets`,
        assetCoverage >= 50 ? "Strong collateral base" : "Limited collateral",
        "Typical advance: 80% A/R, 50% inventory",
      ],
    });

    // Bank/Senior Debt Match
    const bankScore = leverage <= 3 ? 90 : leverage <= 4.5 ? 60 : 30;
    matches.push({
      type: "bank",
      label: "Senior Bank Debt",
      match: bankScore >= 70 ? "high" : bankScore >= 40 ? "medium" : "low",
      score: bankScore,
      description: "Traditional bank financing with lower cost of capital",
      icon: <Building2 className="h-5 w-5" />,
      criteria: [
        `Leverage: ${leverage}x EBITDA`,
        leverage <= 3.5 ? "Conservative leverage" : "Elevated leverage",
        "Requires strong credit profile",
      ],
    });

    // Mezzanine Match
    const mezzScore = leverage > 4 && leverage <= 6 ? 85 : leverage > 3 ? 50 : 25;
    matches.push({
      type: "mezzanine",
      label: "Mezzanine Debt",
      match: mezzScore >= 70 ? "high" : mezzScore >= 40 ? "medium" : "low",
      score: mezzScore,
      description: "Subordinated debt with equity kicker potential",
      icon: <TrendingUp className="h-5 w-5" />,
      criteria: [
        `Total leverage capacity: ${leverage}x+`,
        leverage > 4 ? "Good fit for stretched leverage" : "May be over-equitized",
        "Typical coupon: 12-15% with PIK",
      ],
    });

    // Unitranche Match
    const unitrancheScore = leverage >= 3.5 && leverage <= 5.5 ? 80 : 45;
    matches.push({
      type: "unitranche",
      label: "Unitranche",
      match: unitrancheScore >= 70 ? "high" : unitrancheScore >= 40 ? "medium" : "low",
      score: unitrancheScore,
      description: "Single-tranche solution combining senior and sub debt",
      icon: <DollarSign className="h-5 w-5" />,
      criteria: [
        `All-in leverage: ${leverage}x`,
        "Simplified capital structure",
        "Faster execution vs. syndicated",
      ],
    });

    // Seller Financing Match
    const sellerScore = rolloverPercent >= 20 ? 75 : rolloverPercent >= 10 ? 50 : 20;
    matches.push({
      type: "seller",
      label: "Seller Financing",
      match: sellerScore >= 70 ? "high" : sellerScore >= 40 ? "medium" : "low",
      score: sellerScore,
      description: "Seller note or earnout as part of consideration",
      icon: <Users className="h-5 w-5" />,
      criteria: [
        `Seller rollover: ${rolloverPercent}%`,
        rolloverPercent >= 20 ? "Strong alignment" : "Limited seller participation",
        "Reduces upfront cash requirement",
      ],
    });

    return matches.sort((a, b) => b.score - a.score);
  }, [arPercent, inventoryPercent, ebitda, leverage, cashAtClose]);

  // Fetch lender contacts
  useEffect(() => {
    if (!user) return;

    const fetchLenders = async () => {
      setLoadingContacts(true);
      try {
        const { data, error } = await supabase
          .from("contacts")
          .select("*")
          .eq("category", "lender")
          .limit(10);

        if (error) throw error;
        setLenderContacts(data || []);
      } catch (error) {
        console.error("Error fetching lenders:", error);
      } finally {
        setLoadingContacts(false);
      }
    };

    fetchLenders();
  }, [user]);

  const topMatch = financingMatches[0];

  // Filter contacts by lender type matching top recommendation
  const matchedLenders = useMemo(() => {
    if (!topMatch) return lenderContacts;

    const typeMap: Record<string, string[]> = {
      abl: ["abl", "asset-based", "working capital"],
      bank: ["bank", "senior", "traditional"],
      mezzanine: ["mezzanine", "mezz", "subordinated"],
      unitranche: ["unitranche", "direct lending", "private credit"],
      seller: [],
    };

    const relevantTypes = typeMap[topMatch.type] || [];
    if (relevantTypes.length === 0) return lenderContacts;

    const matched = lenderContacts.filter((c) =>
      relevantTypes.some((t) => c.lender_type?.toLowerCase().includes(t))
    );

    return matched.length > 0 ? matched : lenderContacts;
  }, [lenderContacts, topMatch]);

  const getMatchBadge = (match: "high" | "medium" | "low") => {
    switch (match) {
      case "high":
        return (
          <Badge className="bg-success/20 text-success border-success/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            High Match
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-warning/20 text-warning border-warning/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Medium
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            Low Match
          </Badge>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-up">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calculator Inputs */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-5 w-5 text-primary" />
              Financing Analysis
            </CardTitle>
            <CardDescription>
              Enter deal parameters to find optimal financing structure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Asset Composition */}
            <div className="space-y-4">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Asset Composition
              </h4>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>A/R % of Assets</Label>
                  <span className="text-primary font-medium">{arPercent}%</span>
                </div>
                <Slider
                  value={[arPercent]}
                  onValueChange={([v]) => setArPercent(v)}
                  min={0}
                  max={60}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Inventory % of Assets</Label>
                  <span className="text-primary font-medium">{inventoryPercent}%</span>
                </div>
                <Slider
                  value={[inventoryPercent]}
                  onValueChange={([v]) => setInventoryPercent(v)}
                  min={0}
                  max={50}
                  step={5}
                />
              </div>
            </div>

            {/* Deal Metrics */}
            <div className="space-y-4">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Deal Metrics
              </h4>

              <div className="space-y-2">
                <Label>EBITDA ($M)</Label>
                <Input
                  type="number"
                  value={ebitda}
                  onChange={(e) => setEbitda(Number(e.target.value))}
                  min={1}
                  max={500}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Target Leverage (x EBITDA)</Label>
                  <span className="text-primary font-medium">{leverage}x</span>
                </div>
                <Slider
                  value={[leverage]}
                  onValueChange={([v]) => setLeverage(v)}
                  min={1}
                  max={7}
                  step={0.5}
                />
              </div>
            </div>

            {/* Seller Preferences */}
            <div className="space-y-4">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Seller Preferences
              </h4>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Cash at Close</Label>
                  <span className="text-primary font-medium">{cashAtClose}%</span>
                </div>
                <Slider
                  value={[cashAtClose]}
                  onValueChange={([v]) => {
                    setCashAtClose(v);
                    setSellerRollover(100 - v);
                  }}
                  min={50}
                  max={100}
                  step={5}
                />
              </div>

              <div className="flex justify-between text-sm p-3 rounded-lg bg-secondary/50">
                <span className="text-muted-foreground">Seller Rollover</span>
                <span className="font-medium">{sellerRollover}%</span>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="p-4 rounded-lg border border-border bg-card space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Debt</span>
                <span className="font-medium">${(ebitda * leverage).toFixed(1)}M</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Asset Coverage</span>
                <span className="font-medium">{arPercent + inventoryPercent}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Enterprise Value</span>
                <span className="font-medium">${(ebitda * 8).toFixed(1)}M est.</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financing Recommendations */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Financing Structure Recommendations</CardTitle>
            <CardDescription>
              Ranked by fit based on your deal parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {financingMatches.map((match, index) => (
              <div
                key={match.type}
                className={cn(
                  "p-4 rounded-lg border transition-colors",
                  index === 0
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-border"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        match.match === "high"
                          ? "bg-success/10 text-success"
                          : match.match === "medium"
                          ? "bg-warning/10 text-warning"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {match.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground">{match.label}</h3>
                        {getMatchBadge(match.match)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{match.description}</p>
                      <ul className="space-y-1">
                        {match.criteria.map((c, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-foreground">{match.score}%</div>
                    <div className="text-xs text-muted-foreground">Match Score</div>
                    <Progress value={match.score} className="w-20 h-1.5 mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Potential Lenders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Potential Lenders
            {topMatch && (
              <Badge variant="outline" className="ml-2">
                Matched for {topMatch.label}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Contacts from your database matching the recommended financing type
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingContacts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : matchedLenders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No lender contacts found.</p>
              <p className="text-sm">Add contacts with category "Lender" to see them here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matchedLenders.map((contact) => (
                <div
                  key={contact.id}
                  className="p-4 rounded-lg border border-border/50 hover:border-border transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {contact.first_name[0]}
                        {contact.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground">
                        {contact.first_name} {contact.last_name}
                      </h4>
                      {contact.title && (
                        <p className="text-sm text-muted-foreground truncate">{contact.title}</p>
                      )}
                      {contact.lender_type && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {contact.lender_type}
                        </Badge>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                        )}
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
