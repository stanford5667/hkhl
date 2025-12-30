import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Building2, Check, ChevronDown, Plus, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OrganizationSwitcher() {
  const navigate = useNavigate();
  const { currentOrganization, memberships, switchOrganization, isLoading } = useOrganization();
  const [open, setOpen] = useState(false);

  const currentMembership = memberships.find(
    m => m.organization_id === currentOrganization?.id
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSwitch = async (orgId: string) => {
    await switchOrganization(orgId);
    setOpen(false);
  };

  if (isLoading || !currentOrganization) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="h-8 w-8 rounded-lg bg-slate-800 animate-pulse" />
        <div className="h-4 w-24 rounded bg-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 px-3 py-2 h-auto hover:bg-slate-800"
        >
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage src={currentOrganization.logo_url || undefined} />
            <AvatarFallback className="rounded-lg bg-purple-600 text-white text-xs">
              {getInitials(currentOrganization.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {currentOrganization.name}
            </p>
            <p className="text-xs text-slate-500 capitalize">
              {currentMembership?.role || 'member'}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-64 bg-slate-900 border-slate-800"
        sideOffset={8}
      >
        {/* Organization List */}
        {memberships.map(membership => (
          <DropdownMenuItem
            key={membership.organization_id}
            onClick={() => handleSwitch(membership.organization_id)}
            className={cn(
              'flex items-center gap-3 py-2 cursor-pointer',
              membership.organization_id === currentOrganization.id && 'bg-slate-800'
            )}
          >
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={membership.organization?.logo_url || undefined} />
              <AvatarFallback className="rounded-lg bg-slate-700 text-slate-300 text-xs">
                {getInitials(membership.organization?.name || 'Org')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">
                {membership.organization?.name}
              </p>
              <Badge variant="outline" className="text-[10px] px-1 py-0 text-slate-500 border-slate-700">
                {membership.role}
              </Badge>
            </div>
            {membership.organization_id === currentOrganization.id && (
              <Check className="h-4 w-4 text-purple-400" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="bg-slate-800" />

        {/* Settings */}
        <DropdownMenuItem
          onClick={() => {
            navigate('/settings/organization');
            setOpen(false);
          }}
          className="flex items-center gap-2 py-2 cursor-pointer"
        >
          <Settings className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-300">Organization Settings</span>
        </DropdownMenuItem>

        {/* Create New */}
        <DropdownMenuItem
          onClick={() => {
            navigate('/onboarding?step=organization');
            setOpen(false);
          }}
          className="flex items-center gap-2 py-2 cursor-pointer"
        >
          <Plus className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-300">Create New Organization</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
