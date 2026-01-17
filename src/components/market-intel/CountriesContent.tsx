import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Globe, TrendingUp, TrendingDown, Map, DollarSign, Percent, BarChart3 } from 'lucide-react';
import { type MarketDataItem } from './MarketDataDetail';

interface CountryData {
  name: string;
  flag: string;
  region: string;
  gdpGrowth: number;
  inflation: number;
  interestRate: number;
  currency: string;
  currencyChange: number;
}

const countriesData: CountryData[] = [
  { name: 'United States', flag: '🇺🇸', region: 'Americas', gdpGrowth: 2.8, inflation: 3.2, interestRate: 4.50, currency: 'USD', currencyChange: 0 },
  { name: 'China', flag: '🇨🇳', region: 'Asia', gdpGrowth: 4.9, inflation: 0.2, interestRate: 3.45, currency: 'CNY', currencyChange: -1.2 },
  { name: 'Japan', flag: '🇯🇵', region: 'Asia', gdpGrowth: 1.9, inflation: 2.8, interestRate: 0.25, currency: 'JPY', currencyChange: -8.4 },
  { name: 'Germany', flag: '🇩🇪', region: 'Europe', gdpGrowth: 0.2, inflation: 2.9, interestRate: 4.25, currency: 'EUR', currencyChange: -2.1 },
  { name: 'United Kingdom', flag: '🇬🇧', region: 'Europe', gdpGrowth: 1.1, inflation: 4.0, interestRate: 5.00, currency: 'GBP', currencyChange: 1.8 },
  { name: 'France', flag: '🇫🇷', region: 'Europe', gdpGrowth: 0.9, inflation: 2.5, interestRate: 4.25, currency: 'EUR', currencyChange: -2.1 },
  { name: 'India', flag: '🇮🇳', region: 'Asia', gdpGrowth: 6.8, inflation: 5.1, interestRate: 6.50, currency: 'INR', currencyChange: -1.5 },
  { name: 'Brazil', flag: '🇧🇷', region: 'Americas', gdpGrowth: 2.9, inflation: 4.5, interestRate: 10.50, currency: 'BRL', currencyChange: -4.2 },
  { name: 'Canada', flag: '🇨🇦', region: 'Americas', gdpGrowth: 1.2, inflation: 2.9, interestRate: 4.50, currency: 'CAD', currencyChange: -3.1 },
  { name: 'Australia', flag: '🇦🇺', region: 'Oceania', gdpGrowth: 1.5, inflation: 3.6, interestRate: 4.35, currency: 'AUD', currencyChange: -5.2 },
  { name: 'South Korea', flag: '🇰🇷', region: 'Asia', gdpGrowth: 2.2, inflation: 2.3, interestRate: 3.50, currency: 'KRW', currencyChange: -6.8 },
  { name: 'Mexico', flag: '🇲🇽', region: 'Americas', gdpGrowth: 3.2, inflation: 4.7, interestRate: 11.00, currency: 'MXN', currencyChange: 2.4 },
  { name: 'Switzerland', flag: '🇨🇭', region: 'Europe', gdpGrowth: 0.8, inflation: 1.4, interestRate: 1.50, currency: 'CHF', currencyChange: 4.2 },
  { name: 'Singapore', flag: '🇸🇬', region: 'Asia', gdpGrowth: 2.5, inflation: 2.7, interestRate: 3.75, currency: 'SGD', currencyChange: 0.8 },
  { name: 'South Africa', flag: '🇿🇦', region: 'Africa', gdpGrowth: 0.9, inflation: 5.3, interestRate: 8.25, currency: 'ZAR', currencyChange: -8.1 },
];

interface CountriesContentProps {
  onItemClick?: (item: MarketDataItem) => void;
}

