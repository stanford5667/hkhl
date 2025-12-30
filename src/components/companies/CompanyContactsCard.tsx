import { useState } from 'react';
import { 
  Users, 
  Plus, 
  Mail, 
  Phone,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  Search,
  Check,
  UserPlus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  category: string | null;
  role_at_company?: string | null;
}

interface CompanyContactsCardProps {
  companyId: string;
  contacts: Contact[];
  onRefresh: () => void;
}

const ROLE_OPTIONS = [
  'CEO', 'CFO', 'COO', 'CTO', 'Founder',
  'Board Member', 'Advisor', 'Consultant',
  'Investment Banker', 'Broker', 'Attorney', 'Accountant',
  'Key Employee', 'Other'
];

export function CompanyContactsCard({ companyId, contacts, onRefresh }: CompanyContactsCardProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const navigate = useNavigate();

  // Group contacts by role category
  const groupedContacts = {
    management: contacts.filter(c => 
      ['CEO', 'CFO', 'COO', 'CTO', 'Founder'].includes(c.role_at_company || c.title || '')
    ),
    advisors: contacts.filter(c => 
      ['Advisor', 'Board Member', 'Consultant'].includes(c.role_at_company || c.title || '')
    ),
    dealTeam: contacts.filter(c => 
      ['Investment Banker', 'Broker', 'Attorney', 'Accountant'].includes(c.role_at_company || c.title || '')
    ),
    other: contacts.filter(c => {
      const role = c.role_at_company || c.title || '';
      return !['CEO', 'CFO', 'COO', 'CTO', 'Founder', 'Advisor', 'Board Member', 'Consultant', 'Investment Banker', 'Broker', 'Attorney', 'Accountant'].includes(role);
    })
  };

  const handleUpdateRole = async (contactId: string, role: string) => {
    await supabase
      .from('contacts')
      .update({ role_at_company: role })
      .eq('id', contactId);
    onRefresh();
  };

  const handleRemoveContact = async (contactId: string) => {
    await supabase
      .from('contacts')
      .update({ company_id: null, role_at_company: null })
      .eq('id', contactId);
    onRefresh();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Related Contacts
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {contacts.length === 0 ? (
          <div className="text-center py-6">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No contacts assigned</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => setShowAddDialog(true)}
            >
              Add First Contact
            </Button>
          </div>
        ) : (
          <>
            {/* Management */}
            {groupedContacts.management.length > 0 && (
              <ContactGroup 
                title="Management" 
                contacts={groupedContacts.management}
                onUpdateRole={handleUpdateRole}
                onRemove={handleRemoveContact}
                onNavigate={(id) => navigate(`/contacts/${id}`)}
              />
            )}

            {/* Advisors */}
            {groupedContacts.advisors.length > 0 && (
              <ContactGroup 
                title="Advisors" 
                contacts={groupedContacts.advisors}
                onUpdateRole={handleUpdateRole}
                onRemove={handleRemoveContact}
                onNavigate={(id) => navigate(`/contacts/${id}`)}
              />
            )}

            {/* Deal Team */}
            {groupedContacts.dealTeam.length > 0 && (
              <ContactGroup 
                title="Deal Team" 
                contacts={groupedContacts.dealTeam}
                onUpdateRole={handleUpdateRole}
                onRemove={handleRemoveContact}
                onNavigate={(id) => navigate(`/contacts/${id}`)}
              />
            )}

            {/* Other */}
            {groupedContacts.other.length > 0 && (
              <ContactGroup 
                title="Other" 
                contacts={groupedContacts.other}
                onUpdateRole={handleUpdateRole}
                onRemove={handleRemoveContact}
                onNavigate={(id) => navigate(`/contacts/${id}`)}
              />
            )}
          </>
        )}

        {/* Quick Actions */}
        <div className="pt-3 border-t border-border">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => setShowAddDialog(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Contact
          </Button>
        </div>
      </CardContent>

      <AddContactDialog 
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        companyId={companyId}
        onAdd={onRefresh}
      />
    </Card>
  );
}

