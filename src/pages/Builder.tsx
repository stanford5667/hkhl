/**
 * Visual Strategy Builder Page
 * 
 * Drag-and-drop interface for creating trading strategies
 * that export to the existing backtest system.
 */

import { VisualStrategyBuilder } from '@/components/builder/VisualStrategyBuilder';

export default function Builder() {

  return (
    <div className="h-[calc(100vh-4rem)]">
      <VisualStrategyBuilder />
    </div>
  );
}
