/**
 * Portfolio Backtester Page
 * 
 * Mobile-first design with minimal scrolling
 */

import { MobileBacktester } from '@/components/backtester/MobileBacktester';

export default function BacktesterPage() {
  return (
    <div className="h-full min-h-0 flex flex-col">
      <MobileBacktester />
    </div>
  );
}
