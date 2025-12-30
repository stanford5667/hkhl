import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SourcedField } from './SourcedField';
import { FileText, Globe, Users, TrendingUp, Target, Briefcase, Loader2 } from 'lucide-react';
import { useExtractedFields } from '@/hooks/useExtractedFields';

interface ExtractedFieldsDisplayProps {
  companyId: string;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  company_info: { icon: Briefcase, label: 'Company Info', color: 'text-blue-500' },
  team: { icon: Users, label: 'Leadership & Team', color: 'text-purple-500' },
  financials: { icon: TrendingUp, label: 'Financials', color: 'text-emerald-500' },
  market: { icon: Globe, label: 'Market', color: 'text-amber-500' },
  customers: { icon: Target, label: 'Customers', color: 'text-rose-500' },
  deal: { icon: FileText, label: 'Deal Info', color: 'text-cyan-500' },
};

export function ExtractedFieldsDisplay({ companyId }: ExtractedFieldsDisplayProps) {
  const { fieldsByCategory, loading, fields } = useExtractedFields(companyId);

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (fields.length === 0) {
    return null; // Don't show anything if no extracted fields
  }

  const categories = Object.keys(fieldsByCategory).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Extracted Data ({fields.length} fields)
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map(category => {
          const config = CATEGORY_CONFIG[category] || { 
            icon: FileText, 
            label: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            color: 'text-muted-foreground'
          };
          const CategoryIcon = config.icon;
          const categoryFields = fieldsByCategory[category];

          return (
            <Card key={category} className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CategoryIcon className={`h-4 w-4 ${config.color}`} />
                  {config.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {categoryFields.map(field => (
                  <SourcedField
                    key={field.fieldName}
                    fieldName={field.fieldName}
                    label={field.label}
                    value={field.value}
                    type={field.type}
                    unit={field.unit}
                    sourceType={field.sourceType}
                    sourceName={field.sourceName}
                    sourceExcerpt={field.sourceExcerpt}
                    confidence={field.confidence}
                    isVerified={field.isVerified}
                  />
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
