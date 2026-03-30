import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Brain, User, Loader2, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import type { TradeIntent } from './OptionsAnalyzer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  ticker: string;
  intent: TradeIntent;
}

const INTENT_PROMPTS: Record<TradeIntent, string> = {
  hedge: "I want to HEDGE my position. I'm looking for protective strategies to limit downside risk.",
  income: "I want to generate INCOME. I'm looking for premium-selling strategies with high probability of profit.",
  growth: "I want GROWTH/directional exposure. I'm looking for leveraged upside with defined risk.",
  'event-driven': "I'm trading around an EVENT (earnings, FDA, etc.). I want to capitalize on the expected volatility.",
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/options-advisor`;

export function OptionsAdvisorChat({ ticker, intent }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevTickerRef = useRef(ticker);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset on ticker change
  useEffect(() => {
    if (ticker !== prevTickerRef.current) {
      setMessages([]);
      setHasStarted(false);
      prevTickerRef.current = ticker;
    }
  }, [ticker]);

  const streamChat = useCallback(async (allMessages: Message[]) => {
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: allMessages, ticker }),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `Error ${resp.status}`);
    }
    if (!resp.body) throw new Error('No response body');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let assistantSoFar = '';

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIdx: number;
      while ((newlineIdx = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIdx);
        textBuffer = textBuffer.slice(newlineIdx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') return;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) upsert(content);
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }
  }, [ticker]);

  const handleSend = useCallback(async (overrideMsg?: string) => {
    const text = overrideMsg || input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setHasStarted(true);

    try {
      await streamChat(updatedMessages);
    } catch (e: any) {
      console.error('Chat error:', e);
      toast.error(e.message || 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, streamChat]);

  const startAnalysis = useCallback(() => {
    const prompt = `I'm looking at ${ticker} options. ${INTENT_PROMPTS[intent]} Please analyze the current options chain and recommend the best strikes and expiration dates. Show me the probability analysis, expected move, and risk/reward for your top recommendations.`;
    handleSend(prompt);
  }, [ticker, intent, handleSend]);

  const handleReset = useCallback(() => {
    setMessages([]);
    setHasStarted(false);
  }, []);

  return (
    <Card className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Options Strategy Advisor</span>
          <span className="text-xs text-muted-foreground">· Live {ticker} data</span>
        </div>
        {hasStarted && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 h-7 text-xs">
            <RotateCcw className="h-3 w-3" />
            New Analysis
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {!hasStarted ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-12">
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <Brain className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">AI Options Advisor for {ticker}</h3>
              <p className="text-sm text-muted-foreground max-w-lg">
                Get institutional-grade options analysis powered by live market data. 
                The AI will analyze IV levels, open interest, Greeks, and probability 
                distributions to recommend optimal strikes and timeframes.
              </p>
            </div>
            <Button onClick={startAnalysis} className="gap-2">
              <Brain className="h-4 w-4" />
              Start {intent.charAt(0).toUpperCase() + intent.slice(1)} Analysis
            </Button>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <Brain className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground ml-auto' 
                    : 'bg-muted/50 border border-border'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:mt-3 prose-headings:mb-1 prose-table:text-xs prose-td:py-1 prose-th:py-1 max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center mt-1">
                    <User className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                  <Brain className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-muted/50 border border-border rounded-xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      {hasStarted && (
        <div className="border-t border-border p-3">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask about strikes, expiration, strategy comparisons..."
              className="bg-background/50"
              disabled={isLoading}
            />
            <Button onClick={() => handleSend()} disabled={!input.trim() || isLoading} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2 mt-2 max-w-4xl mx-auto flex-wrap">
            {[
              'What\'s the expected move?',
              'Compare vertical spreads',
              'Best covered call strike?',
              'Show me iron condor setups',
            ].map((q) => (
              <Button
                key={q}
                variant="ghost"
                size="sm"
                className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
                onClick={() => handleSend(q)}
                disabled={isLoading}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
