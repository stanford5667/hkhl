import { cn } from '@/lib/utils';

interface CompanyAvatarProps {
  company: { name: string; website?: string | null };
  size?: 'sm' | 'md' | 'lg';
}

export function CompanyAvatar({ company, size = 'md' }: CompanyAvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-lg',
  };

  const initial = company.name.charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        'rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center font-semibold text-slate-300 border border-slate-600/50',
        sizeClasses[size]
      )}
    >
      {initial}
    </div>
  );
}
