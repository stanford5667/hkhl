import { useLocation, Link } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, BookOpen, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const academyTabs = [
  { id: 'courses', label: 'Courses', href: '/academy', icon: GraduationCap },
  // Study Materials tab hidden per user request
  // { id: 'materials', label: 'Study Materials', href: '/academy/materials', icon: FileText },
];

export function AcademyTabs() {
  const location = useLocation();
  
  const getCurrentTab = () => {
    if (location.pathname === '/academy/materials') return 'materials';
    return 'courses';
  };

  return (
    <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4">
        <nav className="flex items-center gap-1 overflow-x-auto py-2">
          {academyTabs.map(({ id, label, href, icon: Icon }) => {
            const isActive = getCurrentTab() === id;
            return (
              <Link
                key={id}
                to={href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
