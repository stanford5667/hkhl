import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, DollarSign, Building2 } from 'lucide-react';
import FundamentalEventCalendar from './FundamentalEventCalendar';
import EarningsImpactAnalyzer from './EarningsImpactAnalyzer';
import FOMCImpactStudy from './FOMCImpactStudy';

interface StudiesContentProps {
  defaultTab?: string;
}

export function StudiesContent({ defaultTab = 'calendar' }: StudiesContentProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-background/50 h-auto flex-wrap gap-1 p-1">
          <TabsTrigger value="calendar" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Calendar className="h-4 w-4" />
            Event Calendar
          </TabsTrigger>
          <TabsTrigger value="earnings" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <DollarSign className="h-4 w-4" />
            Earnings Impact
          </TabsTrigger>
          <TabsTrigger value="fomc" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="h-4 w-4" />
            FOMC Impact
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="m-0">
          <FundamentalEventCalendar />
        </TabsContent>

        <TabsContent value="earnings" className="m-0">
          <EarningsImpactAnalyzer />
        </TabsContent>

        <TabsContent value="fomc" className="m-0">
          <FOMCImpactStudy />
        </TabsContent>
      </Tabs>
    </div>
  );
}
