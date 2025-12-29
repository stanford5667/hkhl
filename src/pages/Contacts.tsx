import { useState, useMemo } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContacts, ContactCategory } from '@/hooks/useContacts';
import { useCompanies } from '@/hooks/useCompanies';
import { CategorySidebar } from '@/components/contacts/CategorySidebar';
import { ContactCard } from '@/components/contacts/ContactCard';
import { CreateContactDialog } from '@/components/contacts/CreateContactDialog';

export default function Contacts() {
  const { contacts, loading, createContact, deleteContact } = useContacts();
  const { companies } = useCompanies();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ContactCategory | 'all'>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const categoryCounts = useMemo(() => {
    const counts: Record<ContactCategory | 'all', number> = {
      all: contacts.length,
      lender: 0,
      executive: 0,
      board: 0,
      legal: 0,
      vendor: 0,
      team: 0,
      other: 0,
    };

    contacts.forEach((c) => {
      counts[c.category]++;
    });

    return counts;
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesSearch =
        `${contact.first_name} ${contact.last_name}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.company?.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || contact.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [contacts, searchQuery, selectedCategory]);

  const handleCreateContact = async (values: any) => {
    await createContact(values);
  };

  return (
    <div className="p-6 h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="h1 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Contacts
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your network of lenders, executives, and advisors
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Main Layout */}
      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* Category Sidebar */}
        <CategorySidebar
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
          counts={categoryCounts}
        />

        {/* Contact List */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-4">
            {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
          </p>

          {/* Contacts Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mb-3 opacity-50" />
                <p>No contacts found</p>
                <p className="text-sm">
                  {contacts.length === 0
                    ? 'Add your first contact to get started'
                    : 'Try adjusting your search or filters'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredContacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onDelete={(c) => deleteContact(c.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
