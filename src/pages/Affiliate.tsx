import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, DollarSign, MousePointerClick, UserPlus, TrendingUp, LinkIcon, CheckCircle2, Wallet, BanknoteIcon, ShieldCheck, AlertTriangle, ExternalLink, CreditCard } from "lucide-react";
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
  stripe_connect_account_id: string | null;
  stripe_connect_onboarded: boolean;
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

interface Payout {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  payment_reference: string | null;
  period_start: string | null;
  period_end: string | null;
  processed_at: string | null;
  created_at: string;
  notes: string | null;
}

interface ConnectStatus {
  connected: boolean;
  onboarded: boolean;
  details_submitted?: boolean;
  payouts_enabled?: boolean;
}

export default function Affiliate() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [paymentEmail, setPaymentEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("stripe_connect");
  const [savingPayment, setSavingPayment] = useState(false);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>({ connected: false, onboarded: false });
  const [connectLoading, setConnectLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchAffiliateData();
  }, [user]);

  // Check for Stripe Connect return
  useEffect(() => {
    const stripeConnect = searchParams.get("stripe_connect");
    if (stripeConnect === "complete" && affiliate) {
      checkConnectStatus();
      toast.success("Stripe account setup updated!");
    }
  }, [searchParams, affiliate]);

  const checkConnectStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-status");
      if (!error && data) {
        setConnectStatus(data);
      }
    } catch (e) {
      console.error("Failed to check connect status:", e);
    }
  };

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
      setPaymentMethod(data.payment_method || "stripe_connect");
      
      // Fetch referrals and payouts in parallel
      const [refsResult, payoutsResult] = await Promise.all([
        supabase
          .from("affiliate_referrals")
          .select("id, click_at, signed_up_at, converted_at, conversion_amount, commission_amount, commission_status")
          .eq("affiliate_id", data.id)
          .order("click_at", { ascending: false })
          .limit(50),
        supabase
          .from("affiliate_payouts")
          .select("*")
          .eq("affiliate_id", data.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      
      setReferrals((refsResult.data as any[]) || []);
      setPayouts((payoutsResult.data as any[]) || []);

      // Check Stripe Connect status if they have an account
      if (data.stripe_connect_account_id) {
        checkConnectStatus();
      }
    }
    setLoading(false);
  };

  const startStripeConnect = async (linkType: "onboarding" | "dashboard" = "onboarding") => {
    setConnectLoading(true);
    try {
      // Ensure we have a valid session before calling the edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in again to set up Stripe payouts.");
        return;
      }

      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
        body: { link_type: linkType },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Opening Stripe in a new tab...");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to start Stripe Connect setup");
    } finally {
      setConnectLoading(false);
    }
  };

  const applyAsAffiliate = async () => {
    if (!user) return;
    setApplying(true);
    try {
      const code = user.email?.split("@")[0]?.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) 
        || Math.random().toString(36).slice(2, 10).toUpperCase();

      const { data: insertedData, error } = await supabase.from("affiliates").insert({
        user_id: user.id,
        affiliate_code: code,
        payment_email: user.email,
        status: "approved",
        approved_at: new Date().toISOString(),
      }).select("id, affiliate_code").single();

      if (error) {
        if (error.code === "23505") {
          toast.error("You're already an affiliate.");
        } else {
          throw error;
        }
      } else if (insertedData) {
        // Create Stripe promotion code for this affiliate (10% off first month)
        try {
          await supabase.functions.invoke("create-affiliate-promo", {
            body: {
              affiliate_id: insertedData.id,
              affiliate_code: insertedData.affiliate_code,
            },
          });
        } catch (promoErr) {
          console.error("Failed to create promo code:", promoErr);
        }

        toast.success("You're now an affiliate! Your link and promo code are ready.");
        fetchAffiliateData();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to join");
    } finally {
      setApplying(false);
    }
  };

  const savePaymentInfo = async () => {
    if (!affiliate) return;
    setSavingPayment(true);
    const { error } = await supabase
      .from("affiliates")
      .update({ payment_email: paymentEmail, payment_method: paymentMethod })
      .eq("id", affiliate.id);
    
    if (error) toast.error("Failed to save");
    else {
      toast.success("Payment info saved!");
      setAffiliate(prev => prev ? { ...prev, payment_email: paymentEmail, payment_method: paymentMethod } : null);
    }
    setSavingPayment(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const affiliateLink = affiliate ? `https://assetlabs.ai?ref=${affiliate.affiliate_code}` : "";

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not yet an affiliate - show instant join
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
                Join Now — It's Free
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Instant activation. No approval needed.
              </p>
            </CardContent>
          </Card>
        </motion.div>
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

      {/* Affiliate Link & Promo Code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Your Promo Code
          </CardTitle>
          <CardDescription>Share this code with people you refer — they enter it during checkout to get 10% off their first month, and you earn {affiliate.commission_rate}% recurring commission on every payment they make.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Promo Code (share this with people you refer — they get 10% off their first month)</Label>
            <div className="flex gap-2">
              <Input value={affiliate.affiliate_code} readOnly className="font-mono text-sm font-bold tracking-wider" />
              <Button onClick={() => copyToClipboard(affiliate.affiliate_code, "Promo code")} variant="outline" className="shrink-0">
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">How it works:</span> Tell your referral to enter this code on the <span className="font-medium text-foreground">checkout page</span> when they subscribe. The discount applies automatically, and you'll earn commission on every payment they make going forward.
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Commission: {affiliate.commission_rate}% {affiliate.commission_type}</span>
            <span>•</span>
            <span>10% discount for referrals</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="referrals">
        <TabsList>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="payouts">Payout History</TabsTrigger>
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

        <TabsContent value="payouts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BanknoteIcon className="h-5 w-5" />
                Payout History
              </CardTitle>
              <CardDescription>
                Payouts are processed monthly for balances over $50. You'll receive payment to your configured payment method below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="mb-1">No payouts yet</p>
                  <p className="text-xs">Payouts are processed once your unpaid balance reaches $50.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell className="text-sm">
                          {new Date(payout.processed_at || payout.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payout.period_start && payout.period_end
                            ? `${new Date(payout.period_start).toLocaleDateString()} – ${new Date(payout.period_end).toLocaleDateString()}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm capitalize">
                          {payout.payment_method || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={payout.status === "paid" ? "default" : payout.status === "pending" ? "secondary" : "outline"}>
                            {payout.status === "paid" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : null}
                            {payout.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          ${payout.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          {/* Stripe Connect - Primary Option */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Stripe Connect — Recommended
              </CardTitle>
              <CardDescription>
                Get paid directly to your bank account via Stripe. You'll set up your own Stripe Express account where you securely provide your bank details and tax information — we never see or store any of it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connectStatus.onboarded ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Stripe account connected & verified</p>
                      <p className="text-xs text-muted-foreground">Payouts will be sent directly to your bank via Stripe.</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => startStripeConnect("dashboard")} disabled={connectLoading} className="gap-2">
                    {connectLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    Open Stripe Dashboard
                  </Button>
                </div>
              ) : connectStatus.connected ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Setup incomplete</p>
                      <p className="text-xs text-muted-foreground">Your Stripe account was created but onboarding isn't finished. Complete it to receive payouts.</p>
                    </div>
                  </div>
                  <Button onClick={() => startStripeConnect("onboarding")} disabled={connectLoading} className="gap-2">
                    {connectLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    Complete Stripe Setup
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
                    <p className="text-sm font-medium">How it works:</p>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Click the button below to create your Stripe Express account</li>
                      <li>Stripe will securely collect your bank info and tax details (W-9 / W-8BEN)</li>
                      <li>Once verified, we can send payouts directly to your bank</li>
                    </ol>
                  </div>
                  <Button onClick={() => startStripeConnect("onboarding")} disabled={connectLoading} className="gap-2">
                    {connectLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    Set Up Stripe Payouts
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alternative Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Alternative Payment Method
              </CardTitle>
              <CardDescription>If you prefer not to use Stripe, you can receive payouts via PayPal, Venmo, or Zelle instead. Note: these are processed manually and may take longer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod === "stripe_connect" ? "paypal" : paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="venmo">Venmo</SelectItem>
                    <SelectItem value="zelle">Zelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {paymentMethod === "paypal" || paymentMethod === "stripe_connect" ? "PayPal Email" :
                   paymentMethod === "venmo" ? "Venmo Username or Phone" :
                   "Zelle Email or Phone"}
                </Label>
                <Input
                  value={paymentEmail}
                  onChange={(e) => setPaymentEmail(e.target.value)}
                  placeholder={
                    paymentMethod === "paypal" || paymentMethod === "stripe_connect" ? "your@paypal.com" :
                    paymentMethod === "venmo" ? "@username or phone number" :
                    "email or phone number"
                  }
                />
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
                <p className="text-sm font-medium">Current Payment Status</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Earned:</span>
                    <span className="ml-2 font-medium">${affiliate.total_earnings.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Paid:</span>
                    <span className="ml-2 font-medium">${affiliate.total_paid.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Unpaid Balance:</span>
                    <span className="ml-2 font-semibold text-primary">${unpaidEarnings.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Method:</span>
                    <span className="ml-2 capitalize">{affiliate.payment_method === "stripe_connect" ? "Stripe Connect" : affiliate.payment_method || "Not set"}</span>
                  </div>
                </div>
              </div>

              <Button onClick={savePaymentInfo} disabled={savingPayment}>
                {savingPayment ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Alternative Payment Info
              </Button>
            </CardContent>
          </Card>

          {/* Tax Compliance Section */}
          <Card className="border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-500" />
                Tax Information
              </CardTitle>
              <CardDescription>Important tax compliance information for affiliates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">IRS Reporting Requirements</p>
                    <p className="text-muted-foreground">
                      Per IRS regulations, if your total affiliate earnings reach <span className="font-semibold text-foreground">$600 or more</span> in a calendar year, 
                      we are required to issue you a <span className="font-semibold text-foreground">1099-NEC</span> form.
                    </p>
                    <p className="text-muted-foreground">
                      {connectStatus.onboarded 
                        ? "Since you're using Stripe Connect, your tax information is already handled securely by Stripe."
                        : "If you use Stripe Connect, tax documentation (W-9/W-8BEN) is handled automatically during Stripe onboarding. For alternative methods, we may request this separately before your first payout."
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                <p><span className="font-medium text-foreground">Payout schedule:</span> Commissions are processed monthly for balances over $50.</p>
                <p><span className="font-medium text-foreground">Minimum payout:</span> $50.00 USD</p>
                <p><span className="font-medium text-foreground">Currency:</span> All commissions are calculated and paid in USD.</p>
                <p><span className="font-medium text-foreground">Your responsibility:</span> You are responsible for reporting affiliate income on your tax return regardless of whether a 1099 is issued.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
