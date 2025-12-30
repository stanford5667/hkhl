import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Send, Trash2, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useTaskComments } from '@/hooks/useTaskComments';
import { useAuth } from '@/contexts/AuthContext';

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const { comments, addComment, deleteComment, isLoading } = useTaskComments(taskId);
  const { user } = useAuth();

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    setIsAdding(true);
    try {
      await addComment(newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const getUserInitials = (email?: string) => {
    if (!email) return '?';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4">
      <span className="text-sm text-slate-500">
        Comments {comments.length > 0 && `(${comments.length})`}
      </span>

      {/* Comments list */}
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {comments.length === 0 && !isLoading && (
          <p className="text-slate-600 text-sm text-center py-4">No comments yet</p>
        )}
        
        {comments.map((comment) => {
          const isOwn = comment.author_id === user?.id;
          
          return (
            <div key={comment.id} className="group flex gap-3">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarFallback className="text-[10px] bg-slate-700">
                  {getUserInitials(user?.email)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-slate-400 font-medium">
                    {isOwn ? 'You' : 'Team Member'}
                  </span>
                  <span className="text-xs text-slate-600">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
              
              {isOwn && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400"
                  onClick={() => deleteComment(comment.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add comment input */}
      <div className="flex gap-2 items-end">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 min-h-[60px] resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleAddComment();
            }
          }}
        />
        <Button
          size="icon"
          onClick={handleAddComment}
          disabled={!newComment.trim() || isAdding}
          className="h-9 w-9 flex-shrink-0"
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-slate-600">Press ⌘+Enter to send</p>
    </div>
  );
}