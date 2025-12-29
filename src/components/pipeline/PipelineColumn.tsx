import { useState } from "react";
import { cn } from "@/lib/utils";
import { DealCard, Deal } from "./DealCard";

interface PipelineColumnProps {
  title: string;
  deals: Deal[];
  totalValue: string;
  onDrop?: (dealId: string, stage: string) => void;
  stage: string;
}

export function PipelineColumn({ title, deals, totalValue, onDrop, stage }: PipelineColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dealId = e.dataTransfer.getData("dealId");
    if (dealId && onDrop) {
      onDrop(dealId, stage);
    }
  };

  const handleDragStart = (e: React.DragEvent, deal: Deal) => {
    e.dataTransfer.setData("dealId", deal.id);
  };

  return (
    <div
      className={cn(
        "flex flex-col min-w-[280px] max-w-[320px] rounded-lg transition-colors",
        isDragOver && "bg-primary/5"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </h3>
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-secondary text-xs font-medium text-muted-foreground">
            {deals.length}
          </span>
        </div>
        <span className="text-xs font-mono text-muted-foreground">{totalValue}</span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3 flex-1">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onDragStart={handleDragStart} />
        ))}
        
        {/* Empty state */}
        {deals.length === 0 && (
          <div className="flex items-center justify-center h-24 border border-dashed border-border rounded-lg text-sm text-muted-foreground">
            Drop deals here
          </div>
        )}
      </div>
    </div>
  );
}
