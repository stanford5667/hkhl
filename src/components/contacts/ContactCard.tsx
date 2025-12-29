import { Contact, ContactCategory } from '@/hooks/useContacts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MoreVertical, Building2, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ContactCardProps {
  contact: Contact;
  onDelete?: (contact: Contact) => void;
}

const categoryColors: Record<ContactCategory, string> = {
  lender: 'bg-primary/20 text-primary border-primary/30',
  executive: 'bg-success/20 text-success border-success/30',
  board: 'bg-warning/20 text-warning border-warning/30',
  legal: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  vendor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  team: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  other: 'bg-muted text-muted-foreground border-border',
};

export function ContactCard({ contact, onDelete }: ContactCardProps) {
  const initials = `${contact.first_name[0]}${contact.last_name[0]}`.toUpperCase();

  return (
    <Card className="glass-card hover:border-primary/30 transition-colors group">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-medium text-primary-foreground shrink-0">
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground truncate">
                {contact.first_name} {contact.last_name}
              </h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onDelete?.(contact)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {contact.title && (
              <p className="text-sm text-muted-foreground truncate">{contact.title}</p>
            )}

            {contact.company && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{contact.company.name}</span>
              </div>
            )}

            {/* Contact Info */}
            <div className="flex items-center gap-3 mt-3">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title={contact.email}
                >
                  <Mail className="h-4 w-4" />
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title={contact.phone}
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
              <Badge
                variant="outline"
                className={cn('ml-auto text-xs capitalize', categoryColors[contact.category])}
              >
                {contact.category}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
