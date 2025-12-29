import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Loader2,
  Send,
  Trash2,
  Clock,
  User,
  MessageSquare,
  Save,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

type DocumentStatus = 'pending' | 'needs_review' | 'approved' | 'rejected';

interface DocumentComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
}

interface DocumentDetailsProps {
  documentId: string | null;
  documentName: string;
  documentType: string;
  documentSize: string;
  filePath?: string;
  open: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
}

const STATUS_OPTIONS: { value: DocumentStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'bg-muted text-muted-foreground' },
  { value: 'needs_review', label: 'Needs Review', color: 'bg-warning/20 text-warning' },
  { value: 'approved', label: 'Approved', color: 'bg-success/20 text-success' },
  { value: 'rejected', label: 'Outdated', color: 'bg-destructive/20 text-destructive' },
];

export function DocumentDetailsPanel({
  documentId,
  documentName,
  documentType,
  documentSize,
  filePath,
  open,
  onClose,
  onStatusChange,
}: DocumentDetailsProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<DocumentStatus>('pending');
  const [notes, setNotes] = useState('');
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Fetch document details and comments
  useEffect(() => {
    if (!documentId || !open) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        // Fetch document details
        const { data: doc, error: docError } = await supabase
          .from('documents')
          .select('doc_status, notes')
          .eq('id', documentId)
          .maybeSingle();

        if (docError) throw docError;
        if (doc) {
          setStatus((doc.doc_status as DocumentStatus) || 'pending');
          setNotes(doc.notes || '');
        }

        // Fetch comments
        const { data: commentsData, error: commentsError } = await supabase
          .from('document_comments')
          .select('*')
          .eq('document_id', documentId)
          .order('created_at', { ascending: true });

        if (commentsError) throw commentsError;
        setComments(commentsData || []);
      } catch (error) {
        console.error('Error fetching document details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [documentId, open]);

  const handleSave = async () => {
    if (!documentId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          doc_status: status,
          notes: notes,
        })
        .eq('id', documentId);

      if (error) throw error;
      toast.success('Document updated');
      onStatusChange?.();
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!documentId || !user || !newComment.trim()) return;

    try {
      const { data, error } = await supabase
        .from('document_comments')
        .insert({
          document_id: documentId,
          user_id: user.id,
          content: newComment.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      setComments((prev) => [...prev, data]);
      setNewComment('');
      toast.success('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('document_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const handleDownload = async () => {
    if (!filePath) {
      toast.error('No file available');
      return;
    }

    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 60);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download');
    } finally {
      setDownloading(false);
    }
  };

  const getFileIcon = () => {
    if (['xlsx', 'xls', 'csv'].includes(documentType)) {
      return <FileSpreadsheet className="h-6 w-6 text-success" />;
    }
    return <FileText className="h-6 w-6 text-primary" />;
  };

  const statusConfig = STATUS_OPTIONS.find((s) => s.value === status);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[420px] sm:w-[480px] p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-start gap-3">
            {getFileIcon()}
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-left truncate pr-8">{documentName}</SheetTitle>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">{documentType.toUpperCase()}</Badge>
                <span>{documentSize}</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Status */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Status
                </label>
                <Select value={status} onValueChange={(v) => setStatus(v as DocumentStatus)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${opt.color.split(' ')[0]}`} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Owner */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Owner
                </label>
                <div className="flex items-center gap-2 p-3 border border-border rounded-md bg-background">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">You</p>
                    <p className="text-xs text-muted-foreground">Document owner</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Notes
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this document..."
                  className="bg-background resize-none"
                  rows={4}
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>

              <Separator />

              {/* Comments */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium text-foreground">
                    Comments ({comments.length})
                  </h4>
                </div>

                {/* Comment List */}
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No comments yet
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="group p-3 border border-border rounded-md bg-muted/30"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs bg-primary/20 text-primary">
                                U
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                        <p className="text-sm text-foreground mt-2">{comment.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment */}
                <div className="flex gap-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="bg-background resize-none flex-1"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.metaKey) {
                        handleAddComment();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleDownload}
            disabled={!filePath || downloading}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download File
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
