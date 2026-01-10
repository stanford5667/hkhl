/**
 * Investment Plan Page
 * 
 * A dedicated page for creating and managing personalized investment plans
 * Features:
 * - New questionnaire flow
 * - View saved plans
 * - AI-generated investment strategies
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  FileText,
  Calendar,
  Clock,
  Target,
  Shield,
  TrendingUp,
  Download,
  Trash2,
  MoreVertical,
  Sparkles,
  Brain,
  ChevronRight,
  Eye,
  RefreshCw,
  CheckCircle2,
  PieChart,
  BarChart3,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

// Simple markdown renderer component
function SimpleMarkdown({ content }: { content: string }) {
  // Basic markdown parsing
  const parseMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let key = 0;

    const processLine = (line: string, index: number) => {
      // Headers
      if (line.startsWith('# ')) {
        return <h1 key={key++} className="text-2xl font-bold text-white mt-6 mb-4">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={key++} className="text-xl font-semibold text-white mt-6 mb-3 pb-2 border-b border-border">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={key++} className="text-lg font-medium text-white mt-4 mb-2">{line.slice(4)}</h3>;
      }
      
      // Horizontal rule
      if (line.match(/^-{3,}$/)) {
        return <hr key={key++} className="my-6 border-border" />;
      }
      
      // Table detection
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
        if (!cells.every(c => c.match(/^-+$/))) {
          tableRows.push(cells);
        }
        return null;
      } else if (inTable) {
        inTable = false;
        const table = (
          <div key={key++} className="overflow-x-auto my-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {tableRows[0]?.map((cell, i) => (
                    <th key={i} className="border border-border bg-secondary/50 px-4 py-2 text-left text-white font-medium">
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="border border-border px-4 py-2 text-muted-foreground">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        return table;
      }
      
      // Bullet points
      if (line.match(/^[-*]\s/)) {
        return (
          <li key={key++} className="text-muted-foreground ml-4 list-disc">
            {processInlineMarkdown(line.slice(2))}
          </li>
        );
      }
      
      // Numbered list
      if (line.match(/^\d+\.\s/)) {
        return (
          <li key={key++} className="text-muted-foreground ml-4 list-decimal">
            {processInlineMarkdown(line.replace(/^\d+\.\s/, ''))}
          </li>
        );
      }
      
      // Blockquote
      if (line.startsWith('>')) {
        return (
          <blockquote key={key++} className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground">
            {processInlineMarkdown(line.slice(1).trim())}
          </blockquote>
        );
      }
      
      // Italics for lines starting with *text*
      if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
        return (
          <p key={key++} className="text-muted-foreground italic mb-2">
            {line.slice(1, -1)}
          </p>
        );
      }
      
      // Empty line
      if (line.trim() === '') {
        return <div key={key++} className="h-2" />;
      }
      
      // Regular paragraph
      return (
        <p key={key++} className="text-muted-foreground leading-relaxed mb-4">
          {processInlineMarkdown(line)}
        </p>
      );
    };

    const processInlineMarkdown = (text: string) => {
      // Bold
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
      // Italic
      text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
      // Code
      text = text.replace(/`(.+?)`/g, '<code class="bg-secondary/50 px-1 py-0.5 rounded text-primary text-sm">$1</code>');
      
      return <span dangerouslySetInnerHTML={{ __html: text }} />;
    };

    lines.forEach((line, index) => {
      const element = processLine(line, index);
      if (element) elements.push(element);
    });

    // Handle any remaining table
    if (inTable && tableRows.length > 0) {
      elements.push(
        <div key={key++} className="overflow-x-auto my-4">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {tableRows[0]?.map((cell, i) => (
                  <th key={i} className="border border-border bg-secondary/50 px-4 py-2 text-left text-white font-medium">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(1).map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border border-border px-4 py-2 text-muted-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return elements;
  };

  return <div className="prose prose-invert prose-sm max-w-none">{parseMarkdown(content)}</div>;
}

// Import the questionnaire component
import { EliteQuestionnaire } from '@/components/investment-plan/EliteQuestionnaire';

interface InvestmentPlan {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  responses: Record<string, any> | null;
  risk_score: number | null;
  risk_profile: string | null;
  investor_type: string | null;
  investor_type_name: string | null;
  plan_content: string | null;
  status: string | null;
}

export default function InvestmentPlanPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('plans');
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [viewPlanOpen, setViewPlanOpen] = useState(false);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  // Fetch user's investment plans
  useEffect(() => {
    if (user) {
      fetchPlans();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchPlans = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('investment_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Cast the data to our interface type
      setPlans((data || []).map(item => ({
        ...item,
        responses: item.responses as Record<string, any> | null,
      })) as InvestmentPlan[]);
    } catch (err) {
      console.error('Error fetching plans:', err);
      toast.error('Failed to load investment plans');
    } finally {
      setIsLoading(false);
    }
  };

  const deletePlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('investment_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      
      setPlans(prev => prev.filter(p => p.id !== planId));
      toast.success('Plan deleted');
    } catch (err) {
      console.error('Error deleting plan:', err);
      toast.error('Failed to delete plan');
    }
    setDeletePlanId(null);
  };

  const handleQuestionnaireComplete = async (result: {
    responses: Record<string, any>;
    riskScore: number;
    riskProfile: string;
    investorType: string;
    investorTypeName: string;
    planContent: string;
    userName: string;
  }) => {
    if (!user) {
      toast.error('Please sign in to save your plan');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('investment_plans')
        .insert({
          user_id: user.id,
          name: `${result.userName || 'My'}'s Investment Plan`,
          responses: result.responses,
          risk_score: result.riskScore,
          risk_profile: result.riskProfile,
          investor_type: result.investorType,
          investor_type_name: result.investorTypeName,
          plan_content: result.planContent,
          status: 'complete',
        })
        .select()
        .single();

      if (error) throw error;

      const newPlan: InvestmentPlan = {
        ...data,
        responses: data.responses as Record<string, any> | null,
      };
      
      setPlans(prev => [newPlan, ...prev]);
      setShowQuestionnaire(false);
      setSelectedPlan(newPlan);
      setViewPlanOpen(true);
      toast.success('Investment plan saved!');
    } catch (err) {
      console.error('Error saving plan:', err);
      toast.error('Failed to save plan');
    }
  };

  const downloadPlan = (plan: InvestmentPlan) => {
    const content = `# ${plan.name}\n\nGenerated: ${format(new Date(plan.created_at), 'MMMM d, yyyy')}\n\nRisk Profile: ${plan.risk_profile} (Score: ${plan.risk_score}/100)\nInvestor Type: ${plan.investor_type_name}\n\n---\n\n${plan.plan_content}`;
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investment-plan-${format(new Date(plan.created_at), 'yyyy-MM-dd')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Plan downloaded');
  };

  const getRiskColor = (profile: string) => {
    switch (profile?.toLowerCase()) {
      case 'conservative': return 'text-blue-400 bg-blue-500/10';
      case 'moderate': return 'text-emerald-400 bg-emerald-500/10';
      case 'aggressive': return 'text-orange-400 bg-orange-500/10';
      case 'very aggressive': return 'text-rose-400 bg-rose-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };

  // Show questionnaire fullscreen
  if (showQuestionnaire) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <EliteQuestionnaire
          onComplete={handleQuestionnaireComplete}
          onCancel={() => setShowQuestionnaire(false)}
          userId={user?.id}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Brain className="h-7 w-7 text-primary" />
            Investment Plan
          </h1>
          <p className="text-muted-foreground mt-1">
            Personalized investment strategies powered by AI
          </p>
        </div>

        <Button 
          onClick={() => setShowQuestionnaire(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create New Plan
        </Button>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="plans" className="gap-2">
            <FileText className="h-4 w-4" />
            My Plans
          </TabsTrigger>
          <TabsTrigger value="learn" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Learn
          </TabsTrigger>
        </TabsList>

        {/* My Plans Tab */}
        <TabsContent value="plans" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="bg-secondary/30 animate-pulse">
                  <CardContent className="p-6 h-48" />
                </Card>
              ))}
            </div>
          ) : plans.length === 0 ? (
            <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Create Your First Investment Plan</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Answer a few questions about your goals, risk tolerance, and preferences. 
                  Our AI will generate a personalized investment strategy just for you.
                </p>
                <Button onClick={() => setShowQuestionnaire(true)} size="lg" className="gap-2">
                  <Brain className="h-5 w-5" />
                  Start Questionnaire
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
                    onClick={() => {
                      setSelectedPlan(plan);
                      setViewPlanOpen(true);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Target className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base line-clamp-1">{plan.name}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(plan.created_at), 'MMM d, yyyy')}
                            </CardDescription>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlan(plan);
                              setViewPlanOpen(true);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Plan
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              downloadPlan(plan);
                            }}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletePlanId(plan.id);
                              }}
                              className="text-rose-500"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {/* Risk Profile Badge */}
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-xs", getRiskColor(plan.risk_profile))}>
                            <Shield className="h-3 w-3 mr-1" />
                            {plan.risk_profile}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Score: {plan.risk_score}/100
                          </span>
                        </div>

                        {/* Investor Type */}
                        <div className="flex items-center gap-2 text-sm">
                          <Brain className="h-4 w-4 text-purple-400" />
                          <span className="text-muted-foreground">{plan.investor_type_name || 'Balanced Investor'}</span>
                        </div>

                        {/* Status */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            Complete
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {/* Add New Plan Card */}
              <Card 
                className="bg-secondary/10 border-dashed border-2 border-muted-foreground/20 hover:border-primary/50 hover:bg-secondary/20 transition-all cursor-pointer"
                onClick={() => setShowQuestionnaire(true)}
              >
                <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <p className="font-medium text-sm">Create New Plan</p>
                  <p className="text-xs text-muted-foreground mt-1">Start questionnaire</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Learn Tab */}
        <TabsContent value="learn" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
              <CardHeader>
                <div className="p-3 w-fit rounded-lg bg-blue-500/20 mb-2">
                  <Shield className="h-6 w-6 text-blue-400" />
                </div>
                <CardTitle className="text-lg">Understanding Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Learn about risk tolerance vs. risk capacity, and how they affect your investment strategy.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-400" />
                    Risk tolerance: emotional comfort
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-400" />
                    Risk capacity: financial ability
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-400" />
                    Time horizon affects both
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
              <CardHeader>
                <div className="p-3 w-fit rounded-lg bg-emerald-500/20 mb-2">
                  <PieChart className="h-6 w-6 text-emerald-400" />
                </div>
                <CardTitle className="text-lg">Asset Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  How dividing your portfolio across different asset classes reduces risk.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Stocks: Growth potential
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Bonds: Stability & income
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Alternatives: Diversification
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
              <CardHeader>
                <div className="p-3 w-fit rounded-lg bg-purple-500/20 mb-2">
                  <Brain className="h-6 w-6 text-purple-400" />
                </div>
                <CardTitle className="text-lg">Investor Personality</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Discover your investor DNA - the 16 types based on 4 key dimensions.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-400" />
                    Risk orientation: Guardian vs Pioneer
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-400" />
                    Decision style: Analytical vs Intuitive
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-400" />
                    Time preference: Patient vs Active
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
              <CardHeader>
                <div className="p-3 w-fit rounded-lg bg-amber-500/20 mb-2">
                  <TrendingUp className="h-6 w-6 text-amber-400" />
                </div>
                <CardTitle className="text-lg">Compound Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  The power of earning returns on your returns over time.
                </p>
                <div className="mt-4 p-3 rounded-lg bg-amber-500/10">
                  <p className="text-xs text-amber-300 font-medium">Example:</p>
                  <p className="text-sm text-amber-200 mt-1">
                    $10,000 at 7% annual return becomes ~$76,000 in 30 years without adding a penny.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-rose-500/10 to-transparent border-rose-500/20">
              <CardHeader>
                <div className="p-3 w-fit rounded-lg bg-rose-500/20 mb-2">
                  <BarChart3 className="h-6 w-6 text-rose-400" />
                </div>
                <CardTitle className="text-lg">Market Volatility</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Why short-term fluctuations matter less than long-term trends.
                </p>
                <div className="mt-4 p-3 rounded-lg bg-rose-500/10">
                  <p className="text-xs text-rose-300 font-medium">Did you know?</p>
                  <p className="text-sm text-rose-200 mt-1">
                    Missing just the 10 best trading days over 20 years can cut your returns in half.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-500/10 to-transparent border-cyan-500/20">
              <CardHeader>
                <div className="p-3 w-fit rounded-lg bg-cyan-500/20 mb-2">
                  <Target className="h-6 w-6 text-cyan-400" />
                </div>
                <CardTitle className="text-lg">Goal-Based Investing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Aligning your portfolio strategy with specific financial objectives.
                </p>
                <div className="mt-4 p-3 rounded-lg bg-cyan-500/10">
                  <p className="text-xs text-cyan-300 font-medium">Research shows:</p>
                  <p className="text-sm text-cyan-200 mt-1">
                    Investors with clear goals are 3x more likely to stay invested during downturns.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* View Plan Dialog */}
      <Dialog open={viewPlanOpen} onOpenChange={setViewPlanOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          {selectedPlan && (
            <>
              <DialogHeader className="p-6 pb-4 border-b border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-xl">{selectedPlan.name}</DialogTitle>
                    <DialogDescription className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(selectedPlan.created_at), 'MMMM d, yyyy')}
                      </span>
                      <Badge className={cn("text-xs", getRiskColor(selectedPlan.risk_profile))}>
                        {selectedPlan.risk_profile}
                      </Badge>
                      <span className="text-xs">
                        Score: {selectedPlan.risk_score}/100
                      </span>
                    </DialogDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => downloadPlan(selectedPlan)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </DialogHeader>
              <ScrollArea className="h-[60vh]">
                <div className="p-6">
                  <SimpleMarkdown content={selectedPlan.plan_content} />
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePlanId} onOpenChange={() => setDeletePlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Investment Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The plan will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePlanId && deletePlan(deletePlanId)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
