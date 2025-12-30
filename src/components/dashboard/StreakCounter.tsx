import { Flame } from 'lucide-react';

interface StreakCounterProps {
  days: number;
}

export function StreakCounter({ days }: StreakCounterProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/20">
      <Flame className="h-4 w-4 text-warning" />
      <span className="text-sm font-medium text-warning">{days}-day streak</span>
    </div>
  );
}