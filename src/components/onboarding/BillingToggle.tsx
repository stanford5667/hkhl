import { cn } from '@/lib/utils';

interface BillingToggleProps {
  isAnnual: boolean;
  onChange: (isAnnual: boolean) => void;
}

export function BillingToggle({ isAnnual, onChange }: BillingToggleProps) {
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          "px-4 py-2 rounded-lg text-sm font-medium transition-all",
          !isAnnual
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
          isAnnual
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        Annual
        <span className="bg-green-500/20 text-green-400 text-xs font-semibold px-2 py-0.5 rounded-full">
          Save 44%
        </span>
      </button>
    </div>
  );
}
