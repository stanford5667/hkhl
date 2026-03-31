import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearchPosts } from '@/hooks/useResearchPosts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft, Send, ImagePlus, X, Loader2, Sparkles, Wand2,
  FileText, ListOrdered, ChevronRight, Image as ImageIcon, PenLine,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-ai-assist`;

async function streamAIText(
  body: Record<string, string | undefined>,
  onDelta: (text: string) => void,
  onDone: () => void,
  signal?: AbortSignal,
) {
  const resp = await fetch(FUNC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Request failed (${resp.status})`);
  }

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf('\n')) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch { /* partial */ }
    }
  }
  onDone();
}

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

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAction, setAiAction] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Inline image generation state
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [inlineImages, setInlineImages] = useState<{ id: string; url: string; caption: string }[]>([]);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }

    try {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('research-thumbnails').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('research-thumbnails').getPublicUrl(path);
      setThumbnailUrl(publicUrl);
      toast.success('Thumbnail uploaded!');
    } catch (err: any) {
      console.error('Upload failed:', err);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  // AI writing actions
  const runAiAction = useCallback(async (action: string) => {
    if (!title.trim() && !content.trim() && action !== 'outline') {
      toast.error('Add a title or some content first');
      return;
    }
    setAiLoading(true);
    setAiAction(action);
    const controller = new AbortController();
    abortRef.current = controller;

    let accumulated = '';
    try {
      await streamAIText(
        { action, content, title, prompt: title || content.slice(0, 200) },
        (delta) => {
          accumulated += delta;
          if (action === 'expand' || action === 'outline') {
            setContent(accumulated);
          } else if (action === 'improve' || action === 'summarize') {
            setContent(accumulated);
          } else if (action === 'continue') {
            setContent(content + accumulated);
          }
        },
        () => {},
        controller.signal,
      );
      toast.success(`AI ${action} complete`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('AI error:', err);
        toast.error(err.message || 'AI request failed');
      }
    } finally {
      setAiLoading(false);
      setAiAction(null);
      abortRef.current = null;
    }
  }, [title, content]);

  const cancelAi = () => {
    abortRef.current?.abort();
    setAiLoading(false);
    setAiAction(null);
  };

  // Generate inline image
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) { toast.error('Enter an image description'); return; }
    setGeneratingImage(true);
    try {
      const resp = await fetch(FUNC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: 'generate_image', prompt: imagePrompt }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Image generation failed');
      }

      const { imageBase64 } = await resp.json();

      // Upload base64 to storage
      const byteString = atob(imageBase64.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: 'image/png' });

      const path = `${user!.id}/inline-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage.from('research-thumbnails').upload(path, blob);
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('research-thumbnails').getPublicUrl(path);

      const imgId = `img-${Date.now()}`;
      setInlineImages(prev => [...prev, { id: imgId, url: publicUrl, caption: imagePrompt }]);

      // Insert image markdown into content at cursor position
      const imgMarkdown = `\n\n![${imagePrompt}](${publicUrl})\n\n`;
      setContent(prev => prev + imgMarkdown);

      setImageDialogOpen(false);
      setImagePrompt('');
      toast.success('Image generated and inserted!');
    } catch (err: any) {
      console.error('Image gen error:', err);
      toast.error(err.message || 'Failed to generate image');
    } finally {
      setGeneratingImage(false);
    }
  };

  const removeInlineImage = (imgId: string, url: string) => {
    setInlineImages(prev => prev.filter(i => i.id !== imgId));
    // Remove from content
    setContent(prev => prev.replace(new RegExp(`\\n?\\n?!\\[.*?\\]\\(${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\n?\\n?`), '\n'));
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
    <div className="max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" className="mb-4 gap-2" onClick={() => navigate('/community/posts')}>
        <ArrowLeft className="h-4 w-4" />
        Back to Research
      </Button>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>New Research Post</CardTitle>
          {/* AI Assistant Dropdown */}
          <div className="flex items-center gap-2">
            {aiLoading && (
              <Button variant="outline" size="sm" onClick={cancelAi} className="gap-1.5 text-destructive">
                <X className="h-3.5 w-3.5" />
                Stop
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5" disabled={aiLoading}>
                  {aiLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  )}
                  AI Assistant
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Writing Tools</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => runAiAction('outline')} className="gap-2">
                  <ListOrdered className="h-4 w-4" />
                  Generate Outline
                  <span className="ml-auto text-xs text-muted-foreground">from title</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => runAiAction('expand')} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Expand into Article
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => runAiAction('continue')} className="gap-2">
                  <ChevronRight className="h-4 w-4" />
                  Continue Writing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => runAiAction('improve')} className="gap-2">
                  <Wand2 className="h-4 w-4" />
                  Improve Writing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => runAiAction('summarize')} className="gap-2">
                  <PenLine className="h-4 w-4" />
                  Summarize
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Media</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setImageDialogOpen(true)} className="gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Generate AI Image
                  <span className="ml-auto text-xs text-muted-foreground">inline</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Thumbnail upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cover Image (optional)</label>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
              {thumbnailUrl ? (
                <div className="relative rounded-lg overflow-hidden aspect-[16/9] border border-border/50">
                  <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                  <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => setThumbnailUrl(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className={cn(
                    "w-full aspect-[16/9] rounded-lg border-2 border-dashed border-border/50",
                    "flex flex-col items-center justify-center gap-2 text-muted-foreground",
                    "hover:border-primary/40 hover:text-primary transition-colors cursor-pointer bg-muted/30"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-8 w-8 animate-spin" /> : (
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
              <label htmlFor="title" className="text-sm font-medium">Title</label>
              <Input
                id="title"
                placeholder="e.g. $AAPL earnings analysis — bull case for Q2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="content" className="text-sm font-medium">Content</label>
                {aiLoading && (
                  <span className="text-xs text-primary flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    AI is {aiAction === 'outline' ? 'generating outline' : aiAction === 'expand' ? 'expanding' : aiAction === 'continue' ? 'writing' : aiAction === 'improve' ? 'improving' : 'summarizing'}...
                  </span>
                )}
              </div>
              <Textarea
                id="content"
                placeholder="Share your research, analysis, or trade idea. Use $TICKER to tag stocks. Markdown supported."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={16}
                className="resize-y min-h-[300px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Tip: Use $TICKER (e.g. $AAPL, $TSLA) to auto-tag stocks. Markdown supported for formatting.
              </p>
            </div>

            {/* Inline generated images preview */}
            {inlineImages.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Generated Images ({inlineImages.length})</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {inlineImages.map((img) => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border/50 aspect-square">
                      <img src={img.url} alt={img.caption} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
                        <p className="text-white text-xs text-center line-clamp-2 mb-2">{img.caption}</p>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => removeInlineImage(img.id, img.url)}
                        >
                          <X className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/community/posts')}>Cancel</Button>
              <Button type="submit" disabled={submitting || uploading || aiLoading} className="gap-2">
                <Send className="h-4 w-4" />
                {submitting ? 'Publishing...' : 'Publish'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* AI Image Generation Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Generate AI Image
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Describe the image you want to generate. It will be inserted into your article.
            </p>
            <Textarea
              placeholder="e.g. A clean chart showing upward stock market trends with a bull silhouette..."
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogOpen(false)} disabled={generatingImage}>
              Cancel
            </Button>
            <Button onClick={handleGenerateImage} disabled={generatingImage || !imagePrompt.trim()} className="gap-2">
              {generatingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generatingImage ? 'Generating...' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
