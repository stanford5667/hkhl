import { format, isToday, isTomorrow, isPast, addDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateDisplayProps {
  date: string | Date | null | undefined;
  showRelative?: boolean;
  showOverdue?: boolean;
  className?: string;
}

export function DateDisplay({ 
  date, 
  showRelative = true, 
  showOverdue = true,
  className 
}: DateDisplayProps) {
  if (!date) return null;
  
  const d = new Date(date);
  const isOverdue = isPast(d) && showOverdue && !isToday(d);
  const today = isToday(d);
  const tomorrow = isTomorrow(d);
  
  let display = format(d, 'MMM d');
  if (showRelative) {
    if (today) display = 'Today';
    else if (tomorrow) display = 'Tomorrow';
    else if (isSameDay(d, addDays(new Date(), -1))) display = 'Yesterday';
  }
  
  return (
    <span className={cn(
      "text-sm",
      isOverdue && "text-rose-400",
      today && !isOverdue && "text-blue-400",
      tomorrow && "text-amber-400",
      !isOverdue && !today && !tomorrow && "text-muted-foreground",
      className
    )}>
      {display}
    </span>
  );
}
