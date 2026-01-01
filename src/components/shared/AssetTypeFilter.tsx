import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrganization, AssetType } from '@/contexts/OrganizationContext';
import { cn } from '@/lib/utils';
import { 
  Briefcase, 
  TrendingUp, 
  Building, 
  CreditCard, 
  Package,
  Layers
} from 'lucide-react';

const ASSET_TYPE_CONFIG: Record<AssetType | 'all', { 
  label: string; 
  icon: React.ElementType; 
  color: string;
}> = {
  all: { 
    label: 'All Assets', 
    icon: Layers, 
    color: 'bg-slate-600 text-white' 
  },
  private_equity: { 
    label: 'Private Equity', 
    icon: Briefcase, 
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' 
  },
  public_equity: { 
    label: 'Public Equities', 
    icon: TrendingUp, 
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
  },
  real_estate: { 
    label: 'Real Estate', 
    icon: Building, 
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
  },
  credit: { 
    label: 'Credit', 
    icon: CreditCard, 
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
  },
  other: { 
    label: 'Other', 
    icon: Package, 
    color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' 
  },
};

const STORAGE_KEY = 'assetTypeFilter';

interface AssetTypeFilterProps {
  onChange?: (assetType: AssetType | 'all') => void;
  className?: string;
  compact?: boolean;
}

export function AssetTypeFilter({ onChange, className, compact = false }: AssetTypeFilterProps) {
  const { enabledAssetTypes } = useOrganization();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial value from URL params or localStorage
  const getInitialValue = (): AssetType | 'all' => {
    const urlParam = searchParams.get('assetType');
    if (urlParam && (urlParam === 'all' || enabledAssetTypes.includes(urlParam as AssetType))) {
      return urlParam as AssetType | 'all';
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (stored === 'all' || enabledAssetTypes.includes(stored as AssetType))) {
      return stored as AssetType | 'all';
    }
    return 'all';
  };

  const [selected, setSelected] = useState<AssetType | 'all'>(getInitialValue);

  // Update URL params and localStorage when selection changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selected);
    const newParams = new URLSearchParams(searchParams);
    if (selected === 'all') {
      newParams.delete('assetType');
    } else {
      newParams.set('assetType', selected);
    }
    setSearchParams(newParams, { replace: true });
    onChange?.(selected);
  }, [selected, onChange, searchParams, setSearchParams]);

  // If only one asset type is enabled, don't show the filter
  if (enabledAssetTypes.length <= 1) {
    return null;
  }

  const availableTypes: (AssetType | 'all')[] = ['all', ...enabledAssetTypes];

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      {availableTypes.map((type) => {
        const config = ASSET_TYPE_CONFIG[type];
        const Icon = config.icon;
        const isActive = selected === type;

        return (
          <motion.button
            key={type}
            onClick={() => setSelected(type)}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
              isActive 
                ? config.color
                : "bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-300"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <AnimatePresence mode="wait">
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute inset-0 rounded-full bg-current opacity-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </AnimatePresence>
            
            <Icon className={cn("h-3.5 w-3.5", compact && "h-4 w-4")} />
            {!compact && <span>{config.label}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}

// Hook to use the current asset type filter
export function useAssetTypeFilter(): AssetType | 'all' {
  const [searchParams] = useSearchParams();
  const { enabledAssetTypes } = useOrganization();
  
  const urlParam = searchParams.get('assetType');
  if (urlParam && (urlParam === 'all' || enabledAssetTypes.includes(urlParam as AssetType))) {
    return urlParam as AssetType | 'all';
  }
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && (stored === 'all' || enabledAssetTypes.includes(stored as AssetType))) {
    return stored as AssetType | 'all';
  }
  
  return 'all';
}
