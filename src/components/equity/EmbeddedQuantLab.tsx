/**
 * EmbeddedQuantLab - Full Quant Lab experience embedded in Company Details page
 * Pre-configured with the company's ticker symbol
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FlaskConical, Search, Play, Bookmark,
  Layers, Loader2, CheckCircle2, X, ChevronLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUsage } from '@/contexts/UsageContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { StudyResultCard } from '@/components/quant-lab/StudyResultCard';
import { StudySetupCard } from '@/components/quant-lab/StudySetupCard';
import { SavedStudiesPanel } from '@/components/quant-lab/SavedStudiesPanel';
import { LearningProvider, useLearning } from '@/components/quant-lab/LearningContext';
import { MetricDetailModal } from '@/components/quant-lab/MetricDetailModal';
import { MobileAuthSheet } from '@/components/auth/MobileAuthSheet';
import { StudyRunningOverlay } from '@/components/quant-lab/StudyRunningOverlay';
import { FundamentalStudiesContent } from '@/components/quant-lab/FundamentalStudiesContent';
import { CollapsibleStudyCategories } from '@/components/quant-lab/CollapsibleStudyCategories';
import { 
  STUDY_DEFINITIONS, 
  STUDY_CATEGORIES, 
  PERIOD_OPTIONS,
  type StudyDefinition 
} from '@/components/quant-lab/studyDefinitions';

interface EmbeddedQuantLabProps {
  ticker: string;
  companyName: string;
}

export function EmbeddedQuantLab({ ticker: initialTicker, companyName }: EmbeddedQuantLabProps) {
  return (
    <LearningProvider>
      <EmbeddedQuantLabContent 
        initialTicker={initialTicker} 
        companyName={companyName} 
      />
    </LearningProvider>
  );
}

function EmbeddedQuantLabContent({ 
  initialTicker, 
  companyName 
}: { 
  initialTicker: string; 
  companyName: string;
}) {
  const { user } = useAuth();
  const { isPro, canUse, trackUsage, showUpgradeModal, usage } = useUsage();
  const { markStudyCompleted, checkAndUnlockAchievements, addXp } = useLearning();
  const navigate = useNavigate();

  // State
  const [ticker, setTicker] = useState(initialTicker);
  const [selectedTicker, setSelectedTicker] = useState(initialTicker);
  const [period, setPeriod] = useState('3y');
  const [selectedStudies, setSelectedStudies] = useState<string[]>([]);
  const [studyParams, setStudyParams] = useState<Record<string, Record<string, any>>>({});
  const [results, setResults] = useState<Record<string, any>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [runningStudy, setRunningStudy] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [showFundamentalStudies, setShowFundamentalStudies] = useState(false);
  const [showSavedStudies, setShowSavedStudies] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [showStudyPanel, setShowStudyPanel] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<{
    key: string;
    value: any;
    studyName: string;
    studyResult: any;
  } | null>(null);

  // Refs for scroll
  const leftPanelScrollRef = useRef<HTMLDivElement>(null);
  const resultsScrollRef = useRef<HTMLDivElement>(null);

  // Update ticker when prop changes
  useEffect(() => {
    setTicker(initialTicker);
    setSelectedTicker(initialTicker);
  }, [initialTicker]);

  // Initialize params with defaults
  const initStudyParams = useCallback((studyId: string) => {
    const study = STUDY_DEFINITIONS.find(s => s.id === studyId);
    if (!study) return;
    
    const defaults: Record<string, any> = {};
    study.params.forEach(p => {
      defaults[p.key] = p.default;
    });
    
    setStudyParams(prev => ({
      ...prev,
      [studyId]: defaults
    }));
  }, []);

  // Add a study
  const addStudy = useCallback((studyId: string) => {
    setSelectedStudies([studyId]);
    setResults({});
    setShowFundamentalStudies(false);
    initStudyParams(studyId);
  }, [initStudyParams]);

  // Remove a study
  const removeStudy = useCallback((studyId: string) => {
    setSelectedStudies(prev => prev.filter(s => s !== studyId));
    setResults(prev => {
      const next = { ...prev };
      delete next[studyId];
      return next;
    });
  }, []);

  // Update a parameter
  const updateParam = useCallback((studyId: string, key: string, value: any) => {
    setStudyParams(prev => ({
      ...prev,
      [studyId]: {
        ...(prev[studyId] || {}),
        [key]: value
      }
    }));
  }, []);

  // Set ticker
  const handleSetTicker = useCallback((t: string) => {
    const normalized = t.toUpperCase().trim();
    if (normalized) {
      setSelectedTicker(normalized);
      setResults({});
    }
  }, []);

  // Run a single study
  const runStudy = useCallback(async (studyId: string, tickerOverride?: string, paramsOverride?: Record<string, any>) => {
    const tickerToUse = (tickerOverride ?? selectedTicker)?.toUpperCase().trim();
    if (!tickerToUse) {
      toast.error('Please enter a ticker symbol');
      return;
    }

    const study = STUDY_DEFINITIONS.find(s => s.id === studyId);
    if (!study) {
      toast.error('Study not found');
      return;
    }

    // Check free tier usage
    if (!isPro) {
      if (!canUse('quantStudies')) {
        showUpgradeModal('quantStudies');
        toast.error('Daily free study limit reached');
        return;
      }
    }

    setRunningStudy(studyId);
    
    try {
      if (!isPro && user) {
        await trackUsage('quantStudies');
      }

      const periodData = PERIOD_OPTIONS.find(p => p.value === period);
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (periodData?.days || 756));

      const rawParams = paramsOverride ?? studyParams[studyId] ?? {};
      const formattedParams: Record<string, any> = { ...rawParams };
      
      if (formattedParams.forwardDays !== undefined) {
        const fd = parseInt(String(formattedParams.forwardDays), 10);
        const allPeriods = [1, 3, 5, 10, 21, 63, 126, 252];
        const filteredPeriods = allPeriods.filter(p => p <= fd || p === 1 || p === fd);
        if (fd && !filteredPeriods.includes(fd)) {
          filteredPeriods.push(fd);
        }
        formattedParams.forwardDays = [...new Set(filteredPeriods)].sort((a: number, b: number) => a - b);
      }
      
      if (formattedParams.threshold !== undefined) {
        formattedParams.threshold = parseFloat(String(formattedParams.threshold));
      }

      const { data, error } = await supabase.functions.invoke('run-asset-study', {
        body: {
          ticker: tickerToUse,
          studyType: studyId,
          startDate: startDate.toISOString().split('T')[0],
          endDate,
          params: formattedParams
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setResults(prev => ({
        ...prev,
        [studyId]: {
          ...data.result,
          barsAnalyzed: data.barsAnalyzed,
          dateRange: data.dateRange,
          movementProbabilities: data.movementProbabilities,
        }
      }));

      toast.success(`${study.name} completed`);
    } catch (error: any) {
      console.error('Study error:', error);
      toast.error(error.message || 'Failed to run study');
    } finally {
      setRunningStudy(null);
    }
  }, [selectedTicker, period, studyParams, isPro, canUse, trackUsage, showUpgradeModal, user]);

  // Enhanced run study with learning tracking
  const handleRunStudy = async (studyId: string, tickerOverride?: string, paramsOverride?: Record<string, any>) => {
    await runStudy(studyId, tickerOverride, paramsOverride);
    markStudyCompleted(studyId);
    checkAndUnlockAchievements({ studyId });
    addXp(15);
  };

  // Save study result
  const saveStudyResult = useCallback(async (studyId: string) => {
    if (!user) {
      toast.info('Create a free account to save study results');
      return;
    }

    const result = results[studyId];
    const study = STUDY_DEFINITIONS.find(s => s.id === studyId);
    if (!result || !study) {
      toast.error('No results to save');
      return;
    }

    setIsSaving(studyId);
    try {
      const { error } = await supabase.from('saved_studies').insert({
        user_id: user.id,
        ticker: selectedTicker,
        study_type: studyId,
        study_name: study.name,
        period,
        params: studyParams[studyId] || {},
        result,
        bars_analyzed: result.barsAnalyzed,
        date_range: result.dateRange
      });

      if (error) throw error;
      toast.success('Study saved to your library!');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save study');
    } finally {
      setIsSaving(null);
    }
  }, [user, results, selectedTicker, period, studyParams]);

  // Get study definition
  const getStudy = (id: string) => STUDY_DEFINITIONS.find(s => s.id === id);

  return (
    <div className="min-h-[600px] flex flex-col bg-background rounded-lg border">
      {/* Study Running Overlay */}
      <StudyRunningOverlay 
        isRunning={!!runningStudy}
        studyName={STUDY_DEFINITIONS.find(s => s.id === runningStudy)?.name || 'Study'}
        ticker={ticker}
        isGuest={!user}
      />
      
      {/* Header */}
      <div className="shrink-0 border-b bg-card/50 backdrop-blur-sm rounded-t-lg">
        <div className="flex flex-col md:flex-row md:items-center gap-3 px-3 md:px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shrink-0">
              <FlaskConical className="h-4 w-4 text-white" />
            </div>
            <div className="hidden md:block">
              <h2 className="text-base font-bold">Quant Lab</h2>
              <p className="text-xs text-muted-foreground">{companyName}</p>
            </div>
            <div className="md:hidden">
              <h2 className="text-sm font-bold">Quant Lab</h2>
            </div>
            
            {/* Mobile toggle */}
            <Button
              variant={showStudyPanel ? "default" : "outline"}
              size="sm"
              className="md:hidden h-9 gap-2 px-3 ml-auto"
              onClick={() => setShowStudyPanel(!showStudyPanel)}
            >
              <Layers className="h-4 w-4" />
              Studies
            </Button>
          </div>
          
          {/* Ticker Display (locked to company) */}
          <Badge variant="outline" className="h-9 px-4 font-mono font-bold text-base border-primary/50 bg-primary/5">
            {selectedTicker}
          </Badge>
          
          {/* Saved Studies */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSavedStudies(true)}
            className="hidden md:flex h-9 gap-2 px-3 border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
          >
            <Bookmark className="h-4 w-4" />
            Saved
          </Button>
        </div>
      </div>

      {/* Main Content - relative for absolute positioned mobile panel */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 relative">
        
        {/* Desktop Sidebar */}
        <div className="hidden md:flex md:w-72 lg:w-80 shrink-0 md:border-r bg-card flex-col h-full overflow-hidden">
          <div className="px-3 py-2 border-b bg-muted/30 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Select Studies</span>
              {selectedStudies.length > 0 && (
                <Badge variant="default" className="text-[10px] px-2 py-0.5">
                  {selectedStudies.length}
                </Badge>
              )}
            </div>
          </div>
          
          <div ref={leftPanelScrollRef} className="flex-1 overflow-y-auto min-h-0">
            <CollapsibleStudyCategories
              categories={STUDY_CATEGORIES}
              studies={STUDY_DEFINITIONS}
              selectedStudies={selectedStudies}
              onAddStudy={addStudy}
              onRemoveStudy={removeStudy}
              showFundamentalStudies={showFundamentalStudies}
              onShowFundamentalStudies={() => {
                setShowFundamentalStudies(true);
                setSelectedStudies([]);
                setResults({});
              }}
            />
          </div>
        </div>

        {/* Mobile Study Panel - Uses absolute within parent to keep layout header visible */}
        <AnimatePresence>
          {showStudyPanel && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="md:hidden absolute inset-0 bg-background z-40 flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
                <span className="text-base font-bold">Select Study</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => setShowStudyPanel(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <CollapsibleStudyCategories
                  categories={STUDY_CATEGORIES}
                  studies={STUDY_DEFINITIONS}
                  selectedStudies={selectedStudies}
                  onAddStudy={addStudy}
                  onRemoveStudy={removeStudy}
                  showFundamentalStudies={showFundamentalStudies}
                  onShowFundamentalStudies={() => {
                    setShowFundamentalStudies(true);
                    setSelectedStudies([]);
                    setResults({});
                    setShowStudyPanel(false);
                  }}
                  closePanelOnSelect
                  onClosePanel={() => setShowStudyPanel(false)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Panel */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Queue */}
          {selectedStudies.length > 0 && (
            <div className="shrink-0 border-b px-3 py-2 bg-muted/30">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-xs text-muted-foreground shrink-0">Queue:</span>
                {selectedStudies.map((studyId) => {
                  const study = getStudy(studyId);
                  const hasResult = !!results[studyId];
                  return (
                    <Badge
                      key={studyId}
                      variant={hasResult ? 'default' : 'secondary'}
                      className={cn(
                        "gap-1 pr-1 text-xs shrink-0 py-0.5 h-6",
                        hasResult && "bg-emerald-500 hover:bg-emerald-600"
                      )}
                    >
                      <span className="max-w-[80px] truncate">{study?.name}</span>
                      {hasResult && <CheckCircle2 className="h-3 w-3" />}
                      <button
                        onClick={() => removeStudy(studyId)}
                        className="ml-1 hover:bg-black/20 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSelectedStudies([]); setResults({}); }}
                  className="h-6 px-2 text-xs ml-auto shrink-0"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Results Content */}
          <div ref={resultsScrollRef} className="flex-1 overflow-y-auto p-3 md:p-4 min-h-0">
            {showFundamentalStudies ? (
              <div className="max-w-4xl mx-auto">
                <FundamentalStudiesContent 
                  selectedTicker={ticker}
                  onRunStudy={(studyId, studyTicker, screenerParams) => {
                    handleSetTicker(studyTicker);
                    setShowFundamentalStudies(false);
                    addStudy(studyId);
                    
                    let uiParams: Record<string, any> = {};
                    if (screenerParams && Object.keys(screenerParams).length > 0) {
                      uiParams = { ...screenerParams };
                      if (Array.isArray(uiParams.forwardDays) && uiParams.forwardDays.length > 0) {
                        uiParams.forwardDays = String(Math.max(...uiParams.forwardDays));
                      }
                      setStudyParams(prev => ({
                        ...prev,
                        [studyId]: uiParams
                      }));
                    }
                    
                    handleRunStudy(studyId, studyTicker, screenerParams);
                  }}
                  onSelectTicker={(newTicker) => {
                    handleSetTicker(newTicker);
                    setTicker(newTicker);
                  }}
                />
              </div>
            ) : Object.keys(results).length > 0 ? (
              <div className="max-w-2xl mx-auto space-y-4">
                {selectedStudies.map((studyId) => {
                  const study = getStudy(studyId);
                  const result = results[studyId];
                  if (!study || !result) return null;
                  
                  return (
                    <StudyResultCard
                      key={studyId}
                      study={study}
                      result={result}
                      ticker={selectedTicker || ''}
                      studyParams={studyParams}
                      updateParam={updateParam}
                      runStudy={handleRunStudy}
                      saveStudy={saveStudyResult}
                      isRunning={isRunning}
                      isSaving={isSaving}
                      onNavigate={navigate}
                    />
                  );
                })}
              </div>
            ) : isRunning ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="p-4 rounded-2xl bg-primary/5 border-2 border-primary/20 mb-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
                <p className="text-lg font-semibold">Running Analysis...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {runningStudy && getStudy(runningStudy)?.name}
                </p>
              </div>
            ) : selectedStudies.length > 0 ? (
              <div className="w-full max-w-xl mx-auto space-y-3">
                {selectedStudies.map((studyId) => {
                  const study = getStudy(studyId);
                  if (!study) return null;
                  return (
                    <StudySetupCard
                      key={studyId}
                      study={study}
                      ticker={ticker || selectedTicker || ''}
                      studyParams={studyParams}
                      updateParam={updateParam}
                      runStudy={handleRunStudy}
                      isRunning={isRunning}
                      period={period}
                      onPeriodChange={setPeriod}
                      periodOptions={PERIOD_OPTIONS}
                      onTickerChange={(val) => setTicker(val.toUpperCase())}
                      onTickerBlur={() => ticker.trim() && handleSetTicker(ticker.trim())}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                <div className="hidden md:flex items-center gap-3 mb-4 text-primary animate-pulse">
                  <ChevronLeft className="h-6 w-6" />
                  <span className="text-base font-semibold">Select a Quant Study</span>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 border-dashed mb-4">
                  <FlaskConical className="h-12 w-12 text-primary/60" />
                </div>
                <p className="text-lg font-bold mb-2 text-primary">No Study Selected</p>
                <p className="text-sm text-muted-foreground max-w-xs mb-4">
                  Choose a study from the panel to analyze <span className="font-semibold text-foreground">{ticker}</span>
                </p>
                <Button
                  variant="default"
                  className="md:hidden h-11 gap-2 text-sm font-semibold"
                  onClick={() => setShowStudyPanel(true)}
                >
                  <Layers className="h-4 w-4" />
                  Browse Studies
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Metric Detail Modal */}
      <MetricDetailModal
        isOpen={!!selectedMetric}
        onClose={() => setSelectedMetric(null)}
        metricKey={selectedMetric?.key || ''}
        metricValue={selectedMetric?.value}
        studyName={selectedMetric?.studyName || ''}
        ticker={selectedTicker || ''}
        studyResult={selectedMetric?.studyResult}
      />

      {/* Auth Sheet */}
      <MobileAuthSheet
        open={showAuthSheet}
        onOpenChange={setShowAuthSheet}
        title="Unlock Your Quant Edge"
        description="Free no-code tools to backtest strategies and find statistical edges."
      />

      {/* Saved Studies Panel */}
      <AnimatePresence>
        {showSavedStudies && (
          <SavedStudiesPanel
            isOpen={showSavedStudies}
            onClose={() => setShowSavedStudies(false)}
            onNavigateToTicker={(t) => {
              handleSetTicker(t);
              setTicker(t);
              setShowSavedStudies(false);
            }}
            onViewOriginalResults={(savedStudy) => {
              handleSetTicker(savedStudy.ticker);
              setTicker(savedStudy.ticker);
              
              if (savedStudy.params && Object.keys(savedStudy.params).length > 0) {
                setStudyParams(prev => ({
                  ...prev,
                  [savedStudy.study_type]: savedStudy.params
                }));
              }
              
              setResults(prev => ({
                ...prev,
                [savedStudy.study_type]: savedStudy.result
              }));
              
              setSelectedStudies([savedStudy.study_type]);
              setShowSavedStudies(false);
              toast.success('Restored saved study results');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
