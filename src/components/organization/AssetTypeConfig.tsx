import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { 
  Briefcase, 
  TrendingUp, 
  Building, 
  CreditCard, 
  Package,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssetTypeConfigProps {
  enabledTypes: string[];
  onUpdate: (types: string[]) => void;
  disabled?: boolean;
}

interface AssetTypeInfo {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  configOptions?: {
    id: string;
    label: string;
    type: 'toggle' | 'select' | 'list';
    options?: { value: string; label: string }[];
    default?: string | boolean;
  }[];
}

const ASSET_TYPES: AssetTypeInfo[] = [
  {
    id: 'private_equity',
    name: 'Private Equity',
    description: 'Deals, pipeline, and portfolio companies',
    icon: Briefcase,
    color: 'text-purple-400 bg-purple-400/10',
    configOptions: [
      {
        id: 'pipeline_stages',
        label: 'Default pipeline stages',
        type: 'list',
        default: 'Sourcing, Initial Review, Due Diligence, IC Review, Closing',
      },
    ],
  },
  {
    id: 'public_equity',
    name: 'Public Equities',
    description: 'Stocks and ETFs with real-time prices',
    icon: TrendingUp,
    color: 'text-emerald-400 bg-emerald-400/10',
    configOptions: [
      {
        id: 'enable_realtime',
        label: 'Enable real-time quotes',
        type: 'toggle',
        default: true,
      },
      {
        id: 'default_exchange',
        label: 'Default exchange',
        type: 'select',
        options: [
          { value: 'NYSE', label: 'NYSE' },
          { value: 'NASDAQ', label: 'NASDAQ' },
          { value: 'LSE', label: 'London Stock Exchange' },
          { value: 'TSE', label: 'Tokyo Stock Exchange' },
        ],
        default: 'NYSE',
      },
    ],
  },
  {
    id: 'real_estate',
    name: 'Real Estate',
    description: 'Properties and REITs',
    icon: Building,
    color: 'text-amber-400 bg-amber-400/10',
  },
  {
    id: 'credit',
    name: 'Credit',
    description: 'Loans and bonds',
    icon: CreditCard,
    color: 'text-blue-400 bg-blue-400/10',
  },
  {
    id: 'other',
    name: 'Other Assets',
    description: 'Custom asset types',
    icon: Package,
    color: 'text-slate-400 bg-slate-400/10',
  },
];

export function AssetTypeConfig({ enabledTypes, onUpdate, disabled }: AssetTypeConfigProps) {
  const { currentOrganization } = useOrganization();
  const [assetCounts, setAssetCounts] = useState<Record<string, number>>({});
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [typeSettings, setTypeSettings] = useState<Record<string, Record<string, unknown>>>({});

  useEffect(() => {
    fetchAssetCounts();
  }, [currentOrganization?.id]);

  const fetchAssetCounts = async () => {
    if (!currentOrganization?.id) return;

    const { data, error } = await supabase
      .from('companies')
      .select('asset_class')
      .or(`organization_id.eq.${currentOrganization.id},user_id.eq.${currentOrganization.id}`);

    if (!error && data) {
      const counts: Record<string, number> = {};
      data.forEach((item: any) => {
        const assetClass = item.asset_class || 'private_equity';
        counts[assetClass] = (counts[assetClass] || 0) + 1;
      });
      setAssetCounts(counts);
    }
  };

  const handleToggle = (typeId: string, checked: boolean) => {
    if (checked) {
      onUpdate([...enabledTypes, typeId]);
    } else {
      onUpdate(enabledTypes.filter(t => t !== typeId));
    }
  };

  const toggleExpand = (typeId: string) => {
    if (expandedType === typeId) {
      setExpandedType(null);
    } else {
      setExpandedType(typeId);
    }
  };

  return (
    <div className="space-y-3">
      {ASSET_TYPES.map((assetType) => {
        const isEnabled = enabledTypes.includes(assetType.id);
        const count = assetCounts[assetType.id] || 0;
        const Icon = assetType.icon;
        const hasConfig = assetType.configOptions && assetType.configOptions.length > 0;
        const isExpanded = expandedType === assetType.id && isEnabled && hasConfig;

        return (
          <Card 
            key={assetType.id} 
            className={cn(
              "bg-slate-800/50 border-slate-700 transition-all",
              isEnabled && "border-slate-600 bg-slate-800"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={cn("p-2 rounded-lg", assetType.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{assetType.name}</span>
                      {count > 0 && (
                        <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                          {count} asset{count !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 truncate">{assetType.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {hasConfig && isEnabled && (
                    <button
                      onClick={() => toggleExpand(assetType.id)}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggle(assetType.id, checked)}
                    disabled={disabled}
                  />
                </div>
              </div>

              {/* Config Options */}
              {isExpanded && assetType.configOptions && (
                <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
                  {assetType.configOptions.map((option) => (
                    <div key={option.id} className="flex items-center justify-between">
                      <Label className="text-sm text-slate-300">{option.label}</Label>
                      
                      {option.type === 'toggle' && (
                        <Switch
                          defaultChecked={option.default as boolean}
                          disabled={disabled}
                          onCheckedChange={(checked) => {
                            setTypeSettings(prev => ({
                              ...prev,
                              [assetType.id]: {
                                ...prev[assetType.id],
                                [option.id]: checked,
                              },
                            }));
                          }}
                        />
                      )}

                      {option.type === 'select' && option.options && (
                        <Select
                          defaultValue={option.default as string}
                          disabled={disabled}
                          onValueChange={(value) => {
                            setTypeSettings(prev => ({
                              ...prev,
                              [assetType.id]: {
                                ...prev[assetType.id],
                                [option.id]: value,
                              },
                            }));
                          }}
                        >
                          <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {option.options.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {option.type === 'list' && (
                        <Input
                          defaultValue={option.default as string}
                          disabled={disabled}
                          className="w-64 bg-slate-700 border-slate-600 text-sm"
                          placeholder="Comma-separated values"
                          onChange={(e) => {
                            setTypeSettings(prev => ({
                              ...prev,
                              [assetType.id]: {
                                ...prev[assetType.id],
                                [option.id]: e.target.value,
                              },
                            }));
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
