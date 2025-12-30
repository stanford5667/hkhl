import { useState, useEffect } from 'react';
import { 
  StickyNote, 
  Plus, 
  Search, 
  Pin,
  Calendar,
  Phone,
  ClipboardCheck,
  Lightbulb,
  AlertTriangle,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Send,
  Filter,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Note {
  id: string;
  title: string | null;
  content: string;
  category: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface CompanyNotesSectionProps {
  companyId: string;
}

const CATEGORIES = [
  { id: 'general', label: 'General', icon: StickyNote, color: 'slate' },
  { id: 'meeting', label: 'Meeting', icon: Calendar, color: 'blue' },
  { id: 'call', label: 'Call', icon: Phone, color: 'emerald' },
  { id: 'diligence', label: 'Due Diligence', icon: ClipboardCheck, color: 'amber' },
  { id: 'thesis', label: 'Thesis', icon: Lightbulb, color: 'purple' },
  { id: 'risk', label: 'Risk', icon: AlertTriangle, color: 'rose' },
];

export function CompanyNotesSection({ companyId }: CompanyNotesSectionProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showNewNote, setShowNewNote] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchNotes = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('company_notes')
      .select('*')
      .eq('company_id', companyId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (!error) {
      setNotes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
  }, [companyId]);

  const addNote = async (noteData: Partial<Note>) => {
    if (!user) return;
    const { error } = await supabase
      .from('company_notes')
      .insert({
        company_id: companyId,
        user_id: user.id,
        title: noteData.title || null,
        content: noteData.content || '',
        category: noteData.category || 'general',
        pinned: false
      });
    
    if (!error) {
      toast({ title: 'Note added', description: 'Your note has been saved' });
      fetchNotes();
    }
  };

  const updateNote = async (noteId: string, updates: Partial<Note>) => {
    const { error } = await supabase
      .from('company_notes')
      .update(updates)
      .eq('id', noteId);
    
    if (!error) {
      fetchNotes();
    }
  };

  const deleteNote = async (noteId: string) => {
    const { error } = await supabase
      .from('company_notes')
      .delete()
      .eq('id', noteId);
    
    if (!error) {
      toast({ title: 'Note deleted' });
      fetchNotes();
    }
  };

  const togglePin = async (noteId: string, pinned: boolean) => {
    await updateNote(noteId, { pinned: !pinned });
  };

  const filteredNotes = notes.filter(note => {
    const matchesFilter = filter === 'all' || note.category === filter;
    const matchesSearch = note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesFilter && matchesSearch;
  });

  const pinnedNotes = filteredNotes.filter(n => n.pinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.pinned);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Notes</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setShowNewNote(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      {/* Quick Note Input */}
      <QuickNoteInput companyId={companyId} onSave={addNote} />

      {/* Notes List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pinned Notes */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Pin className="h-3 w-3" />
                PINNED
              </div>
              <div className="grid gap-3">
                {pinnedNotes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onUpdate={updateNote}
                    onDelete={deleteNote}
                    onPin={togglePin}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Notes */}
          <div className="space-y-3">
            {pinnedNotes.length > 0 && unpinnedNotes.length > 0 && (
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                ALL NOTES
              </h4>
            )}
            <div className="grid gap-3">
              {unpinnedNotes.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onUpdate={updateNote}
                  onDelete={deleteNote}
                  onPin={togglePin}
                />
              ))}
            </div>
          </div>

          {/* Empty State */}
          {filteredNotes.length === 0 && (
            <div className="text-center py-12">
              <StickyNote className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground">No notes yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Start documenting your thoughts, meeting notes, and insights
              </p>
              <Button className="mt-4" onClick={() => setShowNewNote(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Note
              </Button>
            </div>
          )}
        </div>
      )}

      {/* New Note Dialog */}
      <NewNoteDialog
        open={showNewNote}
        onClose={() => setShowNewNote(false)}
        onSave={addNote}
      />
    </div>
  );
}

