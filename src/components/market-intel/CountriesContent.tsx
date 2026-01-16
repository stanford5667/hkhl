import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Globe, TrendingUp, TrendingDown, Map, DollarSign, Percent, BarChart3 } from 'lucide-react';

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

const CountryCard = ({ country }: { country: CountryData }) => (
  <Card className="hover:bg-secondary/30 transition-colors cursor-pointer">
    <CardContent className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{country.flag}</span>
        <div>
          <h4 className="font-medium">{country.name}</h4>
          <Badge variant="outline" className="text-[10px]">
            {country.region}
          </Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground text-xs">GDP Growth</span>
          <p className={`font-medium ${country.gdpGrowth >= 2 ? 'text-emerald-500' : country.gdpGrowth >= 0 ? 'text-yellow-500' : 'text-rose-500'}`}>
            {country.gdpGrowth > 0 ? '+' : ''}{country.gdpGrowth}%
          </p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Inflation</span>
          <p className={`font-medium ${country.inflation <= 2 ? 'text-emerald-500' : country.inflation <= 4 ? 'text-yellow-500' : 'text-rose-500'}`}>
            {country.inflation}%
          </p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Interest Rate</span>
          <p className="font-medium">{country.interestRate}%</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">{country.currency} YTD</span>
          <p className={`font-medium flex items-center gap-1 ${country.currencyChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {country.currencyChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {country.currencyChange > 0 ? '+' : ''}{country.currencyChange}%
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export function CountriesContent() {
  const [activeTab, setActiveTab] = useState('all');
  
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
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-secondary/30">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <BarChart3 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Avg GDP Growth</span>
                  <p className={`text-xl font-bold ${avgGDP >= 2 ? 'text-emerald-500' : 'text-yellow-500'}`}>
                    {avgGDP.toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <Percent className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Avg Inflation</span>
                  <p className={`text-xl font-bold ${avgInflation <= 2 ? 'text-emerald-500' : avgInflation <= 4 ? 'text-yellow-500' : 'text-rose-500'}`}>
                    {avgInflation.toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Avg Interest Rate</span>
                  <p className="text-xl font-bold">{avgRate.toFixed(1)}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Countries Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCountries.map((country) => (
              <CountryCard key={country.name} country={country} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
