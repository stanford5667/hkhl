import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import type { MarketTheme } from '@/data/marketThemes';

export default function ThemeAnalysis() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = location.state?.theme as MarketTheme | undefined;

  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!theme || hasStarted.current) return;
    hasStarted.current = true;
    runAnalysis();
  }, [theme]);

  const runAnalysis = async () => {
    if (!theme) return;
    setIsLoading(true);
    setError(null);
    setContent('');

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-theme`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          title: theme.title,
          summary: theme.summary,
          detailedSummary: theme.detailedSummary,
          category: theme.category,
          tickers: theme.tickers,
          headlines: theme.headlines,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: 'Analysis failed' }));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              setContent(accumulated);
            }
          } catch {
            // partial JSON, re-buffer
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // flush remaining
      if (buffer.trim()) {
        for (let raw of buffer.split('\n')) {
          if (!raw || !raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              setContent(accumulated);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      console.error('Theme analysis error:', e);
      setError(e.message || 'Failed to generate analysis');
    } finally {
      setIsLoading(false);
    }
  };

  if (!theme) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No theme data provided.</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Research
          </Button>
        </div>
      </div>
    );
  }

  const IconComponent = theme.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/30 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-md bg-primary/10 border border-primary/20 shrink-0">
              <IconComponent className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-mono font-bold text-foreground truncate">
                {theme.title}
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-mono">
                AI Theme Analysis • {theme.category}
              </p>
            </div>
          </div>
          {isLoading && (
            <div className="ml-auto flex items-center gap-1.5 text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-[10px] font-mono hidden sm:inline">Analyzing…</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10"
      >
        {/* Theme meta pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {theme.tickers.slice(0, 8).map((t) => (
            <button
              key={t.symbol}
              onClick={() => navigate(`/stock/${t.symbol}`)}
              className="px-2.5 py-1 rounded-full text-xs font-mono bg-card border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              {t.symbol}{' '}
              <span className={t.change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {t.change >= 0 ? '+' : ''}{t.change.toFixed(1)}%
              </span>
            </button>
          ))}
        </div>

        {/* AI badge */}
        <div className="flex items-center gap-2 mb-6 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 w-fit">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-mono text-primary">
            Generated by AI • Analysis may contain inaccuracies
          </span>
        </div>

        {/* Error state */}
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    hasStarted.current = false;
                    runAnalysis();
                  }}
                >
                  Retry Analysis
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Streamed markdown content */}
        <div ref={contentRef} className="prose prose-invert prose-sm sm:prose-base max-w-none">
          {content ? (
            <ReactMarkdown
              components={{
                h2: ({ children }) => (
                  <h2 className="text-lg sm:text-xl font-mono font-bold text-foreground mt-8 mb-3 border-b border-border/30 pb-2">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base sm:text-lg font-mono font-semibold text-foreground mt-6 mb-2">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-sm sm:text-base text-foreground/80 leading-relaxed mb-3">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="space-y-1.5 mb-4 text-sm sm:text-base text-foreground/80">
                    {children}
                  </ul>
                ),
                li: ({ children }) => (
                  <li className="flex gap-2">
                    <span className="text-primary mt-1.5 shrink-0">•</span>
                    <span>{children}</span>
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="text-foreground font-semibold">{children}</strong>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          ) : isLoading ? (
            <div className="space-y-4 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted/30 rounded w-1/3" />
                  <div className="h-3 bg-muted/20 rounded w-full" />
                  <div className="h-3 bg-muted/20 rounded w-4/5" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Bottom nav */}
        {!isLoading && content && (
          <div className="mt-10 pt-6 border-t border-border/30 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Research
            </Button>
            {theme.tickers[0] && (
              <Button
                onClick={() => navigate(`/stock/${theme.tickers[0].symbol}`)}
                className="bg-primary hover:bg-primary/90"
              >
                Analyze {theme.tickers[0].symbol}
              </Button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
