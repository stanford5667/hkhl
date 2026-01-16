import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Landmark, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BondYield {
  country: string;
  yield: number;
  flag?: string;
}

const majorGlobalYields: BondYield[] = [
  { country: 'United States', yield: 4.1730, flag: '🇺🇸' },
  { country: 'United Kingdom', yield: 4.3920, flag: '🇬🇧' },
  { country: 'Japan', yield: 2.1830, flag: '🇯🇵' },
  { country: 'Australia', yield: 4.7010, flag: '🇦🇺' },
  { country: 'Germany', yield: 2.8191, flag: '🇩🇪' },
  { country: 'Brazil', yield: 13.7500, flag: '🇧🇷' },
  { country: 'Russia', yield: 14.5900, flag: '🇷🇺' },
  { country: 'India', yield: 6.6690, flag: '🇮🇳' },
  { country: 'Canada', yield: 3.3540, flag: '🇨🇦' },
  { country: 'Italy', yield: 3.4120, flag: '🇮🇹' },
  { country: 'France', yield: 3.4920, flag: '🇫🇷' },
  { country: 'South Africa', yield: 8.2800, flag: '🇿🇦' },
  { country: 'Switzerland', yield: 0.2480, flag: '🇨🇭' },
  { country: 'Mexico', yield: 9.1000, flag: '🇲🇽' },
  { country: 'Netherlands', yield: 2.9010, flag: '🇳🇱' },
  { country: 'New Zealand', yield: 4.4510, flag: '🇳🇿' },
  { country: 'Portugal', yield: 3.2440, flag: '🇵🇹' },
  { country: 'South Korea', yield: 3.4860, flag: '🇰🇷' },
  { country: 'Spain', yield: 3.2130, flag: '🇪🇸' },
  { country: 'Greece', yield: 3.3490, flag: '🇬🇷' },
  { country: 'Turkey', yield: 27.9600, flag: '🇹🇷' },
];

const europeYields: BondYield[] = [
  { country: 'Finland', yield: 3.0950, flag: '🇫🇮' },
  { country: 'Lithuania', yield: 3.6110, flag: '🇱🇹' },
  { country: 'Norway', yield: 4.1830, flag: '🇳🇴' },
  { country: 'Poland', yield: 5.1150, flag: '🇵🇱' },
  { country: 'Romania', yield: 6.7500, flag: '🇷🇴' },
  { country: 'Slovakia', yield: 3.3830, flag: '🇸🇰' },
  { country: 'Slovenia', yield: 2.9890, flag: '🇸🇮' },
  { country: 'Sweden', yield: 2.7730, flag: '🇸🇪' },
  { country: 'Hungary', yield: 6.7800, flag: '🇭🇺' },
  { country: 'Iceland', yield: 6.6340, flag: '🇮🇸' },
  { country: 'Ireland', yield: 2.9480, flag: '🇮🇪' },
  { country: 'Austria', yield: 3.0340, flag: '🇦🇹' },
  { country: 'Belgium', yield: 3.2660, flag: '🇧🇪' },
  { country: 'Croatia', yield: 3.2620, flag: '🇭🇷' },
  { country: 'Czech Republic', yield: 4.3890, flag: '🇨🇿' },
  { country: 'Denmark', yield: 2.7130, flag: '🇩🇰' },
  { country: 'Euro area', yield: 3.19, flag: '🇪🇺' },
];

const americasYields: BondYield[] = [
  { country: 'United States', yield: 4.1730, flag: '🇺🇸' },
  { country: 'Canada', yield: 3.3540, flag: '🇨🇦' },
  { country: 'Brazil', yield: 13.7500, flag: '🇧🇷' },
  { country: 'Mexico', yield: 9.1000, flag: '🇲🇽' },
  { country: 'Peru', yield: 5.5600, flag: '🇵🇪' },
  { country: 'Chile', yield: 5.3150, flag: '🇨🇱' },
  { country: 'Colombia', yield: 12.0500, flag: '🇨🇴' },
];

