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
import { Activity, Play, Info } from "lucide-react";

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
  beginner?: string;
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
  const isConditional = study.category === "conditional";
  const hasParams = study.params && study.params.length > 0;

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
            className="h-9 px-3 gap-2 rounded-xl whitespace-nowrap"
          >
            {isRunning ? <Activity className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span className="hidden sm:inline">Get Started Free</span>
            <span className="sm:hidden">Start</span>
          </Button>
        </div>
      </div>

      {/* Conditional Studies - Show editable condition variables */}
      {isConditional && hasParams && (
        <div className="px-3 py-3 md:px-4 md:py-4 space-y-2 md:space-y-4">
          {/* Study explanation - more compact on mobile */}
          <p className="text-xs md:text-sm text-muted-foreground leading-snug">
            Adjust variables, then tap <span className="font-semibold text-primary">Start</span> to analyze <span className="font-mono font-semibold">{ticker || 'ticker'}</span>.
          </p>

          {/* Grid layout - 2 columns on mobile, flexible on larger screens */}
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-4">
            {study.params.map((param) => (
              <div key={param.key} className="md:flex-1 md:min-w-[140px] md:max-w-[220px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] md:text-xs font-medium truncate">{param.label}</span>
                  <span className="text-[10px] md:text-xs font-mono font-bold text-primary">
                    {param.type === "select" 
                      ? (param.options?.find(o => String(o.value) === String(studyParams[study.id]?.[param.key] ?? param.default))?.label ?? (studyParams[study.id]?.[param.key] ?? param.default))
                      : (studyParams[study.id]?.[param.key] ?? param.default)}
                    {param.label.includes("%") && param.type !== "select" ? "%" : ""}
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
                    <SelectTrigger className="h-7 md:h-8 text-[10px] md:text-xs">
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

      {/* Non-conditional studies - Show simple info message */}
      {!isConditional && (
        <div className="px-4 py-3 bg-muted/10">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              This study uses industry-standard settings and analyzes all available data automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
