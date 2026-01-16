import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, TrendingUp, TrendingDown } from 'lucide-react';

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

const regions = ['All', 'Americas', 'Europe', 'Asia', 'Oceania', 'Africa'];

export function CountriesContent() {
  return (
    <div className="space-y-6">
      {/* Region Filter */}
      <div className="flex flex-wrap gap-2">
        {regions.map((region) => (
          <Badge
            key={region}
            variant={region === 'All' ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-primary/80"
          >
            {region}
          </Badge>
        ))}
      </div>

      {/* Countries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {countriesData.map((country) => (
          <Card key={country.name} className="hover:bg-secondary/30 transition-colors cursor-pointer">
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
        ))}
      </div>
    </div>
  );
}
