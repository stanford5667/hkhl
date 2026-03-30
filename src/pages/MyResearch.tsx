import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useResearchNotes, useCreateNote, useUpdateNote, useDeleteNote, ResearchNote } from '@/hooks/useResearchNotes';
import { useWatchlistWithQuotes } from '@/hooks/useWatchlistWithQuotes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  BookOpen, FileText, Eye, TrendingUp, Briefcase, Plus, Pin, PinOff,
  Trash2, ExternalLink, Share2, Clock, ArrowLeft, StickyNote, BarChart3,
  Copy, Pencil, MessageSquare, Send
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// ── Saved Analyses Tab ──────────────────────────────────────────────────────
function SavedAnalysesTab() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('saved_theme_analyses' as any)
        .select('*')
        .order('created_at', { ascending: false });
      setAnalyses((data || []) as any[]);
      setLoading(false);
    })();
  }, []);

  const handleOpen = (a: any) => {
    navigate('/theme-analysis', {
      state: {
        theme: a.theme_data,
        savedContent: a.analysis_content,
        savedId: a.id,
        shareId: a.share_id,
      },
    });
  };

  const handleShare = async (a: any) => {
    if (!a.is_public) {
      await supabase.from('saved_theme_analyses' as any).update({ is_public: true }).eq('id', a.id);
    }
    const url = `${window.location.origin}/shared/theme/${a.share_id}`;
    navigator.clipboard.writeText(url);
    toast.success('Share link copied!');
  };

  const handleDelete = async (id: string) => {
    await supabase.from('saved_theme_analyses' as any).delete().eq('id', id);
    setAnalyses(prev => prev.filter(a => a.id !== id));
    toast.success('Analysis deleted');
  };

  if (loading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted/30 rounded-lg animate-pulse" />)}</div>;
  if (!analyses.length) return <EmptyState icon={<FileText />} text="No saved analyses yet" sub="Explore market themes and save your AI analyses here." />;

  return (
    <div className="space-y-3">
      {analyses.map(a => (
        <Card key={a.id} className="group hover:border-primary/30 transition-colors cursor-pointer" onClick={() => handleOpen(a)}>
          <CardContent className="p-4 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{a.theme_data?.title || 'Untitled'}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.analysis_content?.slice(0, 150)}...</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-[10px]">{a.theme_data?.category || 'Theme'}</Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(a.created_at), 'MMM d, yyyy')}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleShare(a)}><Share2 className="h-3.5 w-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Notes Tab ───────────────────────────────────────────────────────────────
function NotesTab() {
  const { data: notes = [], isLoading } = useResearchNotes();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTicker, setNewTicker] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [viewingNote, setViewingNote] = useState<ResearchNote | null>(null);
  const [shareNote, setShareNote] = useState<ResearchNote | null>(null);
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [sharing, setSharing] = useState(false);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createNote.mutate({
      title: newTitle.trim(),
      content: newContent.trim(),
      ticker: newTicker.trim().toUpperCase() || undefined,
    });
    setNewTitle(''); setNewContent(''); setNewTicker(''); setShowNew(false);
  };

  const handleSaveEdit = (id: string) => {
    updateNote.mutate({ id, content: editContent });
    setEditingId(null);
  };

  const handleOpenShare = async (note: ResearchNote) => {
    setShareNote(note);
    const { data } = await supabase
      .from('chat_rooms')
      .select('id, name, icon')
      .order('member_count', { ascending: false });
    setChatRooms(data || []);
  };

  const handleShareToChat = async () => {
    if (!shareNote || !selectedRoom) return;
    setSharing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const formatted = `📝 **Shared Note: ${shareNote.title}**${shareNote.ticker ? ` ($${shareNote.ticker})` : ''}\n\n${shareNote.content}`;
      
      const { error } = await supabase.from('chat_messages').insert({
        room_id: selectedRoom,
        user_id: user.id,
        content: formatted,
      });
      if (error) throw error;
      toast.success('Note shared to chat!');
      setShareNote(null);
      setSelectedRoom('');
    } catch (err: any) {
      toast.error('Failed to share: ' + err.message);
    } finally {
      setSharing(false);
    }
  };

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted/30 rounded-lg animate-pulse" />)}</div>;

  return (
    <div className="space-y-3">
      {!showNew ? (
        <Button variant="outline" className="w-full border-dashed" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Note
        </Button>
      ) : (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <Input placeholder="Note title..." value={newTitle} onChange={e => setNewTitle(e.target.value)} className="font-semibold" />
            <Input placeholder="Ticker (optional, e.g. AAPL)" value={newTicker} onChange={e => setNewTicker(e.target.value)} className="text-sm" />
            <Textarea placeholder="Your thoughts, analysis, trade ideas..." value={newContent} onChange={e => setNewContent(e.target.value)} rows={4} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={!newTitle.trim()}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!notes.length && !showNew && <EmptyState icon={<StickyNote />} text="No research notes yet" sub="Jot down trade ideas, thesis notes, or analysis reminders." />}

      {notes.map(note => (
        <Card key={note.id} className="group hover:border-primary/20 transition-colors cursor-pointer" onClick={() => setViewingNote(note)}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {note.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                  <h3 className="font-semibold text-sm truncate">{note.title}</h3>
                  {note.ticker && <Badge variant="secondary" className="text-[10px]">{note.ticker}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">{note.content || 'No content'}</p>
                <span className="text-[10px] text-muted-foreground mt-2 block">{format(new Date(note.updated_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(note.id); setEditContent(note.content); setViewingNote(note); }}><Pencil className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenShare(note)}><MessageSquare className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateNote.mutate({ id: note.id, is_pinned: !note.is_pinned })}>
                  {note.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteNote.mutate(note.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Full Note View Dialog */}
      <Dialog open={!!viewingNote} onOpenChange={(open) => { if (!open) { setViewingNote(null); setEditingId(null); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {viewingNote?.is_pinned && <Pin className="h-4 w-4 text-primary" />}
              <DialogTitle className="text-lg">{viewingNote?.title}</DialogTitle>
              {viewingNote?.ticker && <Badge variant="secondary">{viewingNote.ticker}</Badge>}
            </div>
            {viewingNote && (
              <span className="text-xs text-muted-foreground">{format(new Date(viewingNote.updated_at), 'MMM d, yyyy h:mm a')}</span>
            )}
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            {editingId === viewingNote?.id ? (
              <div className="space-y-3 pr-4">
                <Textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={12}
                  className="min-h-[200px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { handleSaveEdit(viewingNote!.id); setViewingNote({ ...viewingNote!, content: editContent }); }}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap leading-relaxed pr-4">{viewingNote?.content || 'No content'}</p>
            )}
          </ScrollArea>
          <div className="flex gap-2 pt-3 border-t">
            {editingId !== viewingNote?.id && (
              <Button size="sm" variant="outline" onClick={() => { if (viewingNote) { setEditingId(viewingNote.id); setEditContent(viewingNote.content); } }}>
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => { if (viewingNote) handleOpenShare(viewingNote); }}>
              <MessageSquare className="h-3 w-3 mr-1" /> Share to Chat
            </Button>
            <Button size="sm" variant="outline" onClick={() => { if (viewingNote) { navigator.clipboard.writeText(viewingNote.content); toast.success('Copied to clipboard'); } }}>
              <Copy className="h-3 w-3 mr-1" /> Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share to Chat Dialog */}
      <Dialog open={!!shareNote} onOpenChange={(open) => { if (!open) setShareNote(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share Note to Chat</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Select a chat room to share "{shareNote?.title}" to:</p>
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger>
              <SelectValue placeholder="Select a room..." />
            </SelectTrigger>
            <SelectContent>
              {chatRooms.map(room => (
                <SelectItem key={room.id} value={room.id}>
                  {room.icon} {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShareNote(null)}>Cancel</Button>
            <Button size="sm" disabled={!selectedRoom || sharing} onClick={handleShareToChat}>
              <Send className="h-3 w-3 mr-1" /> {sharing ? 'Sharing...' : 'Share'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Watchlist Tab ────────────────────────────────────────────────────────────
function WatchlistTab() {
  const navigate = useNavigate();
  const { items, isLoading } = useWatchlistWithQuotes();

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-muted/30 rounded-lg animate-pulse" />)}</div>;
  if (!items.length) return <EmptyState icon={<Eye />} text="Watchlist empty" sub="Add tickers to your watchlist from any stock page." action={{ label: 'Browse stocks', onClick: () => navigate('/research') }} />;

  return (
    <div className="space-y-2">
      {items.map(item => (
        <Card key={item.item_id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate(`/stock/${item.item_id}`)}>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <span className="font-mono font-bold text-sm">{item.item_id}</span>
              <span className="text-xs text-muted-foreground ml-2 truncate">{item.item_name}</span>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm">${item.currentPrice?.toFixed(2) || '—'}</span>
              {item.changePercent != null && (
                <span className={cn('ml-2 text-xs font-mono', item.changePercent >= 0 ? 'text-[hsl(var(--primary))]' : 'text-destructive')}>
                  {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" className="w-full" onClick={() => navigate('/watchlist')}>
        <ExternalLink className="h-3.5 w-3.5 mr-2" /> Full Watchlist
      </Button>
    </div>
  );
}

// ── Sim Portfolio Tab ───────────────────────────────────────────────────────
function SimPortfolioTab() {
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('sim_portfolios' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setPortfolios((data || []) as any[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />)}</div>;
  if (!portfolios.length) return <EmptyState icon={<Briefcase />} text="No sim portfolios" sub="Create a simulated portfolio to practice trading." action={{ label: 'Start sim trading', onClick: () => navigate('/sim-trading') }} />;

  return (
    <div className="space-y-2">
      {portfolios.map(p => (
        <Card key={p.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/sim-trading')}>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <span className="font-semibold text-sm">{p.name}</span>
              <span className="text-xs text-muted-foreground ml-2">Created {format(new Date(p.created_at), 'MMM d')}</span>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm">${Number(p.cash_balance || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span className="text-[10px] text-muted-foreground block">Cash</span>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" className="w-full" onClick={() => navigate('/sim-trading')}>
        <ExternalLink className="h-3.5 w-3.5 mr-2" /> Open Sim Trading
      </Button>
    </div>
  );
}

// ── Quick Actions ───────────────────────────────────────────────────────────
function QuickActions() {
  const navigate = useNavigate();
  const actions = [
    { icon: TrendingUp, label: 'Explore Themes', onClick: () => navigate('/research') },
    { icon: BarChart3, label: 'Screener', onClick: () => navigate('/asset-research') },
    { icon: Briefcase, label: 'Sim Trading', onClick: () => navigate('/sim-trading') },
    { icon: BookOpen, label: 'Academy', onClick: () => navigate('/academy') },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map(a => (
        <Button key={a.label} variant="outline" className="h-auto py-3 flex flex-col gap-1" onClick={a.onClick}>
          <a.icon className="h-4 w-4 text-primary" />
          <span className="text-xs">{a.label}</span>
        </Button>
      ))}
    </div>
  );
}

// ── Empty State helper ──────────────────────────────────────────────────────
function EmptyState({ icon, text, sub, action }: { icon: React.ReactNode; text: string; sub: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="text-center py-8 text-muted-foreground space-y-2">
      <div className="flex justify-center opacity-40">{icon}</div>
      <p className="text-sm font-medium">{text}</p>
      <p className="text-xs">{sub}</p>
      {action && <Button size="sm" variant="outline" className="mt-2" onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function MyResearchPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  useEffect(() => {
    if (!user) navigate('/auth', { state: { from: '/my-research' } });
  }, [user, navigate]);

  useEffect(() => {
    if (!adminLoading && user && !isAdmin) navigate('/research');
  }, [isAdmin, adminLoading, user, navigate]);

  if (!user || adminLoading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/research')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-mono font-bold text-foreground">My Research</h1>
              <p className="text-xs text-muted-foreground">Your personal research workspace</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Main tabs */}
        <Tabs defaultValue="notes" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="notes" className="text-xs py-2 gap-1"><StickyNote className="h-3.5 w-3.5" /> Notes</TabsTrigger>
            <TabsTrigger value="analyses" className="text-xs py-2 gap-1"><FileText className="h-3.5 w-3.5" /> Analyses</TabsTrigger>
            <TabsTrigger value="watchlist" className="text-xs py-2 gap-1"><Eye className="h-3.5 w-3.5" /> Watchlist</TabsTrigger>
            <TabsTrigger value="sim" className="text-xs py-2 gap-1"><Briefcase className="h-3.5 w-3.5" /> Sim</TabsTrigger>
          </TabsList>

          <TabsContent value="notes"><NotesTab /></TabsContent>
          <TabsContent value="analyses"><SavedAnalysesTab /></TabsContent>
          <TabsContent value="watchlist"><WatchlistTab /></TabsContent>
          <TabsContent value="sim"><SimPortfolioTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
