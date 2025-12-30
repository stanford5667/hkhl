import { useState, useMemo } from 'react';
import { Contact, ContactCategory } from '@/hooks/useContacts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Star,
  ExternalLink,
  Mail,
  MoreHorizontal,
  MessageSquare,
  ListTodo,
  Workflow,
  Calendar,
  Phone,
  Edit,
  Trash2,
  Linkedin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ContactsTableProps {
  contacts: Contact[];
  selectedContacts: string[];
  onSelectContacts: (ids: string[]) => void;
  onContactClick: (contact: Contact) => void;
  onUpdateContact?: (id: string, updates: Partial<Contact>) => void;
  onDeleteContact?: (id: string) => void;
}

const categoryConfig: Record<ContactCategory, { color: string; label: string }> = {
  lender: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Lender' },
  executive: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Executive' },
  board: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Board' },
  legal: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Legal' },
  vendor: { color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', label: 'Vendor' },
  team: { color: 'bg-pink-500/20 text-pink-400 border-pink-500/30', label: 'Team' },
  other: { color: 'bg-muted text-muted-foreground border-border', label: 'Other' },
};

export function ContactsTable({
  contacts,
  selectedContacts,
  onSelectContacts,
  onContactClick,
  onUpdateContact,
  onDeleteContact,
}: ContactsTableProps) {
  const [sortBy, setSortBy] = useState<string>('last_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => {
      let aVal: any = a[sortBy as keyof Contact];
      let bVal: any = b[sortBy as keyof Contact];
      
      if (sortBy === 'name') {
        aVal = `${a.last_name} ${a.first_name}`;
        bVal = `${b.last_name} ${b.first_name}`;
      }
      if (sortBy === 'company') {
        aVal = a.company?.name || '';
        bVal = b.company?.name || '';
      }
      
      const dir = sortDir === 'asc' ? 1 : -1;
      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });
  }, [contacts, sortBy, sortDir]);

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      onSelectContacts([]);
    } else {
      onSelectContacts(contacts.map(c => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedContacts.includes(id)) {
      onSelectContacts(selectedContacts.filter(c => c !== id));
    } else {
      onSelectContacts([...selectedContacts, id]);
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-50" />;
    return sortDir === 'asc' 
      ? <ArrowUp className="h-3.5 w-3.5 ml-1 text-primary" />
      : <ArrowDown className="h-3.5 w-3.5 ml-1 text-primary" />;
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-12">
              <Checkbox
                checked={selectedContacts.length === contacts.length && contacts.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead 
              className="cursor-pointer select-none"
              onClick={() => toggleSort('name')}
            >
              <span className="flex items-center">
                Name
                <SortIcon column="name" />
              </span>
            </TableHead>
            <TableHead 
              className="cursor-pointer select-none"
              onClick={() => toggleSort('category')}
            >
              <span className="flex items-center">
                Type
                <SortIcon column="category" />
              </span>
            </TableHead>
            <TableHead 
              className="cursor-pointer select-none"
              onClick={() => toggleSort('company')}
            >
              <span className="flex items-center">
                Company
                <SortIcon column="company" />
              </span>
            </TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Email</TableHead>
            <TableHead 
              className="cursor-pointer select-none"
              onClick={() => toggleSort('updated_at')}
            >
              <span className="flex items-center">
                Last Contact
                <SortIcon column="updated_at" />
              </span>
            </TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedContacts.map((contact) => (
            <ContactTableRow
              key={contact.id}
              contact={contact}
              selected={selectedContacts.includes(contact.id)}
              onSelect={() => toggleSelect(contact.id)}
              onClick={() => onContactClick(contact)}
              onUpdate={onUpdateContact}
              onDelete={onDeleteContact}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface ContactTableRowProps {
  contact: Contact;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onUpdate?: (id: string, updates: Partial<Contact>) => void;
  onDelete?: (id: string) => void;
}

function ContactTableRow({ contact, selected, onSelect, onClick, onUpdate, onDelete }: ContactTableRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const initials = `${contact.first_name[0]}${contact.last_name[0]}`.toUpperCase();
  const categoryStyle = categoryConfig[contact.category] || categoryConfig.other;

  return (
    <TableRow
      className={cn(
        "cursor-pointer transition-colors",
        selected && "bg-primary/5",
        isHovered && "bg-muted/50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={onSelect} />
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            {contact.category === 'team' && (
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                {contact.first_name} {contact.last_name}
              </span>
            </div>
          </div>
        </div>
      </TableCell>
      
      <TableCell>
        <Badge variant="outline" className={cn("text-xs capitalize", categoryStyle.color)}>
          {categoryStyle.label}
        </Badge>
      </TableCell>
      
      <TableCell>
        {contact.company ? (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            {contact.company.name}
          </div>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </TableCell>
      
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {contact.title || <span className="text-muted-foreground/50">—</span>}
        </span>
      </TableCell>
      
      <TableCell onClick={(e) => e.stopPropagation()}>
        {contact.email ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground truncate max-w-[180px]">
              {contact.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              asChild
            >
              <a href={`mailto:${contact.email}`}>
                <Mail className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </TableCell>
      
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(contact.updated_at), { addSuffix: true })}
        </span>
      </TableCell>
      
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onClick}>
              <MessageSquare className="h-4 w-4 mr-2" />
              {contact.category === 'team' ? 'Message' : 'Send Email'}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ListTodo className="h-4 w-4 mr-2" />
              Assign Task
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Workflow className="h-4 w-4 mr-2" />
              Add to Flow
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Meeting
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Phone className="h-4 w-4 mr-2" />
              Log Call
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Edit className="h-4 w-4 mr-2" />
              Edit Contact
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete?.(contact.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
