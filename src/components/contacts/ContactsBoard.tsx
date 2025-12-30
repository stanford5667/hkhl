import { AppContact, ContactCategory } from '@/hooks/useAppData';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Landmark,
  UserCircle,
  Users2,
  Scale,
  Package,
  UserCog,
  MoreHorizontal,
  Mail,
  Phone,
  Building2,
  MessageSquare,
  ListTodo,
  MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContactsBoardProps {
  contacts: AppContact[];
  selectedContacts: string[];
  onSelectContacts: (ids: string[]) => void;
  onContactClick: (contact: AppContact) => void;
}

const categoryConfig: Record<
  ContactCategory,
  { label: string; icon: typeof Landmark; color: string; bgColor: string }
> = {
  lender: {
    label: 'Lenders',
    icon: Landmark,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
  },
  executive: {
    label: 'Executives',
    icon: UserCircle,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
  },
  board: {
    label: 'Board',
    icon: Users2,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
  },
  legal: {
    label: 'Legal',
    icon: Scale,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
  },
  vendor: {
    label: 'Vendors',
    icon: Package,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/20',
  },
  team: {
    label: 'Team',
    icon: UserCog,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10 border-pink-500/20',
  },
  other: {
    label: 'Other',
    icon: MoreHorizontal,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50 border-border',
  },
};

const categoryOrder: ContactCategory[] = [
  'team',
  'lender',
  'executive',
  'board',
  'legal',
  'vendor',
  'other',
];

export function ContactsBoard({
  contacts,
  selectedContacts,
  onSelectContacts,
  onContactClick,
}: ContactsBoardProps) {
  const contactsByCategory = categoryOrder.reduce(
    (acc, category) => {
      acc[category] = contacts.filter((c) => c.category === category);
      return acc;
    },
    {} as Record<ContactCategory, AppContact[]>
  );

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {categoryOrder.map((category) => {
        const config = categoryConfig[category];
        const categoryContacts = contactsByCategory[category];
        const Icon = config.icon;

        return (
          <div
            key={category}
            className="flex-shrink-0 w-72 flex flex-col bg-muted/20 rounded-lg border border-border"
          >
            {/* Column Header */}
            <div className={cn('p-3 border-b border-border', config.bgColor)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4', config.color)} />
                  <span className="font-medium text-foreground text-sm">{config.label}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {categoryContacts.length}
                </Badge>
              </div>
            </div>

            {/* Cards */}
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2">
                {categoryContacts.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No contacts
                  </div>
                ) : (
                  categoryContacts.map((contact) => (
                    <BoardContactCard
                      key={contact.id}
                      contact={contact}
                      onClick={() => onContactClick(contact)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}

interface BoardContactCardProps {
  contact: AppContact;
  onClick: () => void;
}

function BoardContactCard({ contact, onClick }: BoardContactCardProps) {
  const initials = `${contact.first_name[0]}${contact.last_name[0]}`.toUpperCase();
  const isTeamMember = contact.category === 'team';

  return (
    <Card
      className="p-3 bg-card border-border hover:border-primary/30 cursor-pointer transition-all group"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          {isTeamMember && (
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm truncate">
            {contact.first_name} {contact.last_name}
          </p>
          {contact.title && (
            <p className="text-xs text-muted-foreground truncate">{contact.title}</p>
          )}
          {contact.company && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Building2 className="h-3 w-3" />
              <span className="truncate">{contact.company.name}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
              <MessageSquare className="h-4 w-4 mr-2" />
              {isTeamMember ? 'Message' : 'Send Email'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
              <ListTodo className="h-4 w-4 mr-2" />
              Assign Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Contact Methods */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
          </a>
        )}
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Phone className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </Card>
  );
}
