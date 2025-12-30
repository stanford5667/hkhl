import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  TrendingUp,
  FileText,
  Calendar,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CompanySummaryCardProps {
  company: {
    id: string;
    name: string;
    industry?: string | null;
    description?: string | null;
    website?: string | null;
    revenue_ltm?: number | null;
    ebitda_ltm?: number | null;
    company_type?: string | null;
    pipeline_stage?: string | null;
    updated_at: string;
  };
  documentCount: number;
  modelCount: number;
  storageUsedMB: number;
}

export function CompanySummaryCard({
  company,
  documentCount,
  modelCount,
  storageUsedMB,
}: CompanySummaryCardProps) {
  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return "—";
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const getStageColor = (stage: string | null | undefined) => {
    switch (stage?.toLowerCase()) {
      case "sourcing":
        return "bg-muted text-muted-foreground";
      case "screening":
        return "bg-blue-500/10 text-blue-600";
      case "diligence":
        return "bg-amber-500/10 text-amber-600";
      case "loi":
        return "bg-purple-500/10 text-purple-600";
      case "closing":
        return "bg-emerald-500/10 text-emerald-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="p-4 bg-gradient-to-r from-card to-card/80 border-border/50">
      <div className="flex items-start justify-between gap-4">
        {/* Company Info */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-foreground truncate">
                {company.name}
              </h2>
              {company.pipeline_stage && (
                <Badge className={getStageColor(company.pipeline_stage)}>
                  {company.pipeline_stage}
                </Badge>
              )}
              {company.company_type && (
                <Badge variant="outline" className="text-xs capitalize">
                  {company.company_type}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
              {company.industry || company.description || "No description"}
            </p>
            {company.website && (
              <a
                href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                <ExternalLink className="h-3 w-3" />
                {company.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-center">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <TrendingUp className="h-3 w-3" />
              Revenue
            </div>
            <p className="text-sm font-semibold text-foreground">
              {formatCurrency(company.revenue_ltm)}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <TrendingUp className="h-3 w-3" />
              EBITDA
            </div>
            <p className="text-sm font-semibold text-foreground">
              {formatCurrency(company.ebitda_ltm)}
            </p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <FileText className="h-3 w-3" />
              Documents
            </div>
            <p className="text-sm font-semibold text-foreground">{documentCount}</p>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground text-xs">Models</div>
            <p className="text-sm font-semibold text-foreground">{modelCount}</p>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground text-xs">Storage</div>
            <p className="text-sm font-semibold text-foreground">
              {storageUsedMB.toFixed(1)} MB
            </p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Calendar className="h-3 w-3" />
              Updated
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(company.updated_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
