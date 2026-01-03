import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, BookOpen, CheckCircle2, ArrowLeft, RotateCcw, ChevronUp, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { InvestorPolicyStatement } from '@/types/investorPolicy';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  educationalInsert?: { term: string; explanation: string };
  suggestedResponses?: string[];
}

interface AIPortfolioChatProps {
  onComplete: (profile: InvestorPolicyStatement) => void;
  onBack: () => void;
}

const TypingIndicator = () => (
  <div className="flex items-center gap-1 p-3">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="w-2 h-2 bg-muted-foreground/50 rounded-full"
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
  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
    <Sparkles className="w-4 h-4 text-white" />
  </div>
);

const ProfileField = ({ 
  label, 
  value, 
  isNew 
}: { 
  label: string; 
  value: string | undefined; 
  isNew?: boolean;
}) => (
  <motion.div 
    className={cn(
      "flex items-center justify-between py-2 px-3 rounded-lg transition-colors",
      isNew && "bg-emerald-500/10"
    )}
    animate={isNew ? { backgroundColor: ['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0)'] } : {}}
    transition={{ duration: 1.5 }}
  >
    <span className="text-sm text-muted-foreground">{label}</span>
    {value ? (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{value}</span>
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      </div>
    ) : (
      <span className="text-xs text-muted-foreground/50 italic">Not yet discussed</span>
    )}
  </motion.div>
);

const LiveProfilePanel = ({ 
  profile, 
  completionPercentage,
  recentlyUpdated
}: { 
  profile: Partial<InvestorPolicyStatement>;
  completionPercentage: number;
  recentlyUpdated: string[];
}) => {
  const goals = profile.goals?.[0];
  const risk = profile.riskProfile;
  
  return (
    <Card className="h-full bg-card/80 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Your Profile</CardTitle>
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-muted/30"
              />
              <motion.circle
                cx="24"
                cy="24"
                r="20"
                stroke="url(#progressGradient)"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                initial={{ strokeDasharray: "0 126" }}
                animate={{ strokeDasharray: `${completionPercentage * 1.26} 126` }}
                transition={{ duration: 0.5 }}
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
              {Math.round(completionPercentage)}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Goals</h4>
          <div className="space-y-1">
            <ProfileField 
              label="Primary Goal" 
              value={goals?.name}
              isNew={recentlyUpdated.includes('goalName')}
            />
            <ProfileField 
              label="Target Amount" 
              value={goals?.targetAmount ? `$${goals.targetAmount.toLocaleString()}` : undefined}
              isNew={recentlyUpdated.includes('targetAmount')}
            />
            <ProfileField 
              label="Time Horizon" 
              value={goals?.targetDate ? `${new Date(goals.targetDate).getFullYear()}` : undefined}
              isNew={recentlyUpdated.includes('targetDate')}
            />
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Risk Profile</h4>
          <div className="space-y-1">
            <ProfileField 
              label="Emotional Tolerance" 
              value={risk?.emotionalTolerance ? `${risk.emotionalTolerance}/100` : undefined}
              isNew={recentlyUpdated.includes('emotionalTolerance')}
            />
            <ProfileField 
              label="Experience" 
              value={risk?.experienceLevel}
              isNew={recentlyUpdated.includes('experienceLevel')}
            />
            <ProfileField 
              label="Financial Capacity" 
              value={risk?.financialCapacity ? `${risk.financialCapacity}/100` : undefined}
              isNew={recentlyUpdated.includes('financialCapacity')}
            />
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Constraints</h4>
          <div className="space-y-1">
            <ProfileField 
              label="Emergency Fund" 
              value={profile.liquidityNeeds?.emergencyFundMonths 
                ? `${profile.liquidityNeeds.emergencyFundMonths} months` 
                : undefined}
              isNew={recentlyUpdated.includes('emergencyFund')}
            />
            <ProfileField 
              label="Tax Bracket" 
              value={profile.constraints?.taxConsiderations?.bracket}
              isNew={recentlyUpdated.includes('tax')}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const AIPortfolioChat: React.FC<AIPortfolioChatProps> = ({
  onComplete,
  onBack
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI portfolio advisor. I'll help you build a personalized investment strategy through a friendly conversation. Let's start with the basics — what's your primary investment goal? Are you saving for retirement, building wealth, or something specific like a home purchase?",
      timestamp: new Date(),
      suggestedResponses: [
        "Retirement savings",
        "Building long-term wealth",
        "Saving for a home",
        "Education fund"
      ]
    }
  ]);
  const [profile, setProfile] = useState<Partial<InvestorPolicyStatement>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [recentlyUpdated, setRecentlyUpdated] = useState<string[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const completionPercentage = calculateCompletion(profile);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

      const { data, error } = await supabase.functions.invoke('ai-portfolio-chat', {
        body: {
          message: content,
          conversationHistory,
          currentProfile: profile,
          questionnaireProgress: {
            section: getCurrentSection(profile),
            questionId: 'chat'
          }
        }
      });

      if (error) throw error;

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        educationalInsert: data.educationalInsert,
        suggestedResponses: data.suggestedResponses
      };

      setMessages(prev => [...prev, aiResponse]);

      // Update profile with extracted data
      if (data.extractedData && Object.keys(data.extractedData).length > 0) {
        const updatedFields = getUpdatedFields(data.extractedData);
        setRecentlyUpdated(updatedFields);
        
        setProfile(prev => mergeProfile(prev, data.extractedData));
        
        // Clear recently updated after animation
        setTimeout(() => setRecentlyUpdated([]), 2000);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Let me try again — could you repeat what you said?",
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

  const handleSuggestedResponse = (response: string) => {
    sendMessage(response);
  };

  const handleStartOver = () => {
    setMessages([{
      id: '1',
      role: 'assistant',
      content: "Let's start fresh! What's your primary investment goal?",
      timestamp: new Date(),
      suggestedResponses: [
        "Retirement savings",
        "Building long-term wealth",
        "Saving for a home",
        "Education fund"
      ]
    }]);
    setProfile({});
  };

  const handleComplete = () => {
    if (completionPercentage >= 60) {
      onComplete(profile as InvestorPolicyStatement);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col bg-gradient-to-br from-purple-50/30 via-background to-blue-50/30 dark:from-purple-950/20 dark:via-background dark:to-blue-950/20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/80 backdrop-blur-sm">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <BotAvatar />
          <span className="font-semibold">Portfolio Advisor</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleStartOver} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Start Over
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 lg:w-[70%] flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="max-w-2xl mx-auto py-4 space-y-4">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "flex gap-3",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && <BotAvatar />}
                    <div className={cn(
                      "max-w-[80%] space-y-2",
                      message.role === 'user' && 'flex flex-col items-end'
                    )}>
                      <div
                        className={cn(
                          "px-4 py-3 shadow-sm",
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-2xl'
                            : 'bg-card border border-border/50 rounded-2xl rounded-tl-sm'
                        )}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                      
                      {/* Educational Insert */}
                      {message.educationalInsert && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900"
                        >
                          <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                              {message.educationalInsert.term}
                            </span>
                            <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                              {message.educationalInsert.explanation}
                            </p>
                          </div>
                        </motion.div>
                      )}
                      
                      {/* Suggested Responses */}
                      {message.role === 'assistant' && message.suggestedResponses && message.suggestedResponses.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {message.suggestedResponses.map((response, index) => (
                            <motion.button
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              onClick={() => handleSuggestedResponse(response)}
                              className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full transition-colors"
                            >
                              {response}
                            </motion.button>
                          ))}
                        </div>
                      )}
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
                  <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm">
                    <TypingIndicator />
                  </div>
                </motion.div>
              )}

              {/* Completion Card */}
              {completionPercentage >= 60 && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <Card className="bg-gradient-to-r from-primary/10 to-pink-500/10 border-primary/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">Ready to see your portfolio?</h3>
                          <p className="text-sm text-muted-foreground">
                            Based on our conversation, I have enough information to generate personalized recommendations.
                          </p>
                        </div>
                        <motion.div
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        >
                          <Button 
                            onClick={handleComplete}
                            className="bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90"
                          >
                            Generate Portfolio
                          </Button>
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-background/80 backdrop-blur-md">
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Tell me about your investment goals..."
                    className="pr-12 h-12 bg-background/50"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                </div>
                <Button 
                  type="submit" 
                  size="icon"
                  className="h-12 w-12 bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90 transition-transform hover:scale-105"
                  disabled={isLoading || !inputValue.trim()}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Desktop Profile Panel */}
        <div className="hidden lg:block w-[30%] border-l p-4 overflow-y-auto">
          <LiveProfilePanel 
            profile={profile} 
            completionPercentage={completionPercentage}
            recentlyUpdated={recentlyUpdated}
          />
        </div>

        {/* Mobile Profile Drawer */}
        <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden fixed bottom-24 right-4 gap-2 shadow-lg"
            >
              <ChevronUp className="w-4 h-4" />
              Profile ({Math.round(completionPercentage)}%)
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh]">
            <LiveProfilePanel 
              profile={profile} 
              completionPercentage={completionPercentage}
              recentlyUpdated={recentlyUpdated}
            />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

