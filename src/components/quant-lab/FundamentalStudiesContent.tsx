import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, DollarSign, Building2, Target, Globe } from 'lucide-react';
import FundamentalEventCalendar from '@/components/quant-lab/FundamentalEventCalendar';
import EarningsImpactAnalyzer from '@/components/quant-lab/EarningsImpactAnalyzer';
import FOMCImpactStudy from '@/components/quant-lab/FOMCImpactStudy';
import { ProbabilityScreener } from '@/components/quant-lab/ProbabilityScreener';
import { UniverseScreener } from '@/components/quant-lab/UniverseScreener';

interface FundamentalStudiesContentProps {
  defaultTab?: string;
  selectedTicker?: string;
}

export function FundamentalStudiesContent({ defaultTab = 'calendar', selectedTicker }: FundamentalStudiesContentProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-background/50 h-auto flex-wrap gap-1 p-1">
          <TabsTrigger value="universe" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Globe className="h-4 w-4" />
            Universe Screen
          </TabsTrigger>
          <TabsTrigger value="probability" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Target className="h-4 w-4" />
            Probability
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
