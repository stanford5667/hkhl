import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, CheckCircle2, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudyParam {
  key: string;
  label: string;
  description: string;
  type: 'slider' | 'number' | 'select';
  min?: number;
  max?: number;
  step?: number;
  default: number | string;
  options?: { value: string | number; label: string }[];
  beginner?: string;
}

interface StudyDefinition {
  id: string;
  name: string;
  category: string;
  icon: any;
  description: string;
  whatItMeasures?: string;
  whyItMatters?: string;
  howToUse?: string;
  params: StudyParam[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  isPremium?: boolean;
}

interface StudyCategory {
  id: string;
  name: string;
  icon: any;
  description: string;
}

interface CollapsibleStudyCategoriesProps {
  categories: StudyCategory[];
  studies: StudyDefinition[];
  selectedStudies: string[];
  onAddStudy: (studyId: string) => void;
  onRemoveStudy: (studyId: string) => void;
  showFundamentalStudies?: boolean;
  onShowFundamentalStudies?: () => void;
  className?: string;
  closePanelOnSelect?: boolean;
  onClosePanel?: () => void;
}

export function CollapsibleStudyCategories({
  categories,
  studies,
  selectedStudies,
  onAddStudy,
  onRemoveStudy,
  showFundamentalStudies,
  onShowFundamentalStudies,
  className,
  closePanelOnSelect,
  onClosePanel,
}: CollapsibleStudyCategoriesProps) {
  // Track which categories are expanded - default all open
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    categories.forEach(cat => {
      initial[cat.id] = true;
    });
    initial['fundamentals'] = true;
    return initial;
  });

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const handleStudyClick = (studyId: string, isSelected: boolean) => {
    if (isSelected) {
      onRemoveStudy(studyId);
    } else {
      onAddStudy(studyId);
      if (closePanelOnSelect && onClosePanel) {
        onClosePanel();
      }
    }
  };

  return (
    <ScrollArea className={cn("flex-1", className)}>
      <div className="px-3 py-2 space-y-1">
        {categories.map((category) => {
          const categoryStudies = studies.filter((s) => s.category === category.id);
          if (categoryStudies.length === 0) return null;
          
          const isExpanded = expandedCategories[category.id] ?? true;
          const selectedCount = categoryStudies.filter(s => selectedStudies.includes(s.id)).length;
          
          return (
            <Collapsible
              key={category.id}
              open={isExpanded}
              onOpenChange={() => toggleCategory(category.id)}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center gap-2 px-2 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
                  <div className="p-1.5 rounded-md bg-muted group-hover:bg-background transition-colors">
                    <category.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-semibold text-foreground flex-1 text-left">
                    {category.name}
                  </span>
                  {selectedCount > 0 && (
                    <Badge variant="default" className="text-[10px] px-1.5 h-5">
                      {selectedCount}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {categoryStudies.length}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pl-3 space-y-1.5 pb-2"
                  >
                    {categoryStudies.map((study) => {
                      const isSelected = selectedStudies.includes(study.id);
                      return (
                        <button
                          key={study.id}
                          onClick={() => handleStudyClick(study.id, isSelected)}
                          className={cn(
                            "w-full text-left p-2.5 rounded-lg border transition-all duration-150",
                            isSelected
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-transparent bg-muted/40 hover:bg-muted active:scale-[0.99]"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "p-1.5 rounded-md shrink-0",
                              isSelected ? "bg-primary text-primary-foreground" : "bg-background"
                            )}>
                              <study.icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-sm truncate">{study.name}</span>
                                <Badge variant="outline" className={cn(
                                  "text-[8px] px-1 py-0 h-4 shrink-0",
                                  study.difficulty === 'beginner' && "border-emerald-500/50 text-emerald-600",
                                  study.difficulty === 'intermediate' && "border-amber-500/50 text-amber-600",
                                  study.difficulty === 'advanced' && "border-red-500/50 text-red-600"
                                )}>
                                  {study.difficulty.charAt(0).toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                {study.description}
                              </p>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
        
        {/* Fundamental Studies Section */}
        {onShowFundamentalStudies && (
          <Collapsible
            open={expandedCategories['fundamentals'] ?? true}
            onOpenChange={() => toggleCategory('fundamentals')}
          >
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center gap-2 px-2 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
                <div className="p-1.5 rounded-md bg-muted group-hover:bg-background transition-colors">
                  <Landmark className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-sm font-semibold text-foreground flex-1 text-left">
                  Fundamentals
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 h-5 border-blue-500/50 text-blue-600">
                  Events
                </Badge>
                {expandedCategories['fundamentals'] ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="pl-3 pb-2"
              >
                <button
                  onClick={onShowFundamentalStudies}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg border transition-all duration-150",
                    showFundamentalStudies
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-transparent bg-muted/40 hover:bg-muted active:scale-[0.99]"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "p-1.5 rounded-md shrink-0",
                      showFundamentalStudies ? "bg-primary text-primary-foreground" : "bg-background"
                    )}>
                      <Landmark className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">Earnings, FOMC & Events</span>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        Economic data and earnings impact studies
                      </p>
                    </div>
                    {showFundamentalStudies && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                </button>
              </motion.div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </ScrollArea>
  );
}
