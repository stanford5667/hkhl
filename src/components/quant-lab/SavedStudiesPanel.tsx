/**
 * Saved Studies Panel - View and manage saved study results
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Bookmark, Search, Trash2, ExternalLink, Calendar, 
  ChevronDown, ChevronRight, TrendingUp, TrendingDown,
  BarChart3, Filter, Clock, RefreshCcw, Loader2, X,
  Share2, Twitter, Link2, Copy, Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface SavedStudy {
  id: string;
  ticker: string;
  study_type: string;
  study_name: string;
  period: string;
  params: Record<string, any>;
  result: Record<string, any>;
  bars_analyzed: number | null;
  date_range: { start: string; end: string } | null;
  notes: string | null;
  created_at: string;
}

interface SavedStudiesPanelProps {
  onSelectStudy?: (study: SavedStudy) => void;
  onNavigateToTicker?: (ticker: string) => void;
  onViewOriginalResults?: (study: SavedStudy) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function SavedStudiesPanel({ 
  onSelectStudy, 
  onNavigateToTicker,
  onViewOriginalResults,
  isOpen,
  onClose
}: SavedStudiesPanelProps) {
  const { user } = useAuth();
  const [studies, setStudies] = useState<SavedStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTicker, setFilterTicker] = useState<string>('all');
  const [filterStudyType, setFilterStudyType] = useState<string>('all');
  const [expandedStudy, setExpandedStudy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchStudies = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_studies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Parse JSON fields
      const parsed = (data || []).map(s => ({
        ...s,
        params: typeof s.params === 'string' ? JSON.parse(s.params) : s.params || {},
        result: typeof s.result === 'string' ? JSON.parse(s.result) : s.result || {},
        date_range: typeof s.date_range === 'string' ? JSON.parse(s.date_range) : s.date_range,
      }));
      
      setStudies(parsed);
    } catch (error) {
      console.error('Error fetching saved studies:', error);
      toast.error('Failed to load saved studies');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      fetchStudies();
    }
  }, [isOpen, user, fetchStudies]);

  const deleteStudy = async (studyId: string) => {
    if (!user) return;
    
    setDeleting(studyId);
    try {
      const { error } = await supabase
        .from('saved_studies')
        .delete()
        .eq('id', studyId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setStudies(prev => prev.filter(s => s.id !== studyId));
      toast.success('Study deleted');
    } catch (error) {
      console.error('Error deleting study:', error);
      toast.error('Failed to delete study');
    } finally {
      setDeleting(null);
    }
  };

  // Get unique tickers and study types for filters
  const uniqueTickers = [...new Set(studies.map(s => s.ticker))].sort();
  const uniqueStudyTypes = [...new Set(studies.map(s => s.study_name))].sort();

  // Filter studies
  const filteredStudies = studies.filter(study => {
    const matchesSearch = searchQuery === '' || 
      study.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.study_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTicker = filterTicker === 'all' || study.ticker === filterTicker;
    const matchesType = filterStudyType === 'all' || study.study_name === filterStudyType;
    return matchesSearch && matchesTicker && matchesType;
  });

  // Group by date
  const groupedStudies = filteredStudies.reduce((acc, study) => {
    const date = new Date(study.created_at).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(study);
    return acc;
  }, {} as Record<string, SavedStudy[]>);

  const getSentiment = (result: any): 'bullish' | 'bearish' | 'neutral' => {
    const interpretation = result?.interpretation?.toLowerCase() || '';
    if (interpretation.includes('bullish') || interpretation.includes('favorable')) return 'bullish';
    if (interpretation.includes('bearish') || interpretation.includes('caution')) return 'bearish';
    return 'neutral';
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-amber-500" />
          <h2 className="font-bold text-lg">Saved Studies</h2>
          <Badge variant="secondary" className="text-xs">{studies.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={fetchStudies} disabled={loading}>
            <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="px-4 py-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search studies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterTicker} onValueChange={setFilterTicker}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="All tickers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tickers</SelectItem>
              {uniqueTickers.map(ticker => (
                <SelectItem key={ticker} value={ticker}>{ticker}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStudyType} onValueChange={setFilterStudyType}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="All studies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All studies</SelectItem>
              {uniqueStudyTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Studies List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredStudies.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Bookmark className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {studies.length === 0 
                ? "No saved studies yet. Run a study and click 'Save' to build your research library."
                : "No studies match your filters."}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {Object.entries(groupedStudies).map(([date, dateStudies]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">{date}</span>
                  <Separator className="flex-1" />
                </div>
                <div className="space-y-2">
                  {dateStudies.map((study) => {
                    const sentiment = getSentiment(study.result);
                    const isExpanded = expandedStudy === study.id;
                    
                    return (
                      <Collapsible
                        key={study.id}
                        open={isExpanded}
                        onOpenChange={() => setExpandedStudy(isExpanded ? null : study.id)}
                      >
                        <Card className={cn(
                          "overflow-hidden transition-all",
                          sentiment === 'bullish' && "border-emerald-500/30",
                          sentiment === 'bearish' && "border-red-500/30"
                        )}>
                          <CollapsibleTrigger asChild>
                            <div className="px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className="font-mono text-[10px] bg-primary/10 border-primary/30"
                                >
                                  ${study.ticker}
                                </Badge>
                                <span className="text-sm font-medium flex-1 truncate">{study.study_name}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDistanceToNow(new Date(study.created_at), { addSuffix: true })}
                                </span>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              
                              {/* Quick stats row */}
                              <div className="flex items-center gap-3 mt-1.5">
                                {study.result.analysis?.[0]?.winRate !== undefined && (
                                  <span className={cn(
                                    "text-xs font-semibold",
                                    study.result.analysis[0].winRate >= 55 ? "text-emerald-500" : 
                                    study.result.analysis[0].winRate <= 45 ? "text-red-500" : "text-muted-foreground"
                                  )}>
                                    {study.result.analysis[0].winRate.toFixed(1)}% win rate
                                  </span>
                                )}
                                {study.result.analysis?.[0]?.avgReturn !== undefined && (
                                  <span className={cn(
                                    "text-xs font-semibold",
                                    study.result.analysis[0].avgReturn >= 0 ? "text-emerald-500" : "text-red-500"
                                  )}>
                                    {study.result.analysis[0].avgReturn >= 0 ? '+' : ''}
                                    {study.result.analysis[0].avgReturn.toFixed(2)}% avg
                                  </span>
                                )}
                                {study.bars_analyzed && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {study.bars_analyzed} days
                                  </span>
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <div className="px-3 pb-3 pt-0 border-t bg-muted/10">
                              {/* Interpretation */}
                              {(study.result.interpretation || study.result.insight) && (
                                <p className="text-xs text-foreground/80 mt-2 leading-relaxed">
                                  {study.result.interpretation || study.result.insight}
                                </p>
                              )}
                              
                              {/* Date range */}
                              {study.date_range && (
                                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {study.date_range.start} to {study.date_range.end}
                                </div>
                              )}
                              
                              {/* Parameters used */}
                              {Object.keys(study.params).length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {Object.entries(study.params).map(([key, value]) => (
                                    <Badge key={key} variant="secondary" className="text-[9px] h-5">
                                      {key}: {String(value)}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              {/* Actions */}
                              <div className="flex items-center gap-2 mt-3">
                                {onViewOriginalResults && (
                                  <Button 
                                    size="sm" 
                                    variant="default" 
                                    className="h-7 text-xs gap-1 flex-1"
                                    onClick={() => onViewOriginalResults(study)}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    View Results
                                  </Button>
                                )}
                                
                                {/* Share Dropdown */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-7 text-xs gap-1"
                                    >
                                      <Share2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        const text = `📊 ${study.ticker} ${study.study_name}\n\n` +
                                          `Win Rate: ${study.result.analysis?.[0]?.winRate?.toFixed(1) ?? 'N/A'}%\n` +
                                          `Avg Move: ${study.result.analysis?.[0]?.avgReturn?.toFixed(2) ?? 'N/A'}%\n\n` +
                                          `Analyzed with Quant Lab`;
                                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                                      }}
                                    >
                                      <Twitter className="h-4 w-4 mr-2" />
                                      Share on X
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        const text = `📊 ${study.ticker} ${study.study_name}\n\n` +
                                          `Win Rate: ${study.result.analysis?.[0]?.winRate?.toFixed(1) ?? 'N/A'}%\n` +
                                          `Avg Move: ${study.result.analysis?.[0]?.avgReturn?.toFixed(2) ?? 'N/A'}%`;
                                        navigator.clipboard.writeText(text);
                                        toast.success('Copied to clipboard!');
                                      }}
                                    >
                                      <Copy className="h-4 w-4 mr-2" />
                                      Copy Summary
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                        toast.success('Link copied!');
                                      }}
                                    >
                                      <Link2 className="h-4 w-4 mr-2" />
                                      Copy Link
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>

                                {onNavigateToTicker && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-xs gap-1"
                                    onClick={() => onNavigateToTicker(study.ticker)}
                                    title={`Go to ${study.ticker}`}
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => deleteStudy(study.id)}
                                  disabled={deleting === study.id}
                                >
                                  {deleting === study.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-2 border-t bg-muted/20 text-center">
        <p className="text-[10px] text-muted-foreground">
          Your research library • {filteredStudies.length} of {studies.length} studies shown
        </p>
      </div>
    </motion.div>
  );
}
