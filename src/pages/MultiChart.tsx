/**
 * Multi-Chart Page
 * TradingView-style multi-chart workspace
 */

import { MultiChartLayout } from '@/components/charting/MultiChartLayout';
import { useSearchParams } from 'react-router-dom';

export default function MultiChartPage() {
  const [searchParams] = useSearchParams();
  const symbol = searchParams.get('symbol') || 'AAPL';

  return (
    <div className="h-[calc(100vh-4rem)]">
      <MultiChartLayout defaultSymbol={symbol} />
    </div>
  );
}
