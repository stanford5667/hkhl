import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentRecord } from '@/hooks/useDocuments';

interface ChecklistItem {
  id: string;
  name: string;
  category: string;
  keywords: string[];
}

const REQUIRED_DOCUMENTS: ChecklistItem[] = [
  // Financial
  { id: 'historical-3yr', name: '3 Years Historical Financials', category: 'Financial', keywords: ['historical', 'financials', 'income statement', 'p&l', 'balance sheet'] },
  { id: 'monthly-financials', name: 'Monthly Financial Statements', category: 'Financial', keywords: ['monthly', 'statement', 'financials'] },
  { id: 'budget-forecast', name: 'Budget & Forecast', category: 'Financial', keywords: ['budget', 'forecast', 'projection'] },
  { id: 'audit-reports', name: 'Audit Reports', category: 'Financial', keywords: ['audit', 'audited'] },
  { id: 'tax-returns', name: 'Tax Returns (3 Years)', category: 'Financial', keywords: ['tax', 'return', '1120'] },
  
  // Legal
  { id: 'cap-table', name: 'Cap Table', category: 'Legal', keywords: ['cap table', 'capitalization', 'equity', 'ownership'] },
  { id: 'corporate-docs', name: 'Corporate Formation Documents', category: 'Legal', keywords: ['articles', 'incorporation', 'bylaws', 'certificate'] },
  { id: 'contracts', name: 'Material Contracts', category: 'Legal', keywords: ['contract', 'agreement', 'material'] },
  
  // Commercial
  { id: 'customer-list', name: 'Customer List & Analysis', category: 'Commercial', keywords: ['customer', 'client', 'analysis', 'revenue'] },
  { id: 'sales-pipeline', name: 'Sales Pipeline', category: 'Commercial', keywords: ['pipeline', 'sales', 'opportunity'] },
  
  // Operations
  { id: 'org-chart', name: 'Org Chart', category: 'Operations', keywords: ['org', 'organization', 'chart', 'structure'] },
  { id: 'employee-list', name: 'Employee Census', category: 'Operations', keywords: ['employee', 'census', 'headcount', 'staff'] },
  
  // Deal Documents
  { id: 'cim', name: 'CIM / Teaser', category: 'Deal Documents', keywords: ['cim', 'teaser', 'memorandum', 'confidential information'] },
  { id: 'management-presentation', name: 'Management Presentation', category: 'Deal Documents', keywords: ['management', 'presentation', 'deck'] },
];

interface DataRoomChecklistProps {
  documents: DocumentRecord[];
  className?: string;
}

export function DataRoomChecklist({ documents, className }: DataRoomChecklistProps) {
  const { completedItems, progress, categoryCounts } = useMemo(() => {
    const completed = new Set<string>();
    
    // Match documents to checklist items
    REQUIRED_DOCUMENTS.forEach((item) => {
      const hasMatch = documents.some((doc) => {
        const docName = doc.name.toLowerCase();
        return item.keywords.some((keyword) => docName.includes(keyword.toLowerCase()));
      });
      if (hasMatch) {
        completed.add(item.id);
      }
    });

    // Calculate category counts
    const categories = [...new Set(REQUIRED_DOCUMENTS.map((i) => i.category))];
    const counts: Record<string, { completed: number; total: number }> = {};
    
    categories.forEach((cat) => {
      const catItems = REQUIRED_DOCUMENTS.filter((i) => i.category === cat);
      const catCompleted = catItems.filter((i) => completed.has(i.id)).length;
      counts[cat] = { completed: catCompleted, total: catItems.length };
    });

    return {
      completedItems: completed,
      progress: Math.round((completed.size / REQUIRED_DOCUMENTS.length) * 100),
      categoryCounts: counts,
    };
  }, [documents]);

  const categories = [...new Set(REQUIRED_DOCUMENTS.map((i) => i.category))];

  return (
    <Card className={cn('glass-card', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCheck className="h-5 w-5 text-primary" />
            Data Room Checklist
          </CardTitle>
          <span className="text-sm font-medium text-muted-foreground">
            {completedItems.size}/{REQUIRED_DOCUMENTS.length}
          </span>
        </div>
        <div className="space-y-1 pt-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {progress}% Complete
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((category) => {
          const items = REQUIRED_DOCUMENTS.filter((i) => i.category === category);
          const counts = categoryCounts[category];
          const isComplete = counts.completed === counts.total;

          return (
            <div key={category}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-foreground">{category}</h4>
                <span className={cn(
                  'text-xs',
                  isComplete ? 'text-success' : 'text-muted-foreground'
                )}>
                  {counts.completed}/{counts.total}
                </span>
              </div>
              <div className="space-y-1">
                {items.map((item) => {
                  const isCompleted = completedItems.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 py-1"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      )}
                      <span
                        className={cn(
                          'text-sm truncate',
                          isCompleted ? 'text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
