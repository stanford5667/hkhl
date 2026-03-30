import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearchPosts } from '@/hooks/useResearchPosts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';

export function NewPostForm() {
  const navigate = useNavigate();
  const { createPost } = useResearchPosts();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in both title and content');
      return;
    }

    try {
      setSubmitting(true);
      await createPost(title.trim(), content.trim());
      toast.success('Post published!');
      navigate('/community/posts', { replace: true });
    } catch (err: any) {
      console.error('Failed to create post:', err);
      toast.error(err.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 gap-2"
        onClick={() => navigate('/community/posts')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Research
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>New Research Post</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="title"
                placeholder="e.g. $AAPL earnings analysis — bull case for Q2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">
                Content
              </label>
              <Textarea
                id="content"
                placeholder="Share your research, analysis, or trade idea. Use $TICKER to tag stocks."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="resize-y min-h-[200px]"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/community/posts')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                <Send className="h-4 w-4" />
                {submitting ? 'Publishing...' : 'Publish'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
