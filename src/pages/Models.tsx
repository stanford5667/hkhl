import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, BarChart3, DollarSign, TrendingUp, GitMerge, FileText, RefreshCw } from "lucide-react";
import { ModelTypeCard } from "@/components/models/ModelTypeCard";
import { RecentModelsTable } from "@/components/models/RecentModelsTable";
import { Separator } from "@/components/ui/separator";

interface ModelType {
  icon: React.ReactNode;
  title: string;
  description: string;
  route?: string;
}

const modelTypes: ModelType[] = [
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "LBO Model",
    description: "Full leveraged buyout with debt schedules and returns analysis",
  },
  {
    icon: <DollarSign className="h-5 w-5" />,
    title: "DCF Model",
    description: "Intrinsic value with WACC & terminal value calculation",
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Pro Forma",
    description: "Operating projections & scenario planning",
  },
  {
    icon: <GitMerge className="h-5 w-5" />,
    title: "Merger Model",
    description: "M&A accretion/dilution with synergy analysis",
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "CAM Builder",
    description: "AI-generated credit memo with risk rating",
  },
  {
    icon: <RefreshCw className="h-5 w-5" />,
    title: "Cash Flow Buildup",
    description: "Detailed FCF from operations analysis",
    route: "/models/cash-flow-buildup",
  },
];

export default function Models() {
  const navigate = useNavigate();

  return (
    <div className="p-8 space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="h1">AI Models</h1>
          <p className="text-muted-foreground mt-1">
            Build financial models with AI-powered intelligence
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Model
        </Button>
      </div>

      {/* Model Types Grid */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Model Types
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {modelTypes.map((type) => (
            <ModelTypeCard
              key={type.title}
              icon={type.icon}
              title={type.title}
              description={type.description}
              onClick={type.route ? () => navigate(type.route) : undefined}
            />
          ))}
        </div>
      </div>

      <Separator />

      {/* Recent Models */}
      <RecentModelsTable />
    </div>
  );
}