function ContactGroup({ 
  title, 
  contacts,
  onUpdateRole,
  onRemove,
  onNavigate
}: { 
  title: string; 
  contacts: Contact[];
  onUpdateRole: (id: string, role: string) => void;
  onRemove: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </h4>
      <div className="space-y-2">
        {contacts.map(contact => (
          <ContactRow 
            key={contact.id} 
            contact={contact}
            onUpdateRole={onUpdateRole}
            onRemove={onRemove}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

function ContactRow({ 
  contact,
  onUpdateRole,
  onRemove,
  onNavigate
}: { 
  contact: Contact;
  onUpdateRole: (id: string, role: string) => void;
  onRemove: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const name = `${contact.first_name} ${contact.last_name}`;
  const initials = `${contact.first_name[0]}${contact.last_name[0]}`;
  const role = contact.role_at_company || contact.title || 'Contact';

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors group">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs bg-primary/20 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        {showRoleSelect ? (
          <Select
            value={role}
            onValueChange={(v) => {
              onUpdateRole(contact.id, v);
              setShowRoleSelect(false);
            }}
          >
            <SelectTrigger className="h-6 text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <button 
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
            onClick={() => setShowRoleSelect(true)}
          >
            {role}
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {contact.email && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
            <a href={`mailto:${contact.email}`}>
              <Mail className="h-3 w-3" />
            </a>
          </Button>
        )}
        {contact.phone && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
            <a href={`tel:${contact.phone}`}>
              <Phone className="h-3 w-3" />
            </a>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onNavigate(contact.id)}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowRoleSelect(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Change Role
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => onRemove(contact.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove from Company
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function AddContactDialog({ 
  open, 
  onClose, 
  companyId,
  onAdd 
}: { 
  open: boolean; 
  onClose: () => void; 
  companyId: string;
  onAdd: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [role, setRole] = useState('');
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [existingContacts, setExistingContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [newContact, setNewContact] = useState({ firstName: '', lastName: '', email: '' });
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch existing contacts
  useState(() => {
    const fetchContacts = async () => {
      const { data } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, title, category, role_at_company')
        .is('company_id', null);
      setExistingContacts((data as Contact[]) || []);
    };
    if (open) fetchContacts();
  });

  const filteredContacts = existingContacts.filter(c => {
    const name = `${c.first_name} ${c.last_name}`.toLowerCase();
    const email = c.email?.toLowerCase() || '';
    return name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
  });

  const handleAdd = async () => {
    if (!user) return;
    setLoading(true);

    try {
      if (mode === 'existing' && selectedContact && role) {
        await supabase
          .from('contacts')
          .update({ company_id: companyId, role_at_company: role })
          .eq('id', selectedContact.id);
      } else if (mode === 'new' && newContact.firstName && newContact.lastName && role) {
        await supabase
          .from('contacts')
          .insert({
            first_name: newContact.firstName,
            last_name: newContact.lastName,
            email: newContact.email || null,
            company_id: companyId,
            role_at_company: role,
            user_id: user.id
          });
      }

      toast({ title: 'Contact assigned', description: 'Contact has been linked to this company' });
      onAdd();
      onClose();
      setSelectedContact(null);
      setRole('');
      setNewContact({ firstName: '', lastName: '', email: '' });
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({ title: 'Error', description: 'Failed to assign contact', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Contact to Company</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'existing' | 'new')}>
          <TabsList className="w-full">
            <TabsTrigger value="existing" className="flex-1">Existing Contact</TabsTrigger>
            <TabsTrigger value="new" className="flex-1">New Contact</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                    selectedContact?.id === contact.id
                      ? "bg-primary/20 border border-primary"
                      : "hover:bg-secondary"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {contact.first_name[0]}{contact.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {contact.first_name} {contact.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                  </div>
                  {selectedContact?.id === contact.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
              {filteredContacts.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No unassigned contacts found
                </p>
              )}
            </div>

            {selectedContact && (
              <div>
                <Label>Role at this Company</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </TabsContent>

          <TabsContent value="new" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name</Label>
                <Input
                  value={newContact.firstName}
                  onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  value={newContact.lastName}
                  onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Role at this Company</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleAdd} 
            disabled={loading || !role || (mode === 'existing' ? !selectedContact : !newContact.firstName || !newContact.lastName)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
