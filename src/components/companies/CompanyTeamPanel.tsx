import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Plus, 
  Crown, 
  MoreHorizontal, 
  Mail, 
  Trash2,
  Search,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompanyTeam, AssignmentRole } from '@/hooks/useCompanyTeam';
import { useTeamMembers, TeamMember } from '@/hooks/useTeamMembers';
import { toast } from 'sonner';

interface CompanyTeamPanelProps {
  companyId: string;
}

const roleConfig: Record<AssignmentRole, { label: string; color: string; icon?: React.ElementType }> = {
  lead: { label: 'Deal Lead', color: 'text-purple-400 bg-purple-500/20 border-purple-500/30', icon: Crown },
  associate: { label: 'Associate', color: 'text-blue-400 bg-blue-500/20 border-blue-500/30' },
  analyst: { label: 'Analyst', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' },
  reviewer: { label: 'Reviewer', color: 'text-amber-400 bg-amber-500/20 border-amber-500/30' },
};

export function CompanyTeamPanel({ companyId }: CompanyTeamPanelProps) {
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const { assignments, isLoading, addAssignment, updateRole, removeAssignment } = useCompanyTeam(companyId);

  // Group assignments by role
  const grouped = assignments.reduce((acc, assignment) => {
    const role = assignment.role;
    if (!acc[role]) acc[role] = [];
    acc[role].push(assignment);
    return acc;
  }, {} as Record<AssignmentRole, typeof assignments>);

  const roleOrder: AssignmentRole[] = ['lead', 'associate', 'analyst', 'reviewer'];

  const handleRoleChange = async (assignmentId: string, newRole: AssignmentRole) => {
    try {
      await updateRole(assignmentId, newRole);
      toast.success('Role updated');
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleRemove = async (assignmentId: string) => {
    try {
      await removeAssignment(assignmentId);
      toast.success('Team member removed');
    } catch (error) {
      toast.error('Failed to remove team member');
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Deal Team
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => setShowAssignDialog(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignments.length === 0 ? (
            <div className="text-center py-4">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No team assigned</p>
              <Button 
                variant="link" 
                className="text-primary text-sm mt-1"
                onClick={() => setShowAssignDialog(true)}
              >
                Assign team members
              </Button>
            </div>
          ) : (
            roleOrder.map(role => {
              const members = grouped[role];
              if (!members || members.length === 0) return null;
              
              const config = roleConfig[role];
              const Icon = config.icon;
              
              return (
                <div key={role}>
                  <div className="flex items-center gap-2 mb-2">
                    {Icon && <Icon className={cn("h-3 w-3", config.color.split(' ')[0])} />}
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {config.label}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {members.map(assignment => (
                      <TeamMemberRow
                        key={assignment.id}
                        assignment={assignment}
                        onRoleChange={(newRole) => handleRoleChange(assignment.id, newRole)}
                        onRemove={() => handleRemove(assignment.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <AssignTeamDialog
        open={showAssignDialog}
        onClose={() => setShowAssignDialog(false)}
        companyId={companyId}
        existingMemberIds={assignments.map(a => a.team_member_id)}
        onAssign={addAssignment}
      />
    </>
  );
}

interface TeamMemberRowProps {
  assignment: {
    id: string;
    role: AssignmentRole;
    team_member?: {
      id: string;
      name: string;
      email: string;
      title: string | null;
      avatar_url: string | null;
    };
  };
  onRoleChange: (role: AssignmentRole) => void;
  onRemove: () => void;
}

function TeamMemberRow({ assignment, onRoleChange, onRemove }: TeamMemberRowProps) {
  const member = assignment.team_member;
  if (!member) return null;

  return (
    <div className="flex items-center justify-between group p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/20 text-primary text-xs">
            {member.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium text-foreground">{member.name}</p>
          {member.title && (
            <p className="text-xs text-muted-foreground">{member.title}</p>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover border-border">
          <DropdownMenuItem 
            className="text-sm"
            onClick={() => window.location.href = `mailto:${member.email}`}
          >
            <Mail className="h-3.5 w-3.5 mr-2" />
            Email
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {Object.entries(roleConfig).map(([role, config]) => (
            <DropdownMenuItem
              key={role}
              className={cn("text-sm", assignment.role === role && "bg-muted")}
              onClick={() => onRoleChange(role as AssignmentRole)}
            >
              <Badge variant="outline" className={cn("mr-2 text-xs", config.color)}>
                {config.label}
              </Badge>
              {assignment.role === role && '✓'}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-destructive text-sm"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface AssignTeamDialogProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  existingMemberIds: string[];
  onAssign: (memberId: string, role: AssignmentRole) => Promise<unknown>;
}

function AssignTeamDialog({ open, onClose, existingMemberIds, onAssign }: AssignTeamDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<AssignmentRole>('analyst');
  const [isAssigning, setIsAssigning] = useState(false);
  const { teamMembers } = useTeamMembers();

  const availableMembers = teamMembers.filter(
    m => !existingMemberIds.includes(m.id) && 
         m.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAssign = async () => {
    if (!selectedMember) return;
    
    setIsAssigning(true);
    try {
      await onAssign(selectedMember.id, selectedRole);
      toast.success(`${selectedMember.name} assigned as ${roleConfig[selectedRole].label}`);
      setSelectedMember(null);
      setSelectedRole('analyst');
      setSearch('');
      onClose();
    } catch (error) {
      toast.error('Failed to assign team member');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Assign Team Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted border-border"
            />
          </div>

          {/* Member List */}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {availableMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {teamMembers.length === existingMemberIds.length 
                  ? 'All team members are already assigned'
                  : 'No matching team members'}
              </p>
            ) : (
              availableMembers.map(member => (
                <button
                  key={member.id}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                    selectedMember?.id === member.id
                      ? "bg-primary/20 border border-primary"
                      : "hover:bg-muted"
                  )}
                  onClick={() => setSelectedMember(member)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.title || member.role}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Role Selector */}
          {selectedMember && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Role</label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AssignmentRole)}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {Object.entries(roleConfig).map(([role, config]) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-xs", config.color)}>
                          {config.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign} 
              disabled={!selectedMember || isAssigning}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Assign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
