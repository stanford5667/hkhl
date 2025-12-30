import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ContactChipProps {
  contact: {
    id: string;
    first_name: string;
    last_name: string;
    title?: string | null;
    avatar_url?: string | null;
  };
  size?: 'sm' | 'md';
  showRole?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ContactChip({ contact, size = 'md', showRole = true, onClick, className }: ContactChipProps) {
  const fullName = `${contact.first_name} ${contact.last_name}`;
  const initials = `${contact.first_name.charAt(0)}${contact.last_name.charAt(0)}`;
  
  return (
    <div 
      className={cn(
        "flex items-center gap-2",
        onClick && "cursor-pointer hover:bg-slate-800/50 rounded-lg p-1 -m-1 transition-colors",
        size === 'sm' && "text-sm",
        size === 'md' && "text-base",
        className
      )}
      onClick={onClick}
    >
      <Avatar className={size === 'sm' ? "h-6 w-6" : "h-8 w-8"}>
        <AvatarImage src={contact.avatar_url || undefined} />
        <AvatarFallback className={cn(
          "bg-gradient-to-br from-purple-500 to-indigo-600",
          size === 'sm' ? "text-[10px]" : "text-xs"
        )}>
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <span className="text-foreground truncate block">{fullName}</span>
        {showRole && contact.title && (
          <span className="text-muted-foreground text-xs truncate block">{contact.title}</span>
        )}
      </div>
    </div>
  );
}