// Helper functions
function calculateCompletion(profile: Partial<InvestorPolicyStatement>): number {
  const fields = [
    profile.goals?.[0]?.name,
    profile.goals?.[0]?.targetAmount,
    profile.goals?.[0]?.targetDate,
    profile.riskProfile?.emotionalTolerance,
    profile.riskProfile?.experienceLevel,
    profile.riskProfile?.financialCapacity,
    profile.liquidityNeeds?.emergencyFundMonths,
    profile.constraints?.taxConsiderations?.bracket
  ];
  
  const filled = fields.filter(Boolean).length;
  return (filled / fields.length) * 100;
}

function getCurrentSection(profile: Partial<InvestorPolicyStatement>): string {
  if (!profile.goals?.[0]?.name) return 'goals';
  if (!profile.riskProfile?.emotionalTolerance) return 'risk';
  if (!profile.liquidityNeeds) return 'liquidity';
  return 'constraints';
}

function getUpdatedFields(extractedData: Partial<InvestorPolicyStatement>): string[] {
  const fields: string[] = [];
  if (extractedData.goals?.[0]?.name) fields.push('goalName');
  if (extractedData.goals?.[0]?.targetAmount) fields.push('targetAmount');
  if (extractedData.goals?.[0]?.targetDate) fields.push('targetDate');
  if (extractedData.riskProfile?.emotionalTolerance) fields.push('emotionalTolerance');
  if (extractedData.riskProfile?.experienceLevel) fields.push('experienceLevel');
  if (extractedData.riskProfile?.financialCapacity) fields.push('financialCapacity');
  if (extractedData.liquidityNeeds?.emergencyFundMonths) fields.push('emergencyFund');
  if (extractedData.constraints?.taxConsiderations) fields.push('tax');
  return fields;
}

function mergeProfile(
  current: Partial<InvestorPolicyStatement>, 
  extracted: Partial<InvestorPolicyStatement>
): Partial<InvestorPolicyStatement> {
  return {
    ...current,
    goals: extracted.goals || current.goals,
    riskProfile: { ...current.riskProfile, ...extracted.riskProfile },
    liquidityNeeds: { ...current.liquidityNeeds, ...extracted.liquidityNeeds },
    constraints: { ...current.constraints, ...extracted.constraints }
  };
}

export default AIPortfolioChat;
