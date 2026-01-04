import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Sparkles, X, Minimize2, Maximize2, 
  TrendingUp, Newspaper, Activity, BarChart3 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface MarketChatAssistantProps {
  onClose?: () => void;
  defaultMinimized?: boolean;
}

const TypingIndicator = () => (
  <div className="flex items-center gap-1 p-3">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="w-2 h-2 bg-primary/50 rounded-full"
        animate={{ y: [0, -6, 0] }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          delay: i * 0.15,
          ease: "easeInOut"
        }}
      />
    ))}
  </div>
);

const BotAvatar = () => (
  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
    <Sparkles className="w-4 h-4 text-white" />
  </div>
);

const QuickActionButton = ({ 
  icon: Icon, 
  label, 
  onClick 
}: { 
  icon: React.ElementType; 
  label: string; 
  onClick: () => void;
}) => (
  <Button
    variant="outline"
    size="sm"
    onClick={onClick}
    className="text-xs gap-1.5 h-7"
  >
    <Icon className="w-3 h-3" />
    {label}
  </Button>
);

const formatMessage = (content: string) => {
  // Convert markdown-like formatting
  return content
    .split('\n')
    .map((line, i) => {
      // Handle emoji sections
      if (line.startsWith('📊') || line.startsWith('📰') || line.startsWith('🐋') || 
          line.startsWith('💬') || line.startsWith('💡') || line.startsWith('⚠️')) {
        return (
          <p key={i} className="font-medium mt-3 first:mt-0">
            {line}
          </p>
        );
      }
      // Handle bullet points
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return (
          <p key={i} className="pl-4 text-sm">
            {line}
          </p>
        );
      }
      // Handle numbered lists
      if (/^\d+\./.test(line.trim())) {
        return (
          <p key={i} className="pl-2 text-sm mt-1">
            {line}
          </p>
        );
      }
      // Regular paragraph
      if (line.trim()) {
        return (
          <p key={i} className="text-sm mt-1 first:mt-0">
            {line}
          </p>
        );
      }
      return null;
    })
    .filter(Boolean);
};

export const MarketChatAssistant: React.FC<MarketChatAssistantProps> = ({
  onClose,
  defaultMinimized = false
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Welcome! I'm your Market Research Assistant. I can help you:\n\n📊 Search and analyze prediction markets\n📰 Get the latest news affecting markets\n🐋 Track whale activity and smart money\n💬 Analyze KOL sentiment\n\nWhat would you like to know?",
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    "Top Opportunities",
    "Breaking News",
    "Whale Alerts"
  ]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMinimized]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data, error } = await supabase.functions.invoke('ai-market-chat', {
        body: {
          message: content,
          conversationHistory
        }
      });

      if (error) throw error;

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || "I couldn't process that request. Please try again.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
      
      if (data.suggestedQuestions) {
        setSuggestedQuestions(data.suggestedQuestions);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleQuickAction = (action: string) => {
    const actionMap: Record<string, string> = {
      "Top Opportunities": "Show me the top trading opportunities right now",
      "Breaking News": "What's the latest breaking news affecting prediction markets?",
      "Whale Alerts": "What are the whales doing in the major markets?",
      "Calculate Size": "Help me calculate position size",
    };
    sendMessage(actionMap[action] || action);
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          <Sparkles className="w-6 h-6" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      className="fixed bottom-4 right-4 z-50 w-[420px] max-w-[calc(100vw-2rem)]"
    >
      <Card className="flex flex-col h-[600px] max-h-[calc(100vh-2rem)] shadow-2xl border-border/50 bg-background/95 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex items-center gap-2">
            <BotAvatar />
            <div>
              <h3 className="font-semibold text-sm">Market Research Assistant</h3>
              <p className="text-xs text-muted-foreground">AI-powered analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
            {onClose && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="py-4 space-y-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && <BotAvatar />}
                  <div className={cn(
                    "max-w-[85%]",
                    message.role === 'user' && 'flex flex-col items-end'
                  )}>
                    <div
                      className={cn(
                        "px-4 py-3 shadow-sm",
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm'
                          : 'bg-muted/50 border border-border/50 rounded-2xl rounded-tl-sm'
                      )}
                    >
                      {message.role === 'user' ? (
                        <p className="text-sm">{message.content}</p>
                      ) : (
                        <div className="space-y-1">
                          {formatMessage(message.content)}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <BotAvatar />
                <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-tl-sm">
                  <TypingIndicator />
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Actions */}
        <div className="px-4 py-2 border-t border-border/50 flex gap-2 flex-wrap">
          {suggestedQuestions.map((question, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 transition-colors text-xs"
              onClick={() => handleQuickAction(question)}
            >
              {question}
            </Badge>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border/50">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about markets, news, whales..."
              disabled={isLoading}
              className="flex-1 bg-muted/30"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={isLoading || !inputValue.trim()}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
};
