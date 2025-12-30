import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Building2, Loader2, Users } from 'lucide-react';

interface OrganizationStepProps {
  onComplete: () => void;
  onBack: () => void;
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

export function OrganizationStep({ onComplete, onBack }: OrganizationStepProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'select' | 'join' | 'create'>('select');
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Create org form
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('private_equity');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleJoinWithCode = async () => {
    if (!user || !inviteCode.trim()) return;

    setIsJoining(true);
    try {
      // Find invite
      const { data: invite, error: inviteError } = await supabase
        .from('organization_invites')
        .select('*, organization:organizations(*)')
        .eq('invite_code', inviteCode.toUpperCase().trim())
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (inviteError || !invite) {
        toast.error('Invalid or expired invite code');
        return;
      }

      // Add member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: invite.organization_id,
          user_id: user.id,
          role: invite.role || 'member',
          status: 'active',
        });

      if (memberError) throw memberError;

      // Update invite status
      await supabase
        .from('organization_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id);

      // Update profile
      await supabase
        .from('profiles')
        .update({
          current_organization_id: invite.organization_id,
          onboarding_completed: true,
          onboarding_step: 'complete',
        })
        .eq('user_id', user.id);

      toast.success(`Joined ${invite.organization?.name || 'organization'}!`);
      onComplete();
    } catch (error) {
      console.error('Join error:', error);
      toast.error('Failed to join organization');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !orgName.trim()) return;

    setIsCreating(true);
    try {
      // Generate slug
      const slug = orgName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 50);

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName.trim(),
          slug: `${slug}-${Date.now().toString(36)}`,
          type: orgType,
          website: orgWebsite.trim() || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add user as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'owner',
          status: 'active',
        });

      if (memberError) throw memberError;

      // Update profile
      await supabase
        .from('profiles')
        .update({
          current_organization_id: org.id,
          onboarding_completed: true,
          onboarding_step: 'complete',
        })
        .eq('user_id', user.id);

      toast.success('Organization created!');
      onComplete();
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Failed to create organization');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="text-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={mode === 'select' ? onBack : () => setMode('select')}
            className="absolute left-4 top-4 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <CardTitle className="text-2xl text-white">Join or Create Organization</CardTitle>
          <CardDescription className="text-slate-400">
            Your organization determines what data you see
          </CardDescription>
          <p className="text-xs text-slate-500 mt-2">Step 2 of 2</p>
        </CardHeader>
        <CardContent>
          {mode === 'select' && (
            <div className="space-y-4">
              {/* Join Option */}
              <button
                onClick={() => setMode('join')}
                className="w-full p-6 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Join Existing Organization</h3>
                    <p className="text-sm text-slate-400">I have an invite code</p>
                  </div>
                </div>
              </button>

              {/* Create Option */}
              <button
                onClick={() => setShowCreateDialog(true)}
                className="w-full p-6 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Create New Organization</h3>
                    <p className="text-sm text-slate-400">Start a new organization</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {mode === 'join' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="inviteCode" className="text-slate-300">Invite Code</Label>
                <Input
                  id="inviteCode"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  maxLength={8}
                  className="bg-slate-800 border-slate-700 text-white uppercase tracking-wider text-center text-lg"
                />
                <p className="text-xs text-slate-500">Enter the 8-character code from your invite</p>
              </div>

              <Button 
                onClick={handleJoinWithCode}
                className="w-full bg-purple-600 hover:bg-purple-500"
                disabled={inviteCode.length < 8 || isJoining}
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join Organization'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Organization Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Create Organization</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOrganization} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="orgName" className="text-slate-300">Organization Name *</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="Acme Capital"
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgType" className="text-slate-300">Organization Type *</Label>
              <Select value={orgType} onValueChange={setOrgType}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {ORG_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value} className="text-white hover:bg-slate-700">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgWebsite" className="text-slate-300">Website (optional)</Label>
              <Input
                id="orgWebsite"
                type="url"
                value={orgWebsite}
                onChange={e => setOrgWebsite(e.target.value)}
                placeholder="https://acmecapital.com"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateDialog(false)}
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="flex-1 bg-purple-600 hover:bg-purple-500"
                disabled={!orgName.trim() || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Organization'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
