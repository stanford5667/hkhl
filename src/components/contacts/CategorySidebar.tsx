import { ContactCategory } from '@/hooks/useContacts';
import { cn } from '@/lib/utils';
import {
  Landmark,
  UserCircle,
  Users2,
  Scale,
  Package,
  UserCog,
  MoreHorizontal,
} from 'lucide-react';

interface CategorySidebarProps {
  selectedCategory: ContactCategory | 'all';
  onSelect: (category: ContactCategory | 'all') => void;
  counts: Record<ContactCategory | 'all', number>;
}

const categories: { value: ContactCategory | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All Contacts', icon: <Users2 className="h-4 w-4" /> },
  { value: 'lender', label: 'Lenders', icon: <Landmark className="h-4 w-4" /> },
  { value: 'executive', label: 'Executives', icon: <UserCircle className="h-4 w-4" /> },
  { value: 'board', label: 'Board Members', icon: <Users2 className="h-4 w-4" /> },
  { value: 'legal', label: 'Legal', icon: <Scale className="h-4 w-4" /> },
  { value: 'vendor', label: 'Vendors', icon: <Package className="h-4 w-4" /> },
  { value: 'team', label: 'Team Members', icon: <UserCog className="h-4 w-4" /> },
  { value: 'other', label: 'Other', icon: <MoreHorizontal className="h-4 w-4" /> },
];

export function CategorySidebar({ selectedCategory, onSelect, counts }: CategorySidebarProps) {
  return (
    <div className="w-56 shrink-0 space-y-1">
      <h3 className="text-xs font-medium text-muted-foreground/50 uppercase tracking-wider px-3 mb-3">
        Categories
      </h3>
      {categories.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onSelect(cat.value)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
            selectedCategory === cat.value
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {cat.icon}
          <span className="flex-1 text-left">{cat.label}</span>
          <span className="text-xs tabular-nums opacity-70">{counts[cat.value] || 0}</span>
        </button>
      ))}
    </div>
  );
}
