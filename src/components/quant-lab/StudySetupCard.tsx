import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Activity, GitBranch, Play } from "lucide-react";

interface StudyParam {
  key: string;
  label: string;
  description: string;
  type: "slider" | "number" | "select";
  min?: number;
  max?: number;
  step?: number;
  default: number | string;
  options?: { value: string | number; label: string }[];
}

interface StudyDefinition {
  id: string;
  name: string;
  category: string;
  icon: any;
  description: string;
  params: StudyParam[];
}

interface StudySetupCardProps {
  study: StudyDefinition;
  ticker: string;
  studyParams: Record<string, any>;
  updateParam: (studyId: string, key: string, value: any) => void;
  runStudy: (studyId: string) => void;
  isRunning: boolean;
}

export function StudySetupCard({
  study,
  ticker,
  studyParams,
  updateParam,
  runStudy,
  isRunning,
}: StudySetupCardProps) {
  return (
    <div className={cn("rounded-2xl border-2 bg-card overflow-hidden")}>
      {/* Header */}
      <div className="px-4 py-4 border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <study.icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-base font-bold leading-tight truncate">{study.name}</p>
            <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{study.description}</p>
          </div>
          <Button
            size="sm"
            variant="default"
            disabled={!ticker || isRunning}
            onClick={() => runStudy(study.id)}
            className="h-9 px-3 gap-2 rounded-xl"
          >
            {isRunning ? <Activity className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            Run
          </Button>
        </div>
      </div>

      {/* Params */}
      {study.params?.length > 0 && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <GitBranch className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {study.category === "conditional" ? "Condition Variables" : "Parameters"}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            {study.params.map((param) => (
              <div key={param.key} className="flex-1 min-w-[140px] max-w-[220px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium">{param.label}</span>
                  <span className="text-xs font-mono font-bold text-primary">
                    {studyParams[study.id]?.[param.key] ?? param.default}
                    {param.label.includes("%") ? "%" : ""}
                  </span>
                </div>

                {param.type === "slider" && (
                  <Slider
                    value={[studyParams[study.id]?.[param.key] ?? param.default]}
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    onValueChange={([val]) => updateParam(study.id, param.key, val)}
                    className="w-full"
                  />
                )}

                {param.type === "select" && param.options && (
                  <Select
                    value={String(studyParams[study.id]?.[param.key] ?? param.default)}
                    onValueChange={(val) => updateParam(study.id, param.key, val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {param.options.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
