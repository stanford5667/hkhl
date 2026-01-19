import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Crown, User, Building2, Shield, Loader2, Trash2, ArrowUpCircle, CheckCircle2 } from 'lucide-react';
import { UserWithTier } from '@/hooks/useCommandCenterMetrics';
import { EmptyState } from './EmptyState';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AppRole } from '@/hooks/useAdmin';
import { formatDistanceToNow } from 'date-fns';

interface UserManagementTableProps {
  users: UserWithTier[];
  onRefresh: () => void;
}

const tierConfig = {
  free: { label: 'Free', icon: <User className="h-3 w-3" />, className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30' },
  pro: { label: 'Pro', icon: <Crown className="h-3 w-3" />, className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  enterprise: { label: 'Enterprise', icon: <Building2 className="h-3 w-3" />, className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
};

export function UserManagementTable({ users, onRefresh }: UserManagementTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithTier | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('member');
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [userToUpgrade, setUserToUpgrade] = useState<UserWithTier | null>(null);
  const [upgradeTier, setUpgradeTier] = useState<'pro' | 'enterprise'>('pro');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithTier | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      onRefresh();
    } catch (err) {
      console.error('Error updating role:', err);
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpgrade = async () => {
    if (!userToUpgrade) return;
    setUpdating(true);
    try {
      // Upsert subscription to upgrade user
      const { error } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userToUpgrade.id,
          plan: upgradeTier,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        }, { onConflict: 'user_id' });

      if (error) throw error;
      toast({ 
        title: 'User Upgraded', 
        description: `Successfully upgraded ${userToUpgrade.full_name || userToUpgrade.email || 'user'} to ${upgradeTier}` 
      });
      setIsUpgradeDialogOpen(false);
      setUserToUpgrade(null);
      onRefresh();
    } catch (err) {
      console.error('Error upgrading user:', err);
      toast({ title: 'Error', description: 'Failed to upgrade user', variant: 'destructive' });
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
      onRefresh();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      toast({ title: 'Error', description: err.message || 'Failed to delete user', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  if (users.length === 0) {
    return <EmptyState type="users" />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View, manage roles, and upgrade user tiers</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search users..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="pl-9" 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const tier = tierConfig[user.tier];
                  return (
                    <TableRow key={user.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {user.full_name?.slice(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.full_name || 'Unknown'}</p>
                            {user.company && (
                              <p className="text-xs text-muted-foreground">{user.company}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 ${tier.className}`}>
                          {tier.icon}
                          {tier.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role || 'No Role'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.last_active 
                          ? formatDistanceToNow(new Date(user.last_active), { addSuffix: true })
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {user.tier !== 'enterprise' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                              onClick={() => { 
                                setUserToUpgrade(user); 
                                setUpgradeTier(user.tier === 'free' ? 'pro' : 'enterprise');
                                setIsUpgradeDialogOpen(true); 
                              }}
                            >
                              <ArrowUpCircle className="h-4 w-4 mr-1" />
                              Upgrade
                            </Button>
                          )}
                          {user.tier === 'enterprise' && (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Max Tier
                            </Badge>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { 
                              setSelectedUser(user); 
                              setNewRole((user.role as AppRole) || 'member'); 
                              setIsRoleDialogOpen(true); 
                            }}
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Role
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10" 
                            onClick={() => { setUserToDelete(user); setIsDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Role Management Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedUser?.full_name || selectedUser?.email || 'this user'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin - Full access</SelectItem>
                <SelectItem value="member">Member - Standard access</SelectItem>
                <SelectItem value="viewer">Viewer - Read-only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRoleChange} disabled={updating}>
              {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-amber-500" />
              Upgrade User
            </DialogTitle>
            <DialogDescription>
              Upgrade {userToUpgrade?.full_name || userToUpgrade?.email || 'this user'} to a higher tier
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <span className="text-sm text-muted-foreground">Current tier:</span>
              <Badge variant="outline" className={tierConfig[userToUpgrade?.tier || 'free'].className}>
                {tierConfig[userToUpgrade?.tier || 'free'].icon}
                {tierConfig[userToUpgrade?.tier || 'free'].label}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Upgrade to:</label>
              <Select value={upgradeTier} onValueChange={(v) => setUpgradeTier(v as 'pro' | 'enterprise')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {userToUpgrade?.tier === 'free' && (
                    <SelectItem value="pro">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500" />
                        Pro - Premium features
                      </div>
                    </SelectItem>
                  )}
                  <SelectItem value="enterprise">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-purple-500" />
                      Enterprise - Full access
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpgrade} disabled={updating} className="bg-amber-500 hover:bg-amber-600">
              {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upgrade User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.full_name || userToDelete?.email || 'this user'}? 
              This action cannot be undone and will permanently remove the user and all their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser} 
              disabled={deleting} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
