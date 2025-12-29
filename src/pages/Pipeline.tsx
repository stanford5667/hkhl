import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Filter, LayoutGrid, List, Calendar } from "lucide-react";
import { PipelineColumn } from "@/components/pipeline/PipelineColumn";
import { Deal } from "@/components/pipeline/DealCard";
import { cn } from "@/lib/utils";

type ViewMode = "kanban" | "table" | "timeline";

const initialDeals: Deal[] = [
  {
    id: "1",
    name: "Acme Corp",
    sector: "Software",
    ev: 180,
    multiple: 8.2,
    progress: 75,
    owner: "Sarah",
    ownerInitials: "SA",
    status: "urgent",
    statusText: "3 days",
    stage: "sourcing",
  },
  {
    id: "2",
    name: "Echo Ltd",
    sector: "Fintech",
    ev: 95,
    multiple: 6.5,
    progress: 30,
    owner: "Mike",
    ownerInitials: "MK",
    status: "on-track",
    statusText: "5 tasks",
    stage: "sourcing",
  },
  {
    id: "3",
    name: "TechCo",
    sector: "SaaS",
    ev: 220,
    multiple: 12.1,
    progress: 50,
    owner: "Mike",
    ownerInitials: "MK",
    status: "on-track",
    statusText: "5 tasks",
    stage: "screening",
  },
  {
    id: "4",
    name: "Beta Inc",
    sector: "Healthcare",
    ev: 95,
    multiple: 7.5,
    progress: 100,
    owner: "Sarah",
    ownerInitials: "SA",
    status: "complete",
    statusText: "Ready",
    stage: "due-diligence",
  },
  {
    id: "5",
    name: "Foxtrot",
    sector: "Manufacturing",
    ev: 65,
    multiple: 5.2,
    progress: 60,
    owner: "Chris",
    ownerInitials: "CS",
    status: "at-risk",
    statusText: "Delayed",
    stage: "due-diligence",
  },
  {
    id: "6",
    name: "Gamma LLC",
    sector: "Logistics",
    ev: 85,
    multiple: 6.2,
    progress: 90,
    owner: "Chris",
    ownerInitials: "CS",
    status: "on-track",
    statusText: "Friday",
    stage: "ic-review",
  },
  {
    id: "7",
    name: "Delta Co",
    sector: "Manufacturing",
    ev: 45,
    multiple: 5.8,
    progress: 95,
    owner: "Chris",
    ownerInitials: "CS",
    status: "complete",
    statusText: "Signing",
    stage: "closing",
  },
];

const stages = [
  { id: "sourcing", title: "Sourcing" },
  { id: "screening", title: "Screening" },
  { id: "due-diligence", title: "Due Diligence" },
  { id: "ic-review", title: "IC Review" },
  { id: "closing", title: "Closing" },
];

export default function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

  const handleDrop = (dealId: string, newStage: string) => {
    setDeals((prev) =>
      prev.map((deal) =>
        deal.id === dealId ? { ...deal, stage: newStage } : deal
      )
    );
  };

  const getDealsByStage = (stageId: string) =>
    deals.filter((deal) => deal.stage === stageId);

  const getTotalValue = (stageDeals: Deal[]) => {
    const total = stageDeals.reduce((sum, deal) => sum + deal.ev, 0);
    return `$${total}M`;
  };

  return (
    <div className="p-8 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="h1">Deal Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            {deals.length} active deals • $
            {deals.reduce((sum, d) => sum + d.ev, 0)}M total value
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Deal
          </Button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex items-center p-1 bg-secondary rounded-lg">
          <Button
            variant={viewMode === "kanban" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("kanban")}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Kanban
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            Table
          </Button>
          <Button
            variant={viewMode === "timeline" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("timeline")}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Timeline
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {viewMode === "kanban" && (
        <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar">
          {stages.map((stage) => {
            const stageDeals = getDealsByStage(stage.id);
            return (
              <PipelineColumn
                key={stage.id}
                title={stage.title}
                stage={stage.id}
                deals={stageDeals}
                totalValue={getTotalValue(stageDeals)}
                onDrop={handleDrop}
              />
            );
          })}
        </div>
      )}

      {/* Table View Placeholder */}
      {viewMode === "table" && (
        <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">Table view coming soon</p>
        </div>
      )}

      {/* Timeline View Placeholder */}
      {viewMode === "timeline" && (
        <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">Timeline view coming soon</p>
        </div>
      )}
    </div>
  );
}
