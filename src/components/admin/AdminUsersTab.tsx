import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Shield, Loader2, Users, Building2, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AppRole } from '@/hooks/useAdmin';

interface UserWithProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  company: string | null;
  role: AppRole | null;
  created_at: string;
}

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
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const [profilesRes, rolesRes, emailsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('*'),
        supabase.functions.invoke('get-users-with-emails'),
      ]);

      const profiles = profilesRes.data || [];
      const roles = rolesRes.data || [];
      const emailMap: Record<string, string> = emailsRes.data?.emails || {};

      const usersWithRoles: UserWithProfile[] = profiles.map(profile => {
        const userRole = roles.find(r => r.user_id === profile.user_id);
        return {
          id: profile.user_id,
          email: emailMap[profile.user_id] || null,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          company: profile.company,
          role: userRole?.role as AppRole | null,
          created_at: profile.created_at,
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

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{users.length}</p><p className="text-sm text-muted-foreground">Total Users</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 rounded-lg bg-amber-500/10"><Shield className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p><p className="text-sm text-muted-foreground">Admins</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 rounded-lg bg-emerald-500/10"><Building2 className="h-5 w-5 text-emerald-500" /></div><div><p className="text-2xl font-bold">{new Set(users.filter(u => u.company).map(u => u.company)).size}</p><p className="text-sm text-muted-foreground">Organizations</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div><CardTitle>User Management</CardTitle><CardDescription>View and manage user accounts and roles</CardDescription></div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Email</TableHead><TableHead>Company</TableHead><TableHead>Role</TableHead><TableHead>Joined</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell><div className="flex items-center gap-3"><Avatar className="h-8 w-8"><AvatarImage src={user.avatar_url || undefined} /><AvatarFallback>{user.full_name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback></Avatar><p className="font-medium">{user.full_name || 'Unknown'}</p></div></TableCell>
                  <TableCell className="text-muted-foreground">{user.email || '-'}</TableCell>
                  <TableCell>{user.company || '-'}</TableCell>
                  <TableCell><Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role || 'No Role'}</Badge></TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(user); setNewRole(user.role || 'member'); setIsRoleDialogOpen(true); }}>
                        <Shield className="h-4 w-4 mr-1" />Manage Role
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
    </div>
  );
}