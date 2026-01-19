import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Activity, Play } from "lucide-react";

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
  period: string;
  onPeriodChange: (value: string) => void;
  periodOptions: { value: string; label: string }[];
  onTickerChange: (value: string) => void;
  onTickerBlur: () => void;
}

export function StudySetupCard({
  study,
  ticker,
  studyParams,
  updateParam,
  runStudy,
  isRunning,
  period,
  onPeriodChange,
  periodOptions,
  onTickerChange,
  onTickerBlur,
}: StudySetupCardProps) {
  const isConditional = study.category === "conditional";
  const hasParams = study.params && study.params.length > 0;

  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden")}>
      {/* Header - Title + Start button */}
      <div className="px-3 py-2 border-b bg-muted/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <study.icon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{study.name}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="default"
          disabled={!ticker || isRunning}
          onClick={() => runStudy(study.id)}
          className="h-7 px-2.5 gap-1.5 rounded-lg text-xs shrink-0"
        >
          {isRunning ? <Activity className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          Start
        </Button>
      </div>

      {/* All controls in one compact section */}
      <div className="px-3 py-2 space-y-2">
        {/* Period + Ticker row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Period</span>
            <Select value={period} onValueChange={onPeriodChange}>
              <SelectTrigger className="h-7 text-xs mt-0.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Ticker</span>
            <Input
              placeholder="AAPL"
              value={ticker}
              onChange={(e) => onTickerChange(e.target.value)}
              onBlur={onTickerBlur}
              className="h-7 text-xs font-mono font-semibold mt-0.5"
            />
          </div>
        </div>

        {/* Study-specific parameters */}
        {isConditional && hasParams && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
            {study.params.map((param) => (
              <div key={param.key}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-medium truncate">{param.label}</span>
                  <span className="text-[10px] font-mono font-bold text-primary">
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
                    className="w-full mt-1"
                  />
                )}

                {param.type === "select" && param.options && (
                  <Select
                    value={String(studyParams[study.id]?.[param.key] ?? param.default)}
                    onValueChange={(val) => updateParam(study.id, param.key, val)}
                  >
                    <SelectTrigger className="h-6 text-[10px] mt-0.5">
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
        )}
      </div>
    </div>
  );
}
