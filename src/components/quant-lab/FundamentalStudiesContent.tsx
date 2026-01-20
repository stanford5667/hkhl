import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, DollarSign, Building2, Target, Globe, Scan } from 'lucide-react';
import FundamentalEventCalendar from '@/components/quant-lab/FundamentalEventCalendar';
import EarningsImpactAnalyzer from '@/components/quant-lab/EarningsImpactAnalyzer';
import FOMCImpactStudy from '@/components/quant-lab/FOMCImpactStudy';
import { ProbabilityScreener } from '@/components/quant-lab/ProbabilityScreener';
import { UniverseScreener } from '@/components/quant-lab/UniverseScreener';
import { CrossStudyScreener } from '@/components/quant-lab/CrossStudyScreener';

interface FundamentalStudiesContentProps {
  defaultTab?: string;
  selectedTicker?: string;
  // Updated callback signature to include params for reproducible results
  onRunStudy?: (studyId: string, ticker: string, params?: Record<string, any>) => void;
  onSelectTicker?: (ticker: string) => void;
}

export function FundamentalStudiesContent({ 
  defaultTab = 'cross-study', 
  selectedTicker,
  onRunStudy,
  onSelectTicker
}: FundamentalStudiesContentProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-background/50 h-auto flex-wrap gap-1 p-1">
          <TabsTrigger value="cross-study" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Scan className="h-4 w-4" />
            Cross-Study
          </TabsTrigger>
          <TabsTrigger value="universe" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Globe className="h-4 w-4" />
            Universe
          </TabsTrigger>
          <TabsTrigger value="probability" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Target className="h-4 w-4" />
            Events
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="earnings" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <DollarSign className="h-4 w-4" />
            Earnings
          </TabsTrigger>
          <TabsTrigger value="fomc" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="h-4 w-4" />
            FOMC
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cross-study" className="m-0">
          <CrossStudyScreener 
            onRunStudy={onRunStudy}
            onSelectTicker={onSelectTicker}
          />
        </TabsContent>

        <TabsContent value="universe" className="m-0">
          <UniverseScreener />
        </TabsContent>

        <TabsContent value="probability" className="m-0">
          <ProbabilityScreener />
        </TabsContent>

        <TabsContent value="calendar" className="m-0">
          <FundamentalEventCalendar selectedTicker={selectedTicker} />
        </TabsContent>

        <TabsContent value="earnings" className="m-0">
          <EarningsImpactAnalyzer selectedTicker={selectedTicker} />
        </TabsContent>

        <TabsContent value="fomc" className="m-0">
          <FOMCImpactStudy />
        </TabsContent>
      </Tabs>
    </div>
  );
}
