import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Copy, DollarSign, MousePointerClick, UserPlus, TrendingUp, LinkIcon, CheckCircle2, Clock, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

interface AffiliateData {
  id: string;
  affiliate_code: string;
  status: string;
  commission_rate: number;
  commission_type: string;
  total_clicks: number;
  total_referrals: number;
  total_earnings: number;
  total_paid: number;
  payment_email: string | null;
  payment_method: string | null;
  applied_at: string;
  approved_at: string | null;
}

interface Referral {
  id: string;
  click_at: string;
  signed_up_at: string | null;
  converted_at: string | null;
  conversion_amount: number | null;
  commission_amount: number | null;
  commission_status: string;
}

export default function Affiliate() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [paymentEmail, setPaymentEmail] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchAffiliateData();
  }, [user]);

  const fetchAffiliateData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("affiliates")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (data) {
      setAffiliate(data as any);
      setPaymentEmail(data.payment_email || "");
      
      const { data: refs } = await supabase
        .from("affiliate_referrals")
        .select("id, click_at, signed_up_at, converted_at, conversion_amount, commission_amount, commission_status")
        .eq("affiliate_id", data.id)
        .order("click_at", { ascending: false })
        .limit(50);
      
      setReferrals((refs as any[]) || []);
    }
    setLoading(false);
  };

  const applyAsAffiliate = async () => {
    if (!user) return;
    setApplying(true);
    try {
      const code = user.email?.split("@")[0]?.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) 
        || Math.random().toString(36).slice(2, 10).toUpperCase();

      const { error } = await supabase.from("affiliates").insert({
        user_id: user.id,
        affiliate_code: code,
        payment_email: user.email,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("You've already applied to the affiliate program.");
        } else {
          throw error;
        }
      } else {
        toast.success("Application submitted! We'll review it shortly.");
        fetchAffiliateData();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to apply");
    } finally {
      setApplying(false);
    }
  };

  const savePaymentInfo = async () => {
    if (!affiliate) return;
    setSavingPayment(true);
    const { error } = await supabase
      .from("affiliates")
      .update({ payment_email: paymentEmail })
      .eq("id", affiliate.id);
    
    if (error) toast.error("Failed to save");
    else toast.success("Payment info saved!");
    setSavingPayment(false);
  };

  const copyLink = () => {
    if (!affiliate) return;
    const link = `https://aiassetlabs.com?ref=${affiliate.affiliate_code}`;
    navigator.clipboard.writeText(link);
    toast.success("Affiliate link copied!");
  };

  const affiliateLink = affiliate ? `https://aiassetlabs.com?ref=${affiliate.affiliate_code}` : "";

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not yet an affiliate - show application
  if (!affiliate) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <PageHeader icon={DollarSign} title="Affiliate Program" subtitle="Earn recurring commissions by referring new members" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <Card className="border-primary/20">
            <CardHeader className="text-center">
              <div className="mx-auto p-4 rounded-full bg-primary/10 border border-primary/20 w-fit mb-4">
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Join Our Affiliate Program</CardTitle>
              <CardDescription className="text-base mt-2">
                Earn <span className="font-semibold text-primary">20% recurring commission</span> on every
                subscription payment from users you refer. That's passive income for as long as they stay subscribed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50 border">
                  <LinkIcon className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <p className="font-medium text-sm">Get Your Link</p>
                  <p className="text-xs text-muted-foreground">Unique trackable URL</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50 border">
                  <UserPlus className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <p className="font-medium text-sm">Refer Users</p>
                  <p className="text-xs text-muted-foreground">90-day attribution window</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50 border">
                  <TrendingUp className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <p className="font-medium text-sm">Earn Forever</p>
                  <p className="text-xs text-muted-foreground">Recurring commissions</p>
                </div>
              </div>
              <Button onClick={applyAsAffiliate} disabled={applying} className="w-full" size="lg">
                {applying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Apply Now
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Applications are typically reviewed within 24 hours.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Pending state
  if (affiliate.status === "pending") {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <PageHeader icon={Clock} title="Affiliate Program" subtitle="Your application is under review" />
        <Card className="mt-6">
          <CardContent className="text-center py-12">
            <Clock className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h2 className="text-xl font-semibold mb-2">Application Pending</h2>
            <p className="text-muted-foreground">
              Your affiliate application is being reviewed. You'll be notified once it's approved.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Applied on {new Date(affiliate.applied_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (affiliate.status === "rejected") {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <PageHeader icon={XCircle} title="Affiliate Program" subtitle="Application status" />
        <Card className="mt-6">
          <CardContent className="text-center py-12">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Application Not Approved</h2>
            <p className="text-muted-foreground">
              Unfortunately, your application wasn't approved at this time. Feel free to reach out to support for details.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Approved affiliate dashboard
  const unpaidEarnings = affiliate.total_earnings - affiliate.total_paid;
  const conversionRate = affiliate.total_clicks > 0 
    ? ((affiliate.total_referrals / affiliate.total_clicks) * 100).toFixed(1) 
    : "0";

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <PageHeader
        icon={TrendingUp}
        title="Affiliate Dashboard"
        subtitle="Track your referrals, earnings, and manage your affiliate account"
        iconColor="text-emerald-400"
        iconBgGradient="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MousePointerClick className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{affiliate.total_clicks}</p>
                <p className="text-xs text-muted-foreground">Total Clicks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <UserPlus className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{affiliate.total_referrals}</p>
                <p className="text-xs text-muted-foreground">Referrals ({conversionRate}%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">${affiliate.total_earnings.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Total Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <TrendingUp className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">${unpaidEarnings.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Unpaid Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Affiliate Link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Your Affiliate Link
          </CardTitle>
          <CardDescription>Share this link to earn {affiliate.commission_rate}% recurring commission</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={affiliateLink} readOnly className="font-mono text-sm" />
            <Button onClick={copyLink} variant="outline" className="shrink-0">
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span>Code: <code className="font-mono font-semibold text-foreground">{affiliate.affiliate_code}</code></span>
            <span>•</span>
            <span>Commission: {affiliate.commission_rate}% {affiliate.commission_type}</span>
            <span>•</span>
            <span>90-day cookie</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="referrals">
        <TabsList>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="settings">Payment Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {referrals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MousePointerClick className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No referrals yet. Share your link to get started!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Sale</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((ref) => (
                      <TableRow key={ref.id}>
                        <TableCell className="text-sm">
                          {new Date(ref.click_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {ref.converted_at ? (
                            <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Converted
                            </Badge>
                          ) : ref.signed_up_at ? (
                            <Badge variant="secondary">
                              <UserPlus className="h-3 w-3 mr-1" /> Signed Up
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <MousePointerClick className="h-3 w-3 mr-1" /> Click
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {ref.conversion_amount ? `$${ref.conversion_amount.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {ref.commission_amount ? `$${ref.commission_amount.toFixed(2)}` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Information</CardTitle>
              <CardDescription>Where should we send your commission payouts?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>PayPal / Payment Email</Label>
                <Input
                  value={paymentEmail}
                  onChange={(e) => setPaymentEmail(e.target.value)}
                  placeholder="your@paypal.com"
                  type="email"
                />
              </div>
              <Button onClick={savePaymentInfo} disabled={savingPayment}>
                {savingPayment ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Payment Info
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