const CountryCard = ({ country, onClick }: { country: CountryData; onClick?: () => void }) => (
  <Card className="hover:bg-secondary/30 transition-colors cursor-pointer" onClick={onClick}>
    <CardContent className="p-3 sm:p-4">
      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
        <span className="text-xl sm:text-2xl">{country.flag}</span>
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-sm sm:text-base truncate">{country.name}</h4>
          <Badge variant="outline" className="text-[9px] sm:text-[10px]">
            {country.region}
          </Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
        <div className="min-w-0">
          <span className="text-muted-foreground text-[10px] sm:text-xs block truncate">GDP Growth</span>
          <p className={`font-medium font-mono ${country.gdpGrowth >= 2 ? 'text-emerald-500' : country.gdpGrowth >= 0 ? 'text-yellow-500' : 'text-rose-500'}`}>
            {country.gdpGrowth > 0 ? '+' : ''}{country.gdpGrowth}%
          </p>
        </div>
        <div className="min-w-0">
          <span className="text-muted-foreground text-[10px] sm:text-xs block truncate">Inflation</span>
          <p className={`font-medium font-mono ${country.inflation <= 2 ? 'text-emerald-500' : country.inflation <= 4 ? 'text-yellow-500' : 'text-rose-500'}`}>
            {country.inflation}%
          </p>
        </div>
        <div className="min-w-0">
          <span className="text-muted-foreground text-[10px] sm:text-xs block truncate">Rate</span>
          <p className="font-medium font-mono">{country.interestRate}%</p>
        </div>
        <div className="min-w-0">
          <span className="text-muted-foreground text-[10px] sm:text-xs block truncate">{country.currency}</span>
          <p className={`font-medium font-mono flex items-center gap-0.5 ${country.currencyChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {country.currencyChange >= 0 ? <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" /> : <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />}
            {country.currencyChange > 0 ? '+' : ''}{country.currencyChange}%
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export function CountriesContent({ onItemClick }: CountriesContentProps) {
  const [activeTab, setActiveTab] = useState('all');
  
  const handleCountryClick = (country: CountryData) => {
    if (onItemClick) {
      onItemClick({
        symbol: country.currency,
        name: country.name,
        price: country.interestRate,
        change: country.currencyChange,
        changePercent: country.currencyChange,
        type: 'economic',
        category: country.region,
      });
    }
  };
  
  const tabs = [
    { id: 'all', label: 'All Regions', icon: Globe },
    { id: 'Americas', label: 'Americas', icon: Map },
    { id: 'Europe', label: 'Europe', icon: Map },
    { id: 'Asia', label: 'Asia', icon: Map },
  ];
  
  const filteredCountries = activeTab === 'all' 
    ? countriesData 
    : countriesData.filter(c => c.region === activeTab || (activeTab === 'Asia' && (c.region === 'Asia' || c.region === 'Oceania')));

  // Calculate regional averages
  const avgGDP = filteredCountries.reduce((sum, c) => sum + c.gdpGrowth, 0) / filteredCountries.length;
  const avgInflation = filteredCountries.reduce((sum, c) => sum + c.inflation, 0) / filteredCountries.length;
  const avgRate = filteredCountries.reduce((sum, c) => sum + c.interestRate, 0) / filteredCountries.length;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-secondary/30 p-1 h-auto flex-wrap">
          {tabs.map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm"
            >
              <Icon className="h-4 w-4" />
              {label}
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {id === 'all' ? countriesData.length : countriesData.filter(c => c.region === id || (id === 'Asia' && (c.region === 'Asia' || c.region === 'Oceania'))).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-6">
          {/* Regional Summary */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Card className="bg-secondary/30">
              <CardContent className="p-2 sm:p-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/20 shrink-0">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                </div>
                <div className="text-center sm:text-left min-w-0">
                  <span className="text-[9px] sm:text-xs text-muted-foreground block truncate">Avg GDP</span>
                  <p className={`text-sm sm:text-xl font-bold font-mono ${avgGDP >= 2 ? 'text-emerald-500' : 'text-yellow-500'}`}>
                    {avgGDP.toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30">
              <CardContent className="p-2 sm:p-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-yellow-500/20 shrink-0">
                  <Percent className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                </div>
                <div className="text-center sm:text-left min-w-0">
                  <span className="text-[9px] sm:text-xs text-muted-foreground block truncate">Inflation</span>
                  <p className={`text-sm sm:text-xl font-bold font-mono ${avgInflation <= 2 ? 'text-emerald-500' : avgInflation <= 4 ? 'text-yellow-500' : 'text-rose-500'}`}>
                    {avgInflation.toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30">
              <CardContent className="p-2 sm:p-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-primary/20 shrink-0">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="text-center sm:text-left min-w-0">
                  <span className="text-[9px] sm:text-xs text-muted-foreground block truncate">Rate</span>
                  <p className="text-sm sm:text-xl font-bold font-mono">{avgRate.toFixed(1)}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Countries Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCountries.map((country) => (
              <CountryCard key={country.name} country={country} onClick={() => handleCountryClick(country)} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
