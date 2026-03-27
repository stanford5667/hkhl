import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Shield, Loader2, Users, Building2, Trash2, Crown, ArrowUpDown, ArrowUp, ArrowDown, Eye, ClipboardList } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AppRole } from '@/hooks/useAdmin';
import { EliteProfileViewer } from '@/components/elite-assessment/shared/EliteProfileViewer';

interface UserWithProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  company: string | null;
  role: AppRole | null;
  created_at: string;
  subscription_plan: string | null;
  subscription_status: string | null;
  last_sign_in: string | null;
  last_active: string | null;
  days_active_30d: number;
  total_time_seconds: number;
  session_count: number;
  avg_session_seconds: number;
}

type SortField = 'full_name' | 'email' | 'company' | 'subscription_status' | 'role' | 'created_at' | 'last_active' | 'days_active_30d' | 'total_time_seconds';
type SortDirection = 'asc' | 'desc';

export function AdminUsersTab() {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('member');
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithProfile | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [pageViewsDialogUser, setPageViewsDialogUser] = useState<UserWithProfile | null>(null);
  const [allPageViews, setAllPageViews] = useState<Record<string, { page_path: string; viewed_at: string }[]>>({});
  const [eliteProfileDialogUser, setEliteProfileDialogUser] = useState<UserWithProfile | null>(null);
  const [eliteProfileData, setEliteProfileData] = useState<Record<string, any> | null>(null);
  const [loadingEliteProfile, setLoadingEliteProfile] = useState(false);
  const { toast } = useToast();

  const handleViewEliteProfile = async (user: UserWithProfile) => {
    setEliteProfileDialogUser(user);
    setLoadingEliteProfile(true);
    const { data } = await supabase
      .from('elite_client_profiles' as any)
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setEliteProfileData(data as any);
    setLoadingEliteProfile(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const [profilesRes, rolesRes, emailsRes, subsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('*'),
        supabase.functions.invoke('get-users-with-emails'),
        supabase.from('subscriptions').select('user_id, plan, status'),
      ]);

      const profiles = profilesRes.data || [];
      const roles = rolesRes.data || [];
      const emailMap: Record<string, string> = emailsRes.data?.emails || {};
      const lastSignInMap: Record<string, string | null> = emailsRes.data?.lastSignIns || {};
      const activityStats: Record<string, { last_active: string; days_active_30d: number; total_time_seconds: number; session_count: number; avg_session_seconds: number }> = emailsRes.data?.activityStats || {};
      const pageViewsData: Record<string, { page_path: string; viewed_at: string }[]> = emailsRes.data?.pageViews || {};
      const subs = subsRes.data || [];
      setAllPageViews(pageViewsData);

      const usersWithRoles: UserWithProfile[] = profiles.map(profile => {
        const userRole = roles.find(r => r.user_id === profile.user_id);
        const userSub = subs.find((s: any) => s.user_id === profile.user_id && s.status === 'active');
        const activity = activityStats[profile.user_id];
        return {
          id: profile.user_id,
          email: emailMap[profile.user_id] || null,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          company: profile.company,
          role: userRole?.role as AppRole | null,
          created_at: profile.created_at,
          subscription_plan: userSub?.plan || null,
          subscription_status: userSub?.status || null,
          last_sign_in: lastSignInMap[profile.user_id] || null,
          last_active: activity?.last_active || null,
          days_active_30d: activity?.days_active_30d || 0,
          total_time_seconds: activity?.total_time_seconds || 0,
          session_count: activity?.session_count || 0,
          avg_session_seconds: activity?.avg_session_seconds || 0,
        };
      });

      setUsers(usersWithRoles);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: selectedUser.id, role: newRole }, { onConflict: 'user_id' });

      if (error) throw error;
      toast({ title: 'Role Updated', description: `Successfully updated role for ${selectedUser.full_name || 'user'}` });
      setIsRoleDialogOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Error updating role:', err);
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'User Deleted', description: `Successfully deleted ${userToDelete.full_name || userToDelete.email || 'user'}` });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      toast({ title: 'Error', description: err.message || 'Failed to delete user', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
      : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  const filteredAndSortedUsers = users
    .filter(user =>
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'full_name':
          return dir * (a.full_name || '').localeCompare(b.full_name || '');
        case 'email':
          return dir * (a.email || '').localeCompare(b.email || '');
        case 'company':
          return dir * (a.company || '').localeCompare(b.company || '');
        case 'subscription_status': {
          const aVal = a.subscription_status === 'active' ? 1 : 0;
          const bVal = b.subscription_status === 'active' ? 1 : 0;
          return dir * (aVal - bVal);
        }
        case 'role':
          return dir * (a.role || '').localeCompare(b.role || '');
        case 'created_at':
          return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        case 'last_active': {
          const aTime = a.last_active ? new Date(a.last_active).getTime() : 0;
          const bTime = b.last_active ? new Date(b.last_active).getTime() : 0;
          return dir * (aTime - bTime);
        }
        case 'days_active_30d':
          return dir * (a.days_active_30d - b.days_active_30d);
        case 'total_time_seconds':
          return dir * (a.total_time_seconds - b.total_time_seconds);
        default:
          return 0;
      }
    });

  const formatRelativeDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString();
  };

  const formatDuration = (totalSeconds: number) => {
    if (totalSeconds === 0) return 'No data yet';
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{users.length}</p><p className="text-sm text-muted-foreground">Total Users</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 rounded-lg bg-amber-500/10"><Crown className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">{users.filter(u => u.subscription_status === 'active').length}</p><p className="text-sm text-muted-foreground">Paid Users</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 rounded-lg bg-muted"><Users className="h-5 w-5 text-muted-foreground" /></div><div><p className="text-2xl font-bold">{users.filter(u => u.subscription_status !== 'active').length}</p><p className="text-sm text-muted-foreground">Free Users</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 rounded-lg bg-primary/10"><Shield className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p><p className="text-sm text-muted-foreground">Admins</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div><CardTitle>User Management</CardTitle><CardDescription>View and manage user accounts and roles. Click column headers to sort.</CardDescription></div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('full_name')}>
                  <span className="flex items-center">User<SortIcon field="full_name" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('email')}>
                  <span className="flex items-center">Email<SortIcon field="email" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('company')}>
                  <span className="flex items-center">Company<SortIcon field="company" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('subscription_status')}>
                  <span className="flex items-center">Plan<SortIcon field="subscription_status" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('role')}>
                  <span className="flex items-center">Role<SortIcon field="role" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('last_active')}>
                  <span className="flex items-center">Last Active<SortIcon field="last_active" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('days_active_30d')}>
                  <span className="flex items-center">Days Active (30d)<SortIcon field="days_active_30d" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('total_time_seconds')}>
                  <span className="flex items-center">Total Time<SortIcon field="total_time_seconds" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('created_at')}>
                  <span className="flex items-center">Joined<SortIcon field="created_at" /></span>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>{user.full_name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <p className="font-medium">{user.full_name || 'Unknown'}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email || '-'}</TableCell>
                  <TableCell>{user.company || '-'}</TableCell>
                  <TableCell>
                    {user.subscription_status === 'active' ? (
                      <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent gap-1"><Crown className="h-3 w-3" />{user.subscription_plan || 'Pro'}</Badge>
                    ) : (
                      <Badge variant="outline">Free</Badge>
                    )}
                  </TableCell>
                  <TableCell><Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role || 'No Role'}</Badge></TableCell>
                  <TableCell>
                    <span className="text-sm" title={user.last_active ? new Date(user.last_active).toLocaleString() : undefined}>
                      {formatRelativeDate(user.last_active)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium ${user.days_active_30d >= 15 ? 'text-green-600 dark:text-green-400' : user.days_active_30d >= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                      {user.days_active_30d}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="font-medium">{formatDuration(user.total_time_seconds)}</span>
                      {user.session_count > 0 && (
                        <span className="text-muted-foreground block text-xs">
                          {user.session_count} sessions · avg {formatDuration(user.avg_session_seconds)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setPageViewsDialogUser(user)}>
                        <Eye className="h-4 w-4 mr-1" />Pages
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(user); setNewRole(user.role || 'member'); setIsRoleDialogOpen(true); }}>
                        <Shield className="h-4 w-4 mr-1" />Role
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { setUserToDelete(user); setIsDeleteDialogOpen(true); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manage User Role</DialogTitle><DialogDescription>Change the role for {selectedUser?.full_name || selectedUser?.email || 'this user'}</DialogDescription></DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin - Full access</SelectItem>
                <SelectItem value="member">Member - Standard access</SelectItem>
                <SelectItem value="viewer">Viewer - Read-only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRoleChange} disabled={updating}>{updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.full_name || userToDelete?.email || 'this user'}? This action cannot be undone and will permanently remove the user and all their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!pageViewsDialogUser} onOpenChange={(open) => { if (!open) setPageViewsDialogUser(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Page Views — {pageViewsDialogUser?.full_name || pageViewsDialogUser?.email || 'User'}</DialogTitle>
            <DialogDescription>Recent pages visited by this user.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {(() => {
              const views = pageViewsDialogUser ? allPageViews[pageViewsDialogUser.id] || [] : [];
              if (views.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">No page views recorded yet.</p>;
              return (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead>Visited</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {views.map((v, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">{v.page_path}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(v.viewed_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              );
            })()}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
