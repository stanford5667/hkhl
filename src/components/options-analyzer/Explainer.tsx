import { Info } from 'lucide-react';

export function Explainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-primary/5 border border-primary/10">
      <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