const asiaYields: BondYield[] = [
  { country: 'Japan', yield: 2.1830, flag: '🇯🇵' },
  { country: 'China', yield: 1.8370, flag: '🇨🇳' },
  { country: 'India', yield: 6.6690, flag: '🇮🇳' },
  { country: 'Singapore', yield: 2.1970, flag: '🇸🇬' },
  { country: 'Taiwan', yield: 1.4100, flag: '🇹🇼' },
  { country: 'Thailand', yield: 1.7350, flag: '🇹🇭' },
  { country: 'Vietnam', yield: 4.2660, flag: '🇻🇳' },
  { country: 'Hong Kong', yield: 3.2540, flag: '🇭🇰' },
  { country: 'Indonesia', yield: 6.2300, flag: '🇮🇩' },
  { country: 'Israel', yield: 3.7810, flag: '🇮🇱' },
  { country: 'Malaysia', yield: 3.5640, flag: '🇲🇾' },
  { country: 'Pakistan', yield: 11.2010, flag: '🇵🇰' },
  { country: 'Philippines', yield: 5.9930, flag: '🇵🇭' },
  { country: 'South Korea', yield: 3.4860, flag: '🇰🇷' },
  { country: 'Australia', yield: 4.7010, flag: '🇦🇺' },
  { country: 'New Zealand', yield: 4.4510, flag: '🇳🇿' },
];

const africaYields: BondYield[] = [
  { country: 'South Africa', yield: 8.2800, flag: '🇿🇦' },
  { country: 'Zambia', yield: 17.8400, flag: '🇿🇲' },
  { country: 'Kenya', yield: 13.0130, flag: '🇰🇪' },
  { country: 'Nigeria', yield: 16.8650, flag: '🇳🇬' },
];

function YieldCard({ bond, compact = false }: { bond: BondYield; compact?: boolean }) {
  const isHighYield = bond.yield >= 10;
  const isLowYield = bond.yield < 2;
  
  return (
    <div className={cn(
      "flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors",
      compact ? "gap-2" : "gap-3"
    )}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base">{bond.flag}</span>
        <span className={cn(
          "font-medium truncate",
          compact ? "text-xs" : "text-sm"
        )}>
          {bond.country}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={cn(
          "font-mono font-semibold",
          compact ? "text-xs" : "text-sm",
          isHighYield ? "text-rose-400" : isLowYield ? "text-emerald-400" : "text-foreground"
        )}>
          {bond.yield.toFixed(2)}%
        </span>
        {isHighYield && <TrendingUp className="h-3 w-3 text-rose-400" />}
        {isLowYield && <TrendingDown className="h-3 w-3 text-emerald-400" />}
      </div>
    </div>
  );
}

function YieldGrid({ yields, compact = false }: { yields: BondYield[]; compact?: boolean }) {
  return (
    <div className={cn(
      "grid gap-1.5",
      compact ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    )}>
      {yields.map((bond) => (
        <YieldCard key={bond.country} bond={bond} compact={compact} />
      ))}
    </div>
  );
}

export function GlobalBondYields() {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Global 10Y Government Bond Yields</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            <Globe className="h-3 w-3 mr-1" />
            Live Data
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="major" className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-8 mb-4">
            <TabsTrigger value="major" className="text-xs">Major</TabsTrigger>
            <TabsTrigger value="europe" className="text-xs">Europe</TabsTrigger>
            <TabsTrigger value="americas" className="text-xs">Americas</TabsTrigger>
            <TabsTrigger value="asia" className="text-xs">Asia-Pacific</TabsTrigger>
            <TabsTrigger value="africa" className="text-xs">Africa</TabsTrigger>
          </TabsList>
          
          <TabsContent value="major" className="mt-0">
            <YieldGrid yields={majorGlobalYields} compact />
          </TabsContent>
          
          <TabsContent value="europe" className="mt-0">
            <YieldGrid yields={europeYields} compact />
          </TabsContent>
          
          <TabsContent value="americas" className="mt-0">
            <YieldGrid yields={americasYields} compact />
          </TabsContent>
          
          <TabsContent value="asia" className="mt-0">
            <YieldGrid yields={asiaYields} compact />
          </TabsContent>
          
          <TabsContent value="africa" className="mt-0">
            <YieldGrid yields={africaYields} compact />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
