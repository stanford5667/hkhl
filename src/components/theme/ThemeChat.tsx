import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, MessageSquare, ArrowRight, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import type { MarketTheme } from '@/data/marketThemes';

type Msg = { role: 'user' | 'assistant'; content: string };

interface ThemeChatProps {
  theme: MarketTheme;
  analysisContent: string;
}

const SUGGESTED_QUESTIONS = [
  'What entry points look attractive right now?',
  'Which ticker has the best risk/reward?',
  'How would I structure an options trade for this theme?',
  'What are the key levels to watch?',
  'Build me a trade plan for this theme',
];

export function ThemeChat({ theme, analysisContent }: ThemeChatProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: Msg = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    const tickerContext = (theme.tickers || []).length > 0
      ? theme.tickers.map(t => `${t.symbol} (${t.name}) ${t.change >= 0 ? '+' : ''}${t.change.toFixed(1)}% — ${t.sentiment}`).join('\n')
      : 'No specific tickers mapped to this theme.';

    const systemPrompt = `You are a senior equity research analyst and trading strategist. The user is exploring the "${theme.title}" market theme and wants to form actionable trade ideas.

Theme context:
- Category: ${theme.category}
- Summary: ${theme.summary}
- Detailed: ${theme.detailedSummary}

Tickers in this theme:
${tickerContext}

Previous AI analysis of this theme:
${analysisContent.slice(0, 3000)}

Guidelines:
- Be specific with ticker symbols, price levels, and trade structures
- When suggesting trades, include entry, target, and stop-loss levels
- For options trades, suggest specific strike prices and expirations
- Always mention risk management
- Keep responses focused and actionable
- If the user asks for a trade plan, format it clearly with sections`;

    const allMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: text.trim() },
    ];

    let accumulated = '';

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
          tickers: theme.tickers || [],
          headlines: theme.headlines,
          // Pass chat context as additional context
          chatMode: true,
          systemPromptOverride: systemPrompt,
          chatMessages: allMessages,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: 'Chat failed' }));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: accumulated } : m);
                }
                return [...prev, { role: 'assistant', content: accumulated }];
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // flush
      if (buffer.trim()) {
        for (let raw of buffer.split('\n')) {
          if (!raw?.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: accumulated } : m);
                }
                return [...prev, { role: 'assistant', content: accumulated }];
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      console.error('Theme chat error:', e);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${e.message || 'Failed to get a response. Please try again.'}` },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Extract ticker mentions from messages for trade CTAs
  const mentionedTickers = theme.tickers.map(t => t.symbol);

  return (
    <div className="mt-10 border-t border-border/30 pt-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
          <MessageSquare className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-mono font-bold text-foreground">
            Form Your Trade Idea
          </h2>
          <p className="text-[11px] sm:text-xs text-muted-foreground font-mono">
            Ask questions, explore strategies, then execute in your sim portfolio
          </p>
        </div>
      </div>

      {/* Suggested questions */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {SUGGESTED_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              className="px-3 py-1.5 rounded-full text-xs font-mono bg-card border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="space-y-4 mb-5 max-h-[500px] overflow-y-auto pr-1">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'rounded-xl p-4',
                msg.role === 'user'
                  ? 'bg-primary/10 border border-primary/20 ml-8'
                  : 'bg-card border border-border/50 mr-2'
              )}
            >
              {msg.role === 'user' ? (
                <p className="text-sm text-foreground">{msg.content}</p>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      h2: ({ children }) => (
                        <h2 className="text-base font-mono font-bold text-foreground mt-4 mb-2 border-b border-border/30 pb-1.5">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-mono font-semibold text-foreground mt-3 mb-1.5">{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-sm text-foreground/80 leading-relaxed mb-2">{children}</p>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-foreground font-semibold">{children}</strong>
                      ),
                      li: ({ children }) => (
                        <li className="text-sm text-foreground/80 flex gap-2">
                          <span className="text-primary mt-0.5 shrink-0">•</span>
                          <span>{children}</span>
                        </li>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ))}
          {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="bg-card border border-border/50 rounded-xl p-4 mr-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="text-xs font-mono">Thinking…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about entry points, options strategies, risk management…"
          className="min-h-[44px] max-h-[120px] resize-none text-sm bg-card border-border/50 focus-visible:ring-primary/30"
          rows={1}
          disabled={isStreaming}
        />
        <Button
          size="icon"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isStreaming}
          className="h-[44px] w-[44px] shrink-0"
        >
          {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      {/* Trade CTA */}
      {messages.length >= 2 && (
        <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-mono font-bold text-foreground">Ready to trade?</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Take your trade idea to the simulated portfolio and test it risk-free.
          </p>
          <div className="flex flex-wrap gap-2">
            {mentionedTickers.slice(0, 4).map(symbol => (
              <Button
                key={symbol}
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs font-mono"
                onClick={() => navigate('/sim-trading', { state: { prefillTicker: symbol, themeContext: theme.title } })}
              >
                Trade {symbol}
                <ArrowRight className="h-3 w-3" />
              </Button>
            ))}
            <Button
              size="sm"
              className="gap-1.5 text-xs font-mono"
              onClick={() => navigate('/sim-trading', { state: { themeContext: theme.title } })}
            >
              Open Sim Trading
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
