import { useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useHeatmapStore, type TimeRange } from '@/stores/heatmapStore';

const TIME_RANGES: { label: string; value: TimeRange; months: number }[] = [
  { label: '1M', value: '1M', months: 1 },
  { label: '3M', value: '3M', months: 3 },
  { label: '6M', value: '6M', months: 6 },
  { label: '1Y', value: '1Y', months: 12 },
];

export function TimeLapseSlider() {
  const {
    timeRange, setTimeRange,
    isPlaying, setIsPlaying,
    playbackMonth, setPlaybackMonth,
  } = useHeatmapStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rangeConfig = TIME_RANGES.find(r => r.value === timeRange) || TIME_RANGES[1];
  const maxMonths = rangeConfig.months;

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setPlaybackMonth(
          playbackMonth >= 0
            ? -maxMonths // restart from oldest
            : playbackMonth + 1
        );
      }, 1200);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playbackMonth, maxMonths, setPlaybackMonth]);

  // Stop when reaching current
  useEffect(() => {
    if (playbackMonth >= 0 && isPlaying) {
      setIsPlaying(false);
    }
  }, [playbackMonth, isPlaying, setIsPlaying]);

  const handlePlay = useCallback(() => {
    if (playbackMonth >= 0) setPlaybackMonth(-maxMonths);
    setIsPlaying(!isPlaying);
  }, [isPlaying, playbackMonth, maxMonths, setIsPlaying, setPlaybackMonth]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setPlaybackMonth(0);
  }, [setIsPlaying, setPlaybackMonth]);

  const getMonthLabel = (offset: number): string => {
    if (offset >= 0) return 'Now';
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Theme Time-Lapse</h3>
        <div className="flex gap-1">
          {TIME_RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setTimeRange(r.value)}
              className={cn(
                'px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium transition-colors',
                timeRange === r.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={handlePlay}
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleReset}
          >
            <SkipBack className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex-1">
          <Slider
            value={[playbackMonth + maxMonths]}
            min={0}
            max={maxMonths}
            step={1}
            onValueChange={([v]) => {
              setIsPlaying(false);
              setPlaybackMonth(v - maxMonths);
            }}
          />
        </div>

        <Badge variant="outline" className="text-[10px] sm:text-xs min-w-[50px] justify-center">
          {getMonthLabel(playbackMonth)}
        </Badge>
      </div>

      {/* Month ticks */}
      <div className="flex justify-between mt-1 px-[52px]">
        {Array.from({ length: maxMonths + 1 }, (_, i) => (
          <span key={i} className="text-[8px] text-muted-foreground">
            {getMonthLabel(i - maxMonths)}
          </span>
        ))}
      </div>
    </div>
  );
}
