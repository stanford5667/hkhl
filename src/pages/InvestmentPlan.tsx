/**
 * Investment Plan Page - Fortune 500 Style Strategy Explorer
 * 
 * Premium design with glassmorphism, animated elements, and intuitive UX
 * Features:
 * - Hero section with orbiting archetypes
 * - Premium plan cards
 * - Interactive learn section
 * - AI-generated investment strategies
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  FileText,
  Sparkles,
  Brain,
  BookOpen,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { AuthGateDialog } from '@/components/auth/AuthGateDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AcknowledgmentDialog, EducationalBadge, InlineDisclaimer } from '@/components/legal';
import { useEducationalAcknowledgment } from '@/hooks/useEducationalAcknowledgment';
import { PageHeader, PAGE_ICON_PRESETS } from '@/components/layout/PageHeader';

// Fortune 500 style components
import { StrategyExplorerHero } from '@/components/investment-plan/StrategyExplorerHero';
import { InvestorTypeShowcase } from '@/components/investment-plan/InvestorTypeShowcase';
import { PlanCard } from '@/components/investment-plan/PlanCard';
import { CreatePlanCard } from '@/components/investment-plan/CreatePlanCard';
import { LearnSection } from '@/components/investment-plan/LearnSection';

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
      
      // Sanitize HTML to prevent XSS attacks
      const sanitizedHtml = DOMPurify.sanitize(text, {
        ALLOWED_TAGS: ['strong', 'em', 'code', 'span'],
        ALLOWED_ATTR: ['class']
      });
      
      return <span dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
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

// Import the questionnaire component - V2 streamlined version
import { EliteQuestionnaireV2 } from '@/components/investment-plan/EliteQuestionnaireV2';
import { ComprehensiveInvestmentResults } from '@/components/investment-plan/ComprehensiveInvestmentPlan';
import { scoreQuestionnaire } from '@/services/questionnaireScoring';

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
  const { requireAuth, showAuthDialog, closeAuthDialog, consumePendingAction } = useRequireAuth();
  const { showDialog: showEducationalAcknowledgment, acknowledge } = useEducationalAcknowledgment();
  const [activeTab, setActiveTab] = useState('plans');
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [viewPlanOpen, setViewPlanOpen] = useState(false);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [forceNewAssessment, setForceNewAssessment] = useState(false);
  const [pendingResult, setPendingResult] = useState<{
    responses: Record<string, any>;
    riskScore: number;
    riskProfile: string;
    investorType: string;
    investorTypeName: string;
    userName: string;
  } | null>(null);

  // Check for pending action after auth (e.g., user just signed up to take assessment)
  useEffect(() => {
    if (user) {
      const pendingAction = consumePendingAction();
      if (pendingAction === 'start-assessment') {
        // User just authenticated, auto-start the assessment
        setForceNewAssessment(true);
        setShowQuestionnaire(true);
      }
    }
  }, [user, consumePendingAction]);

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

  const saveQuestionnaireResult = async (result: {
    responses: Record<string, any>;
    riskScore: number;
    riskProfile: string;
    investorType: string;
    investorTypeName: string;
    userName: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('investment_plans')
        .insert({
          user_id: user!.id,
          name: `${result.userName || 'My'}'s Investment Plan`,
          responses: result.responses,
          risk_score: result.riskScore,
          risk_profile: result.riskProfile,
          investor_type: result.investorType,
          investor_type_name: result.investorTypeName,
          plan_content: '', // AI-generated strategy will be created by ComprehensiveInvestmentResults
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
      setPendingResult(null);
      toast.success('Investment plan saved!');
    } catch (err) {
      console.error('Error saving plan:', err);
      toast.error('Failed to save plan');
    }
  };

  const handleQuestionnaireComplete = async (result: {
    responses: Record<string, any>;
    riskScore: number;
    riskProfile: string;
    investorType: string;
    investorTypeName: string;
    userName: string;
  }) => {
    if (!user) {
      // Store the result and prompt for auth
      setPendingResult(result);
      requireAuth(() => {
        // This callback will be executed after successful auth
        // We need to save from the effect below
      });
      return;
    }

    await saveQuestionnaireResult(result);
  };

  // Save pending result after auth
  useEffect(() => {
    if (user && pendingResult) {
      saveQuestionnaireResult(pendingResult);
    }
  }, [user, pendingResult]);

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

  // Show questionnaire fullscreen - high z-index to cover everything including mobile nav
  if (showQuestionnaire) {
    return (
      <div className="fixed inset-0 bg-background" style={{ zIndex: 9999 }}>
        <EliteQuestionnaireV2
          onComplete={handleQuestionnaireComplete}
          onCancel={() => {
            setShowQuestionnaire(false);
            setForceNewAssessment(false);
          }}
          userName={user?.user_metadata?.name || user?.user_metadata?.full_name || undefined}
        />
      </div>
    );
  }

  return (
    <>
      <AcknowledgmentDialog open={showEducationalAcknowledgment} onAccept={acknowledge} feature="the Strategy Explorer" />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        {/* Premium Header */}
        <div className="flex items-center justify-between">
          <PageHeader
            icon={Brain}
            title="Strategy Explorer"
            subtitle="AI-powered portfolio strategies tailored to your investor profile"
            {...PAGE_ICON_PRESETS.violet}
          />
          <div className="hidden sm:flex items-center gap-3">
            <EducationalBadge />
          </div>
        </div>
        
        <InlineDisclaimer />

        {/* Main Content with Premium Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl">
            <TabsTrigger 
              value="plans" 
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:to-blue-500/20 data-[state=active]:border-white/20 rounded-lg px-6"
            >
              <FileText className="h-4 w-4" />
              My Strategies
            </TabsTrigger>
            <TabsTrigger 
              value="archetypes" 
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:to-blue-500/20 data-[state=active]:border-white/20 rounded-lg px-6"
            >
              <Layers className="h-4 w-4" />
              Archetypes
            </TabsTrigger>
            <TabsTrigger 
              value="learn" 
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:to-blue-500/20 data-[state=active]:border-white/20 rounded-lg px-6"
            >
              <BookOpen className="h-4 w-4" />
              Academy
            </TabsTrigger>
          </TabsList>

          {/* My Strategies Tab */}
          <TabsContent value="plans" className="mt-0 space-y-8">
            {/* Hero Section - Show when no plans */}
            {!isLoading && plans.length === 0 && (
              <StrategyExplorerHero 
                onStartAssessment={() => {
                  setForceNewAssessment(true);
                  setShowQuestionnaire(true);
                }}
              />
            )}

            {/* Plans Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-72 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
                ))}
              </div>
            ) : plans.length > 0 ? (
              <div className="space-y-6">
                {/* Section Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Your Investment Strategies</h2>
                    <p className="text-muted-foreground">AI-generated plans tailored to your profile</p>
                  </div>
                  <Button 
                    onClick={() => {
                      setForceNewAssessment(true);
                      setShowQuestionnaire(true);
                    }}
                    className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/25"
                  >
                    <Sparkles className="h-4 w-4" />
                    New Strategy
                  </Button>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {plans.map((plan, index) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      index={index}
                      onView={() => {
                        setSelectedPlan(plan);
                        setViewPlanOpen(true);
                      }}
                      onDownload={() => downloadPlan(plan)}
                      onDelete={() => setDeletePlanId(plan.id)}
                    />
                  ))}
                  
                  {/* Create New Plan Card */}
                  <CreatePlanCard 
                    onClick={() => {
                      setForceNewAssessment(true);
                      setShowQuestionnaire(true);
                    }}
                  />
                </div>
              </div>
            ) : null}
          </TabsContent>

          {/* Archetypes Tab */}
          <TabsContent value="archetypes" className="mt-0">
            <InvestorTypeShowcase />
          </TabsContent>

          {/* Learn Tab */}
          <TabsContent value="learn" className="mt-0">
            <LearnSection />
          </TabsContent>
        </Tabs>

      {/* View Plan - Full Screen Results Component */}
      {viewPlanOpen && selectedPlan && (
        <div className="fixed inset-0 z-[9999] bg-background overflow-y-auto overflow-x-hidden">
          <div className="relative min-h-full">
            {/* Back button - positioned inside the scrollable container */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setViewPlanOpen(false);
                setSelectedPlan(null);
              }}
              className="fixed top-4 left-4 z-[10000] bg-background/80 backdrop-blur-sm border border-border hover:bg-secondary"
            >
              ← Back to Plans
            </Button>
            <ComprehensiveInvestmentResults
              responses={selectedPlan.responses || {}}
              rawPolicy={selectedPlan.plan_content || ''}
              userName={selectedPlan.name.replace("'s Investment Plan", '')}
              riskScore={selectedPlan.risk_score || 50}
              planId={selectedPlan.id}
              onExport={() => downloadPlan(selectedPlan)}
              onStartNew={() => {
                setViewPlanOpen(false);
                setSelectedPlan(null);
                setShowQuestionnaire(true);
              }}
              onSignOut={() => setViewPlanOpen(false)}
            />
          </div>
        </div>
      )}

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
      
      {/* Auth gate dialog for save actions */}
      <AuthGateDialog 
        open={showAuthDialog} 
        onOpenChange={closeAuthDialog}
        title="Sign in to Save Your Plan"
        description="Create a free account to save your investment plan and access it from anywhere."
      />
      </div>
    </>
  );
}
