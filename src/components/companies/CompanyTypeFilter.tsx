import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type CompanyType = 'pipeline' | 'portfolio' | 'prospect' | 'passed' | 'all';

interface CompanyTypeFilterProps {
  value: CompanyType;
  onChange: (value: CompanyType) => void;
}

export function CompanyTypeFilter({ value, onChange }: CompanyTypeFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as CompanyType)}>
      <SelectTrigger className="w-[140px] bg-card border-border">
        <SelectValue placeholder="Type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Types</SelectItem>
        <SelectItem value="pipeline">Pipeline</SelectItem>
        <SelectItem value="portfolio">Portfolio</SelectItem>
        <SelectItem value="prospect">Prospect</SelectItem>
        <SelectItem value="passed">Passed</SelectItem>
      </SelectContent>
    </Select>
  );
}
