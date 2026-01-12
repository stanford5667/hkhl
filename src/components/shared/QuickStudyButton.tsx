import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FlaskConical, Gauge, LineChart, TrendingUp, Calendar, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickStudyButtonProps {
  ticker: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
  showLabel?: boolean;
}

export function QuickStudyButton({ 
  ticker, 
  variant = 'ghost', 
  size = 'icon',
  showLabel = false 
}: QuickStudyButtonProps) {
  const navigate = useNavigate();

  const runStudy = (studyId: string) => {
    navigate(`/quant-lab?ticker=${ticker}&study=${studyId}`);
  };

  const openQuantLab = () => {
    navigate(`/quant-lab?ticker=${ticker}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} title="Run Studies" className="gap-1.5">
          <FlaskConical className="h-4 w-4" />
          {showLabel && <span>Studies</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => runStudy('rsi_analysis')}>
          <Gauge className="h-4 w-4 mr-2 text-emerald-500" />
          RSI Analysis
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => runStudy('moving_average_analysis')}>
          <LineChart className="h-4 w-4 mr-2 text-blue-500" />
          Moving Averages
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => runStudy('trend_strength')}>
          <TrendingUp className="h-4 w-4 mr-2 text-violet-500" />
          Trend Strength
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => runStudy('day_of_week_returns')}>
          <Calendar className="h-4 w-4 mr-2 text-amber-500" />
          Seasonality
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => runStudy('volatility_analysis')}>
          <Zap className="h-4 w-4 mr-2 text-rose-500" />
          Volatility
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={openQuantLab}>
          <FlaskConical className="h-4 w-4 mr-2 text-primary" />
          Open Quant Lab
          <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
