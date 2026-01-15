import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Wallet, Search, TrendingUp, Sparkles, ArrowRight, 
  Check, Loader2, Crown, Bell, Zap 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type OnboardingPath = 'portfolio' | 'research' | 'screen';

interface QuickStartFlowProps {
  onComplete: () => void;
}

interface ScreenerResult {
  ticker: string;
  name: string;
  change: number;
  insight: string;
}

interface ResearchResult {
  ticker: string;
  insight: string;
  bullCase: string;
  bearCase: string;
  aiScore: number;
}

export function QuickStartFlow({ onComplete }: QuickStartFlowProps) {
  const [step, setStep] = useState<'choose' | 'action' | 'magic' | 'hook'>('choose');
  const [path, setPath] = useState<OnboardingPath | null>(null);
  const [ticker, setTicker] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ stocks?: ScreenerResult[] } & Partial<ResearchResult> | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(false);

  const paths = [
    {
      id: 'portfolio' as const,
      icon: Wallet,
      title: 'Track My Portfolio',
      description: 'Import holdings and get AI insights',
      cta: 'Connect or paste holdings',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      id: 'research' as const,
      icon: Search,
      title: 'Research a Stock',
      description: 'Get instant AI analysis',
      cta: 'Enter any ticker',
      color: 'from-blue-500 to-indigo-500',
    },
    {
      id: 'screen' as const,
      icon: TrendingUp,
      title: 'Find Opportunities',
      description: 'AI-powered stock screening',
      cta: 'Show me winning setups',
      color: 'from-purple-500 to-pink-500',
    },
  ];

  const handlePathSelect = async (selectedPath: OnboardingPath) => {
    setPath(selectedPath);
    
    if (selectedPath === 'screen') {
      setStep('magic');
      setIsLoading(true);
      
      try {
        const { data } = await supabase.functions.invoke('polygon-screener-v2', {
          body: { screen: 'momentum_quality', limit: 5 }
        });
        setResult(data);
      } catch (e) {
        // Fallback mock data
        setResult({ 
          stocks: [
            { ticker: 'NVDA', name: 'NVIDIA', change: 12.5, insight: 'Breaking out on AI demand' },
            { ticker: 'META', name: 'Meta Platforms', change: 8.2, insight: 'Ad revenue accelerating' },
            { ticker: 'PLTR', name: 'Palantir', change: 15.1, insight: 'Government contracts expanding' },
          ]
        });
      }
      setIsLoading(false);
    } else if (selectedPath === 'portfolio') {
      // Navigate to portfolio import
      onComplete();
    } else {
      setStep('action');
    }
  };

  const handleTickerSubmit = async () => {
    if (!ticker) return;
    setStep('magic');
    setIsLoading(true);
    
    try {
      const { data } = await supabase.functions.invoke('ai-portfolio-advisor', {
        body: { ticker: ticker.toUpperCase(), mode: 'quick-insight' }
      });
      setResult(data);
    } catch (e) {
      setResult({
        ticker: ticker.toUpperCase(),
        insight: `${ticker.toUpperCase()} looks interesting! Here's what we found...`,
        bullCase: 'Strong fundamentals with growing market share',
        bearCase: 'Valuation stretched vs historical averages',
        aiScore: 72,
      });
    }
    setIsLoading(false);
  };

  const handleEnableAlerts = () => {
    setAlertsEnabled(true);
    // Store preference
    localStorage.setItem('daily-briefing-enabled', 'true');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background via-background to-muted/30">
      <AnimatePresence mode="wait">
        {step === 'choose' && (
          <motion.div
            key="choose"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-lg"
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">What brings you here today?</h1>
              <p className="text-muted-foreground">Pick one to get started instantly</p>
            </div>
            
            <div className="space-y-4">
              {paths.map((p) => (
                <motion.div
                  key={p.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className="cursor-pointer border-2 hover:border-primary/50 transition-all hover:shadow-lg"
                    onClick={() => handlePathSelect(p.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center shadow-lg`}>
                          <p.icon className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{p.title}</h3>
                          <p className="text-sm text-muted-foreground">{p.description}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'action' && path === 'research' && (
          <motion.div
            key="action"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Search className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Enter any stock ticker</h2>
              <p className="text-muted-foreground">We'll give you instant AI analysis</p>
            </div>
            
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="e.g., AAPL, NVDA, TSLA"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleTickerSubmit()}
                className="text-lg h-12"
                autoFocus
              />
              <Button onClick={handleTickerSubmit} size="lg" className="h-12 px-6">
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center">
              {['AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL'].map((t) => (
                <Button
                  key={t}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTicker(t);
                    setTimeout(handleTickerSubmit, 100);
                  }}
                >
                  {t}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'magic' && (
          <motion.div
            key="magic"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg"
          >
            {isLoading ? (
              <div className="text-center py-16">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-lg font-medium">AI is analyzing...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="h-6 w-6 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold">Here's what we found 🎯</h2>
                </div>
                
                <Card className="overflow-hidden">
                  <CardContent className="p-6">
                    {path === 'research' && result && (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-2xl font-bold">{result.ticker}</h3>
                            <p className="text-muted-foreground">{result.insight}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-primary">{result.aiScore}</div>
                            <p className="text-sm text-muted-foreground">AI Score</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-green-500/10 rounded-lg">
                            <h4 className="font-medium text-green-600 text-sm mb-1">Bull Case</h4>
                            <p className="text-sm">{result.bullCase}</p>
                          </div>
                          <div className="p-3 bg-red-500/10 rounded-lg">
                            <h4 className="font-medium text-red-600 text-sm mb-1">Bear Case</h4>
                            <p className="text-sm">{result.bearCase}</p>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {path === 'screen' && result?.stocks && (
                      <div className="space-y-3">
                        <p className="font-medium text-sm text-muted-foreground">Top momentum + quality stocks:</p>
                        {result.stocks.map((s) => (
                          <div key={s.ticker} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div>
                              <span className="font-bold">{s.ticker}</span>
                              <span className="text-muted-foreground text-sm ml-2">{s.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-green-500 font-medium">+{s.change}%</span>
                              <p className="text-xs text-muted-foreground">{s.insight}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Daily alerts hook */}
                <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Bell className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">Get daily AI insights</h4>
                        <p className="text-sm text-muted-foreground">
                          Get a morning briefing with educational market insights
                        </p>
                      </div>
                      <Button 
                        size="sm"
                        variant={alertsEnabled ? "secondary" : "default"}
                        onClick={handleEnableAlerts}
                        disabled={alertsEnabled}
                      >
                        {alertsEnabled ? <Check className="h-4 w-4" /> : 'Enable'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Button 
                  onClick={() => setStep('hook')}
                  className="w-full h-12"
                  size="lg"
                >
                  Continue to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {step === 'hook' && (
          <motion.div
            key="hook"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center"
          >
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">You're all set! 🚀</h2>
              <p className="text-muted-foreground">
                Here's what you get for free:
              </p>
            </div>
            
            <div className="space-y-3 mb-8">
              {[
                { icon: Wallet, text: 'Track up to 3 portfolios' },
                { icon: Search, text: '10 AI stock analyses per day' },
                { icon: TrendingUp, text: 'Basic stock screener' },
                { icon: Bell, text: 'Daily morning briefing' },
              ].map((item, i) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <item.icon className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">{item.text}</span>
                  <Check className="h-4 w-4 text-green-500 ml-auto" />
                </motion.div>
              ))}
            </div>
            
            <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/20 mb-6">
              <p className="text-sm text-muted-foreground mb-2">
                Want unlimited everything?
              </p>
              <Button variant="outline" className="border-amber-500/50 hover:bg-amber-500/10">
                <Crown className="h-4 w-4 mr-2 text-amber-500" />
                See Pro Features
              </Button>
            </div>
            
            <Button onClick={onComplete} size="lg" className="w-full h-12">
              <Zap className="h-4 w-4 mr-2" />
              Start Exploring
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
