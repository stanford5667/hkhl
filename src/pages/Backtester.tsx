/**
 * Portfolio Backtester Page
 * 
 * A dedicated page for the traditional portfolio backtesting tool
 */

import { TraditionalBacktester } from '@/components/backtester/TraditionalBacktester';
import { FooterDisclaimer } from '@/components/legal';

export default function BacktesterPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="container max-w-7xl py-8 flex-1">
        <TraditionalBacktester />
      </div>
      <FooterDisclaimer />
    </div>
  );
}
