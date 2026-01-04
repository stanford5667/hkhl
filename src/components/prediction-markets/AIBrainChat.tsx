import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Brain, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const TypingIndicator = () => (
  <div className="flex items-center gap-1 p-3">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="w-2 h-2 bg-violet-500/50 rounded-full"
        animate={{ y: [0, -6, 0] }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          delay: i * 0.15,
          ease: "easeInOut",
        }}
      />
    ))}
  </div>
);

const formatMessage = (content: string) => {
  return content.split("\n").map((line, i) => {
    if (
      line.startsWith("📊") ||
      line.startsWith("📰") ||
      line.startsWith("🐋") ||
      line.startsWith("💬") ||
      line.startsWith("💡") ||
      line.startsWith("⚠️") ||
      line.startsWith("🎯") ||
      line.startsWith("📈")
    ) {
      return (
        <p key={i} className="font-medium mt-3 first:mt-0">
          {line}
        </p>
      );
    }
    if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
      return (
        <p key={i} className="pl-4 text-sm">
          {line}
        </p>
      );
    }
    if (/^\d+\./.test(line.trim())) {
      return (
        <p key={i} className="pl-2 text-sm mt-1">
          {line}
        </p>
      );
    }
    if (line.trim()) {
      return (
        <p key={i} className="text-sm mt-1 first:mt-0">
          {line}
        </p>
      );
    }
    return null;
  }).filter(Boolean);
};

export function AIBrainChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Welcome to the AI Brain! I'm your unified intelligence assistant.\n\n🎯 I can help you with:\n• Analyzing prediction markets\n• Generating trade ideas\n• Calculating position sizes (Kelly, EV)\n• Finding arbitrage opportunities\n• Summarizing market news\n\nWhat would you like to explore?",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickActions = [
    "Show trade ideas",
    "Find opportunities",
    "Analyze top markets",
    "Calculate Kelly size",
  ];

  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-brain", {
        body: {
          type: "chat",
          userId: user?.id || "anonymous",
          payload: { message: content },
        },
      });

      if (error) throw error;

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data?.response || "I couldn't process that request. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const clearChat = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: "Chat cleared. How can I help you?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Brain Assistant</CardTitle>
              <CardDescription>
                Unified intelligence for prediction markets
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={clearChat}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
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
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%]",
                      message.role === "user" && "flex flex-col items-end"
                    )}
                  >
                    <div
                      className={cn(
                        "px-4 py-3 shadow-sm",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                          : "bg-muted/50 border border-border/50 rounded-2xl rounded-tl-sm"
                      )}
                    >
                      {message.role === "user" ? (
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-tl-sm">
                  <TypingIndicator />
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Actions */}
        <div className="px-4 py-2 border-t border-border/50 flex gap-2 flex-wrap">
          {quickActions.map((action, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 transition-colors text-xs"
              onClick={() => sendMessage(action)}
            >
              {action}
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
              placeholder="Ask about markets, strategies, calculations..."
              disabled={isLoading}
              className="flex-1 bg-muted/30"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !inputValue.trim()}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
