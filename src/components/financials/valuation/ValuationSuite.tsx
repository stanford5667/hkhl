/**
 * ValuationSuite - CFA-Aligned Institutional Valuation Suite
 * Orchestrates all valuation components within a single tab view
 */

import React from 'react';
import { useValuationEngine } from './useValuationEngine';
import { FairValueRange } from './FairValueRange';
import { JustifiedMultipleBridge } from './JustifiedMultipleBridge';
import { FootballFieldChart } from './FootballFieldChart';
import { SensitivityMatrix } from './SensitivityMatrix';
import { DataTracePanel } from './DataTracePanel';
import { Skeleton } from '@/components/ui/skeleton';

interface ValuationSuiteProps {
  ticker: string;
  companyName?: string;
}

export function ValuationSuite({ ticker, companyName }: ValuationSuiteProps) {
  const {
    input,
    scenarios,
    justifiedPE,
    baseDCF,
    footballField,
    sensitivityMatrix,
    isLoading,
  } = useValuationEngine(ticker);

  return (
    <div className="space-y-4">
      {/* 1. Fair Value Range Bar */}
      <FairValueRange
        scenarios={scenarios}
        currentPrice={input.currentPrice}
        isLoading={isLoading}
      />

      {/* 2. Valuation Football Field */}
      <FootballFieldChart
        ranges={footballField}
        currentPrice={input.currentPrice}
        isLoading={isLoading}
      />

      {/* 3. Justified P/E Bridge + Sensitivity side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <JustifiedMultipleBridge
          result={justifiedPE}
          beta={input.beta}
          roe={input.returnOnEquity}
          isLoading={isLoading}
        />

        <SensitivityMatrix
          matrix={sensitivityMatrix}
          currentPrice={input.currentPrice}
          isLoading={isLoading}
        />
      </div>

      {/* 4. Data Trace Panel */}
      <DataTracePanel input={input} />
    </div>
  );
}
