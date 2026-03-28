import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ClipboardList, Loader2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EliteProfileViewer } from '@/components/elite-assessment/shared/EliteProfileViewer';

interface QuestionnaireUser {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  profile: Record<string, any>;
  submitted_at: string;
}

export function AdminQuestionnairesTab() {
  const [users, setUsers] = useState<QuestionnaireUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<QuestionnaireUser | null>(null);

  useEffect(() => {
    fetchQuestionnaireData();
  }, []);

  const fetchQuestionnaireData = async () => {
    try {
      // Fetch all elite profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('elite_client_profiles' as any)
        .select('*')
        .order('updated_at', { ascending: false });

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Fetch user details
      const userIds = (profiles as any[]).map((p: any) => p.user_id);
      const [profilesRes, emailsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds),
        supabase.functions.invoke('get-users-with-emails'),
      ]);

      const userProfiles = profilesRes.data || [];
      const emailMap: Record<string, string> = emailsRes.data?.emails || {};

      const merged: QuestionnaireUser[] = (profiles as any[]).map((ep: any) => {
        const up = userProfiles.find((u: any) => u.user_id === ep.user_id);
        return {
          user_id: ep.user_id,
          full_name: up?.full_name || null,
          avatar_url: up?.avatar_url || null,
          email: emailMap[ep.user_id] || null,
          profile: ep,
          submitted_at: ep.updated_at || ep.created_at,
        };
      });

      setUsers(merged);
    } catch (err) {
      console.error('Error fetching questionnaire data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completionSummary = (profile: Record<string, any>) => {
    const fields = ['primary_objective', 'investment_purpose', 'time_horizon', 'target_return_risk', 'experience_level', 'options_approval'];
    const filled = fields.filter(f => profile[f] != null && profile[f] !== '').length;
    return `${filled}/${fields.length}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Responses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Questionnaire Responses</CardTitle>
              <CardDescription>View all elite assessment answers submitted by users under the portfolio section.</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No questionnaire responses found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Objective</TableHead>
                  <TableHead>Risk Tolerance</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback>{u.full_name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{u.full_name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email || '-'}</TableCell>
                    <TableCell>
                      <span className="capitalize text-sm">{u.profile.primary_objective?.replace(/_/g, ' ') || '-'}</span>
                    </TableCell>
                    <TableCell>
                      {u.profile.max_drawdown_tolerance != null ? (
                        <Badge variant="outline">{u.profile.max_drawdown_tolerance}% max DD</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-sm">{u.profile.experience_level?.replace(/_/g, ' ') || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{completionSummary(u.profile)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.submitted_at ? new Date(u.submitted_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedUser(u)}>
                        <Eye className="h-4 w-4 mr-1" />View All
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) setSelectedUser(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Questionnaire — {selectedUser?.full_name || selectedUser?.email || 'User'}</DialogTitle>
            <DialogDescription>Full elite assessment responses.</DialogDescription>
          </DialogHeader>
          {selectedUser && <EliteProfileViewer profile={selectedUser.profile} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
