import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowBigUp, ArrowBigDown } from 'lucide-react';

interface VoteButtonsProps {
  score: number;
  userVote: 1 | -1 | null;
  onVote: (voteType: 1 | -1) => void;
  vertical?: boolean;
  size?: 'sm' | 'default';
}

export function VoteButtons({ 
  score, 
  userVote, 
  onVote, 
  vertical = false,
  size = 'default'
}: VoteButtonsProps) {
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const buttonSize = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';

  return (
    <div className={cn(
      "flex items-center gap-1",
      vertical && "flex-col"
    )}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          buttonSize,
          userVote === 1 && "text-green-500 bg-green-500/10 hover:bg-green-500/20 hover:text-green-500"
        )}
        onClick={() => onVote(1)}
      >
        <ArrowBigUp className={cn(
          iconSize,
          userVote === 1 && "fill-current"
        )} />
      </Button>

      <span className={cn(
        "font-semibold text-sm min-w-[2ch] text-center",
        score > 0 && "text-green-500",
        score < 0 && "text-red-500"
      )}>
        {score}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          buttonSize,
          userVote === -1 && "text-red-500 bg-red-500/10 hover:bg-red-500/20 hover:text-red-500"
        )}
        onClick={() => onVote(-1)}
      >
        <ArrowBigDown className={cn(
          iconSize,
          userVote === -1 && "fill-current"
        )} />
      </Button>
    </div>
  );
}
