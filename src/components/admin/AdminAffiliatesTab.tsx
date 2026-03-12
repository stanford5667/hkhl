import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, DollarSign, Users, MousePointerClick, TrendingUp } from "lucide-react";

interface AffiliateRow {
  id: string;
  user_id: string;
  affiliate_code: string;
  status: string;
  commission_rate: number;
  total_clicks: number;
  total_referrals: number;
  total_earnings: number;
  total_paid: number;
  payment_email: string | null;
  applied_at: string;
  approved_at: string | null;
  notes: string | null;
}

export function AdminAffiliatesTab() {
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [payoutDialog, setPayoutDialog] = useState<AffiliateRow | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutRef, setPayoutRef] = useState("");
  const [processingPayout, setProcessingPayout] = useState(false);

  useEffect(() => {
    fetchAffiliates();
  }, [statusFilter]);

  const fetchAffiliates = async () => {
    setLoading(true);
    let query = supabase.from("affiliates").select("*").order("applied_at", { ascending: false });
    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }
    const { data } = await query;
    setAffiliates((data as any[]) || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "approved") updates.approved_at = new Date().toISOString();
    
    const { error } = await supabase.from("affiliates").update(updates).eq("id", id);
    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Affiliate ${status}`);
      fetchAffiliates();
    }
  };

  const updateCommissionRate = async (id: string, rate: number) => {
    const { error } = await supabase.from("affiliates").update({ commission_rate: rate }).eq("id", id);
    if (error) toast.error("Failed to update rate");
    else {
      toast.success("Commission rate updated");
      fetchAffiliates();
    }
  };

  const recordPayout = async () => {
    if (!payoutDialog || !payoutAmount) return;
    setProcessingPayout(true);

    const amount = parseFloat(payoutAmount);
    const { error } = await supabase.from("affiliate_payouts").insert({
      affiliate_id: payoutDialog.id,
      amount,
      status: "completed",
      payment_method: "manual",
      payment_reference: payoutRef,
      processed_at: new Date().toISOString(),
    });

    if (error) {
      toast.error("Failed to record payout");
    } else {
      // Update total_paid
      await supabase
        .from("affiliates")
        .update({ total_paid: payoutDialog.total_paid + amount })
        .eq("id", payoutDialog.id);
      
      toast.success(`Payout of $${amount.toFixed(2)} recorded`);
      setPayoutDialog(null);
      setPayoutAmount("");
      setPayoutRef("");
      fetchAffiliates();
    }
    setProcessingPayout(false);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "pending": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "rejected": return "bg-destructive/10 text-destructive border-destructive/20";
      case "suspended": return "bg-muted text-muted-foreground";
      default: return "";
    }
  };

  const totalEarnings = affiliates.reduce((s, a) => s + a.total_earnings, 0);
  const totalPaid = affiliates.reduce((s, a) => s + a.total_paid, 0);
  const totalClicks = affiliates.reduce((s, a) => s + a.total_clicks, 0);
  const pendingCount = affiliates.filter(a => a.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{affiliates.length}</p>
                <p className="text-xs text-muted-foreground">Total Affiliates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MousePointerClick className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalClicks}</p>
                <p className="text-xs text-muted-foreground">Total Clicks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">${totalEarnings.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Total Commissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">${(totalEarnings - totalPaid).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Unpaid ({pendingCount} pending apps)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchAffiliates}>
          Refresh
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : affiliates.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No affiliates found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Referrals</TableHead>
                  <TableHead className="text-right">Earned</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affiliates.map((aff) => (
                  <TableRow key={aff.id}>
                    <TableCell className="font-mono text-sm">{aff.affiliate_code}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor(aff.status)}>
                        {aff.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={aff.commission_rate.toString()}
                        onValueChange={(v) => updateCommissionRate(aff.id, parseFloat(v))}
                      >
                        <SelectTrigger className="w-[80px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 15, 20, 25, 30].map((r) => (
                            <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">{aff.total_clicks}</TableCell>
                    <TableCell className="text-right">{aff.total_referrals}</TableCell>
                    <TableCell className="text-right">${aff.total_earnings.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${aff.total_paid.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {aff.status === "pending" && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 text-green-500" onClick={() => updateStatus(aff.id, "approved")}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => updateStatus(aff.id, "rejected")}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {aff.status === "approved" && (
                          <Button size="sm" variant="outline" className="h-7" onClick={() => {
                            setPayoutDialog(aff);
                            setPayoutAmount((aff.total_earnings - aff.total_paid).toFixed(2));
                          }}>
                            <DollarSign className="h-3 w-3 mr-1" /> Pay
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payout Dialog */}
      <Dialog open={!!payoutDialog} onOpenChange={(o) => !o && setPayoutDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payout — {payoutDialog?.affiliate_code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Email</Label>
              <Input value={payoutDialog?.payment_email || "N/A"} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Reference (optional)</Label>
              <Input
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value)}
                placeholder="PayPal transaction ID, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialog(null)}>Cancel</Button>
            <Button onClick={recordPayout} disabled={processingPayout || !payoutAmount}>
              {processingPayout ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Record Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
