import { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Building2, Copy, Loader2, Mail, Trash2, UserPlus, Users, Layers } from 'lucide-react';
import { AssetTypeConfig } from '@/components/organization/AssetTypeConfig';

interface Member {
  id: string;
  user_id: string;
  role: string;
  job_title: string | null;
  joined_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Invite {
  id: string;
  email: string;
  role: string;
  invite_code: string;
  status: string;
  expires_at: string;
  created_at: string;
}

const ORG_TYPES = [
  { value: 'private_equity', label: 'Private Equity' },
  { value: 'venture_capital', label: 'Venture Capital' },
  { value: 'family_office', label: 'Family Office' },
  { value: 'hedge_fund', label: 'Hedge Fund' },
  { value: 'investment_bank', label: 'Investment Bank' },
  { value: 'corporate', label: 'Corporate Development' },
  { value: 'other', label: 'Other' },
];

export default function OrganizationSettings() {
  const { user } = useAuth();
  const { currentOrganization, memberships, refreshOrganization } = useOrganization();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [enabledAssetTypes, setEnabledAssetTypes] = useState<string[]>(['private_equity']);
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const currentMembership = memberships.find(m => m.organization_id === currentOrganization?.id);
  const isAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'admin';

  useEffect(() => {
    if (currentOrganization) {
      setOrgName(currentOrganization.name);
      setOrgType(currentOrganization.type);
      setOrgWebsite(currentOrganization.website || '');
      setIsPublic(currentOrganization.is_public);
      setEnabledAssetTypes(currentOrganization.enabled_asset_types || ['private_equity']);
      fetchMembers();
      fetchInvites();
    }
  }, [currentOrganization]);

  const fetchMembers = async () => {
    if (!currentOrganization) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('organization_members')
      .select('*, profile:profiles!organization_members_user_id_fkey(full_name, avatar_url)')
      .eq('organization_id', currentOrganization.id)
      .eq('status', 'active');
    if (!error && data) {
      setMembers(data.map((m: any) => ({
        ...m,
        profile: Array.isArray(m.profile) ? m.profile[0] : m.profile
      })));
    }
    setIsLoading(false);
  };

  const fetchInvites = async () => {
    if (!currentOrganization) return;
    const { data, error } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('organization_id', currentOrganization.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (!error) setInvites(data || []);
  };

  const handleSaveGeneral = async () => {
    if (!currentOrganization || !isAdmin) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: orgName.trim(),
          type: orgType,
          website: orgWebsite.trim() || null,
          is_public: isPublic,
        })
        .eq('id', currentOrganization.id);
      if (error) throw error;
      toast.success('Settings saved');
      refreshOrganization();
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!currentOrganization || !inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const { error } = await supabase
        .from('organization_invites')
        .insert({
          organization_id: currentOrganization.id,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          invite_code: inviteCode,
          invited_by: user?.id,
        });
      if (error) throw error;
      toast.success('Invite created! Share the code with the user.');
      setInviteEmail('');
      setShowInviteDialog(false);
      fetchInvites();
    } catch (error) {
      toast.error('Failed to create invite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Invite code copied');
  };

  const handleRevokeInvite = async (inviteId: string) => {
    const { error } = await supabase.from('organization_invites').delete().eq('id', inviteId);
    if (!error) { toast.success('Invite revoked'); fetchInvites(); }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    const { error } = await supabase.from('organization_members').delete().eq('id', memberId);
    if (!error) { toast.success('Member removed'); fetchMembers(); }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    const { error } = await supabase.from('organization_members').update({ role: newRole }).eq('id', memberId);
    if (!error) { toast.success('Role updated'); fetchMembers(); }
  };

  if (!currentOrganization) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No organization selected</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Organization Settings</h1>
            <p className="text-muted-foreground">{currentOrganization.name}</p>
          </div>
        </div>

        <Tabs defaultValue="general">
          <TabsList className="bg-secondary/50 p-1">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="assets">Asset Types</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6 mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-foreground">Organization Details</CardTitle>
                <CardDescription>Update your organization information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Organization Name</Label>
                  <Input value={orgName} onChange={e => setOrgName(e.target.value)} disabled={!isAdmin} />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Organization Type</Label>
                  <Select value={orgType} onValueChange={setOrgType} disabled={!isAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORG_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Website</Label>
                  <Input value={orgWebsite} onChange={e => setOrgWebsite(e.target.value)} disabled={!isAdmin} placeholder="https://example.com" />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label className="text-foreground">Public Organization</Label>
                    <p className="text-xs text-muted-foreground">Allow others to discover your organization</p>
                  </div>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} disabled={!isAdmin} />
                </div>

                {isAdmin && (
                  <Button onClick={handleSaveGeneral} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Save Changes
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Asset Types Tab */}
          <TabsContent value="assets" className="space-y-6 mt-6">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-foreground">Asset Types</CardTitle>
                    <CardDescription>Choose which asset classes your organization tracks</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AssetTypeConfig
                  enabledTypes={enabledAssetTypes}
                  onUpdate={async (types) => {
                    setEnabledAssetTypes(types);
                    if (currentOrganization && isAdmin) {
                      const { error } = await supabase
                        .from('organizations')
                        .update({ enabled_asset_types: types })
                        .eq('id', currentOrganization.id);
                      if (error) toast.error('Failed to save asset types');
                      else { toast.success('Asset types updated'); refreshOrganization(); }
                    }
                  }}
                  disabled={!isAdmin}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6 mt-6">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">Team Members</CardTitle>
                  <CardDescription>{members.length} members</CardDescription>
                </div>
                {isAdmin && (
                  <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select value={inviteRole} onValueChange={setInviteRole}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()} className="w-full">
                          {isInviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                          Send Invite
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-secondary text-muted-foreground">
                            {member.profile?.full_name?.slice(0, 2).toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{member.profile?.full_name || 'Unknown'}</p>
                          <Badge variant="outline" className="text-xs text-muted-foreground capitalize">
                            {member.role}
                          </Badge>
                        </div>
                      </div>
                      {isAdmin && member.user_id !== user?.id && member.role !== 'owner' && (
                        <div className="flex items-center gap-2">
                          <Select value={member.role} onValueChange={val => handleChangeRole(member.id, val)}>
                            <SelectTrigger className="w-24 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {invites.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Pending Invites</h3>
                    <div className="space-y-2">
                      {invites.map(invite => (
                        <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-dashed border-border">
                          <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-foreground">{invite.email}</p>
                              <p className="text-xs text-muted-foreground">Code: {invite.invite_code}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleCopyCode(invite.invite_code)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleRevokeInvite(invite.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6 mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-foreground">Billing</CardTitle>
                <CardDescription>Manage your organization's billing and subscription</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Billing management coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
