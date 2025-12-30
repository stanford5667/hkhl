import { useState, useMemo } from 'react';
import { Plus, Search, Users, Table2, LayoutGrid, Star, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAppContacts, useAppCompanies, AppContact } from '@/hooks/useAppData';
import { ContactsTable } from '@/components/contacts/ContactsTable';
import { ContactsBoard } from '@/components/contacts/ContactsBoard';
import { ContactDetailPanel } from '@/components/contacts/ContactDetailPanel';
import { CreateContactDialog } from '@/components/contacts/CreateContactDialog';
import { BulkActionBar } from '@/components/contacts/BulkActionBar';

type ContactCategory = 'lender' | 'executive' | 'board' | 'legal' | 'vendor' | 'team' | 'other';

export default function Contacts() {
  const { contacts, loading, createContact, updateContact, deleteContact } = useAppContacts();
  const { companies } = useAppCompanies();
  const [view, setView] = useState<'table' | 'board'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ContactCategory | 'all'>('all');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [activeContact, setActiveContact] = useState<AppContact | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesSearch =
        `${contact.first_name} ${contact.last_name}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.company?.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = filterType === 'all' || contact.category === filterType;

      return matchesSearch && matchesType;
    });
  }, [contacts, searchQuery, filterType]);

  const handleCreateContact = async (values: any) => {
    await createContact(values);
  };

  const handleContactClick = (contact: AppContact) => {
    setActiveContact(contact);
    setShowChat(true);
  };

  return (
    <div className="p-6 h-full animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="h1 flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              Contacts
            </h1>
            <p className="text-muted-foreground mt-1">
              {contacts.length} contacts · {contacts.filter((c) => c.category === 'team').length} team members
            </p>
          </div>

          <div className="flex items-center gap-3">
            {selectedContacts.length > 0 && (
              <BulkActionBar
                count={selectedContacts.length}
                onAssignTask={() => {}}
                onSendEmail={() => {}}
                onAddToFlow={() => {}}
                onClear={() => setSelectedContacts([])}
              />
            )}

            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 bg-card border-border"
              />
            </div>

            {/* Type Filter */}
            <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
              <SelectTrigger className="w-44 bg-card border-border">
                <SelectValue placeholder="All Contacts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contacts</SelectItem>
                <SelectItem value="team">Team Members</SelectItem>
                <SelectItem value="lender">Lenders</SelectItem>
                <SelectItem value="executive">Executives</SelectItem>
                <SelectItem value="board">Board</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="vendor">Vendors</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            {/* Quick Filters */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8">
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Recent
              </Button>
              <Button variant="ghost" size="sm" className="h-8">
                <Star className="h-3.5 w-3.5 mr-1.5" />
                Favorites
              </Button>
              <Button variant="ghost" size="sm" className="h-8">
                <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                Needs Follow-up
              </Button>
            </div>
          </div>

          {/* View Toggle */}
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && setView(v as 'table' | 'board')}
            className="bg-muted/50 p-1 rounded-lg"
          >
            <ToggleGroupItem value="table" aria-label="Table view" className="h-8 w-8 p-0">
              <Table2 className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="board" aria-label="Board view" className="h-8 w-8 p-0">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Main Content */}
      <div className="h-[calc(100vh-240px)]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-50" />
            <p>No contacts found</p>
            <p className="text-sm">
              {contacts.length === 0
                ? 'Add your first contact to get started'
                : 'Try adjusting your search or filters'}
            </p>
          </div>
        ) : view === 'table' ? (
          <ContactsTable
            contacts={filteredContacts}
            selectedContacts={selectedContacts}
            onSelectContacts={setSelectedContacts}
            onContactClick={handleContactClick}
            onUpdateContact={(id, updates) => updateContact(id, updates)}
            onDeleteContact={deleteContact}
          />
        ) : (
          <ContactsBoard
            contacts={filteredContacts}
            selectedContacts={selectedContacts}
            onSelectContacts={setSelectedContacts}
            onContactClick={handleContactClick}
          />
        )}
      </div>

      {/* Contact Detail Panel */}
      <ContactDetailPanel
        contact={activeContact}
        open={showChat}
        onClose={() => {
          setShowChat(false);
          setActiveContact(null);
        }}
      />

      {/* Create Dialog */}
      <CreateContactDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateContact}
        companies={companies}
      />
    </div>
  );
}