function NoteCard({ 
  note, 
  onUpdate, 
  onDelete, 
  onPin 
}: { 
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const { toast } = useToast();

  const category = CATEGORIES.find(c => c.id === note.category) || CATEGORIES[0];
  const Icon = category.icon;

  const handleSave = () => {
    onUpdate(note.id, { content: editContent });
    setIsEditing(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(note.content);
    toast({ title: 'Copied', description: 'Note copied to clipboard' });
  };

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center",
            `bg-${category.color}-500/20`
          )}>
            <Icon className={cn("h-4 w-4", `text-${category.color}-400`)} />
          </div>
          <Badge variant="outline" className="text-xs">
            {category.label}
          </Badge>
          {note.pinned && (
            <Pin className="h-3 w-3 text-primary" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {format(new Date(note.created_at), 'MMM d, h:mm a')}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPin(note.id, note.pinned)}>
                <Pin className="h-4 w-4 mr-2" />
                {note.pinned ? 'Unpin' : 'Pin to Top'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => onDelete(note.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Title */}
      {note.title && (
        <h4 className="font-medium text-foreground mb-2">{note.title}</h4>
      )}

      {/* Content */}
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm whitespace-pre-wrap">{note.content}</p>
      )}
    </Card>
  );
}

function QuickNoteInput({ 
  companyId, 
  onSave 
}: { 
  companyId: string;
  onSave: (note: Partial<Note>) => void;
}) {
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [category, setCategory] = useState('general');

  const handleQuickSave = () => {
    if (content.trim()) {
      onSave({ content, category });
      setContent('');
      setIsExpanded(false);
      setCategory('general');
    }
  };

  return (
    <Card className="p-3 bg-secondary/30 border-dashed">
      <div className="flex gap-2">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Quick note..."
          className="bg-background"
          onFocus={() => setIsExpanded(true)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleQuickSave()}
        />
        {isExpanded && (
          <Button onClick={handleQuickSave} disabled={!content.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
      {isExpanded && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">Category:</span>
          <div className="flex gap-1">
            {CATEGORIES.slice(0, 4).map(cat => (
              <Button
                key={cat.id}
                variant={category === cat.id ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setCategory(cat.id)}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function NewNoteDialog({ 
  open, 
  onClose, 
  onSave 
}: { 
  open: boolean;
  onClose: () => void;
  onSave: (note: Partial<Note>) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');

  const handleSave = () => {
    onSave({ title: title || undefined, content, category });
    setTitle('');
    setContent('');
    setCategory('general');
    onClose();
  };

  const insertTemplate = (type: string) => {
    const templates: Record<string, string> = {
      meeting: `Meeting Notes\n\nDate: ${format(new Date(), 'MMMM d, yyyy')}\nAttendees:\n\nKey Discussion Points:\n-\n\nAction Items:\n-\n\nNext Steps:\n`,
      call: `Call Notes\n\nDate: ${format(new Date(), 'MMMM d, yyyy')}\nWith:\n\nSummary:\n\nFollow-up:\n`,
      diligence: `Due Diligence Checklist\n\n[ ] Financial statements reviewed\n[ ] Customer references contacted\n[ ] Management interviews completed\n[ ] Market analysis done\n[ ] Legal review\n[ ] Technology assessment\n\nFindings:\n`
    };
    setContent(templates[type] || '');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Note</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category Selection */}
          <div>
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <Button
                    key={cat.id}
                    type="button"
                    variant={category === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategory(cat.id)}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {cat.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <Label>Title (optional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="mt-1"
            />
          </div>

          {/* Content */}
          <div>
            <Label>Note</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note..."
              className="mt-1 min-h-[150px]"
            />
          </div>

          {/* AI Assist */}
          <div className="p-3 bg-purple-950/20 rounded-lg border border-purple-900/30">
            <p className="text-xs text-purple-400 mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Templates
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => insertTemplate('meeting')}>
                📝 Meeting template
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => insertTemplate('call')}>
                📞 Call notes template
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => insertTemplate('diligence')}>
                📋 DD checklist
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!content.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
