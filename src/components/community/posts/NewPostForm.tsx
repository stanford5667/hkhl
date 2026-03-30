import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearchPosts } from '@/hooks/useResearchPosts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Send, ImagePlus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function NewPostForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createPost } = useResearchPosts();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    try {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('research-thumbnails')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('research-thumbnails')
        .getPublicUrl(path);

      setThumbnailUrl(publicUrl);
      toast.success('Thumbnail uploaded!');
    } catch (err: any) {
      console.error('Upload failed:', err);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in both title and content');
      return;
    }

    try {
      setSubmitting(true);
      await createPost(title.trim(), content.trim(), thumbnailUrl);
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

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>New Research Post</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Thumbnail upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Thumbnail (optional)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleThumbnailUpload}
              />
              {thumbnailUrl ? (
                <div className="relative rounded-lg overflow-hidden aspect-[16/9] border border-border/50">
                  <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => setThumbnailUrl(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className={cn(
                    "w-full aspect-[16/9] rounded-lg border-2 border-dashed border-border/50",
                    "flex flex-col items-center justify-center gap-2 text-muted-foreground",
                    "hover:border-primary/40 hover:text-primary transition-colors cursor-pointer",
                    "bg-muted/30"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="h-8 w-8" />
                      <span className="text-sm">Click to upload a cover image</span>
                      <span className="text-xs text-muted-foreground/60">PNG, JPG up to 5MB</span>
                    </>
                  )}
                </button>
              )}
            </div>

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
              <p className="text-xs text-muted-foreground">
                Tip: Use $TICKER (e.g. $AAPL, $TSLA) to auto-tag stocks in your post.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/community/posts')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || uploading} className="gap-2">
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
