import { useState } from 'react';
import { format } from 'date-fns';
import {
  PlusCircle,
  Settings,
  Trash2,
  CalendarIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export interface PortfolioAsset {
  id: string;
  symbol: string;
  strategy: string;
  allocation: number;
  startDate: Date;
  endDate: Date;
  advancedSettings?: {
    stopLoss?: number;
    takeProfit?: number;
    rebalanceFrequency?: string;
    useTrailingStop?: boolean;
  };
}

const STRATEGIES = [
  { value: 'long-term-hold', label: 'Long-Term Hold' },
  { value: 'day-trading', label: 'Day Trading' },
  { value: 'covered-call', label: 'Covered Call' },
  { value: 'wheel-strategy', label: 'Wheel Strategy' },
  { value: 'mean-reversion', label: 'Mean Reversion' },
];

interface PortfolioSetupProps {
  assets: PortfolioAsset[];
  onAssetsChange: (assets: PortfolioAsset[]) => void;
}

export function PortfolioSetup({ assets, onAssetsChange }: PortfolioSetupProps) {
  const [deleteAssetId, setDeleteAssetId] = useState<string | null>(null);

  const totalAllocation = assets.reduce((sum, asset) => sum + asset.allocation, 0);
  const isValidAllocation = totalAllocation === 100;

  const addAsset = () => {
    const newAsset: PortfolioAsset = {
      id: crypto.randomUUID(),
      symbol: '',
      strategy: 'long-term-hold',
      allocation: 0,
      startDate: new Date(),
      endDate: new Date(),
      advancedSettings: {
        stopLoss: 10,
        takeProfit: 25,
        rebalanceFrequency: 'monthly',
        useTrailingStop: false,
      },
    };
    onAssetsChange([...assets, newAsset]);
  };

  const updateAsset = (id: string, updates: Partial<PortfolioAsset>) => {
    onAssetsChange(
      assets.map((asset) =>
        asset.id === id ? { ...asset, ...updates } : asset
      )
    );
  };

  const deleteAsset = (id: string) => {
    onAssetsChange(assets.filter((asset) => asset.id !== id));
    setDeleteAssetId(null);
  };

  const updateAdvancedSettings = (
    id: string,
    settings: Partial<PortfolioAsset['advancedSettings']>
  ) => {
    onAssetsChange(
      assets.map((asset) =>
        asset.id === id
          ? {
              ...asset,
              advancedSettings: { ...asset.advancedSettings, ...settings },
            }
          : asset
      )
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Portfolio Setup</CardTitle>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'text-sm font-medium px-3 py-1 rounded-full',
              isValidAllocation
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-destructive/10 text-destructive'
            )}
          >
            Total: {totalAllocation}%
          </div>
          <Button size="sm" onClick={addAsset}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="pb-3 font-medium">Asset</th>
                <th className="pb-3 font-medium">Strategy</th>
                <th className="pb-3 font-medium">Allocation (%)</th>
                <th className="pb-3 font-medium">Holding Start</th>
                <th className="pb-3 font-medium">Holding End</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    <Input
                      value={asset.symbol}
                      onChange={(e) =>
                        updateAsset(asset.id, { symbol: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g., AAPL"
                      className="w-24"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <Select
                      value={asset.strategy}
                      onValueChange={(value) =>
                        updateAsset(asset.id, { strategy: value })
                      }
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {STRATEGIES.map((strategy) => (
                          <SelectItem key={strategy.value} value={strategy.value}>
                            {strategy.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-3 pr-4">
                    <Input
                      type="number"
                      value={asset.allocation}
                      onChange={(e) =>
                        updateAsset(asset.id, {
                          allocation: Math.min(100, Math.max(0, Number(e.target.value))),
                        })
                      }
                      min={0}
                      max={100}
                      className="w-20"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            'w-[130px] justify-start text-left font-normal',
                            !asset.startDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {asset.startDate
                            ? format(asset.startDate, 'MMM d, yyyy')
                            : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-popover" align="start">
                        <Calendar
                          mode="single"
                          selected={asset.startDate}
                          onSelect={(date) =>
                            date && updateAsset(asset.id, { startDate: date })
                          }
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </td>
                  <td className="py-3 pr-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            'w-[130px] justify-start text-left font-normal',
                            !asset.endDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {asset.endDate
                            ? format(asset.endDate, 'MMM d, yyyy')
                            : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-popover" align="start">
                        <Calendar
                          mode="single"
                          selected={asset.endDate}
                          onSelect={(date) =>
                            date && updateAsset(asset.id, { endDate: date })
                          }
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 bg-popover" align="end">
                          <div className="space-y-4">
                            <h4 className="font-medium text-sm">Advanced Settings</h4>
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label className="text-xs">Stop Loss (%)</Label>
                                <div className="flex items-center gap-3">
                                  <Slider
                                    value={[asset.advancedSettings?.stopLoss ?? 10]}
                                    onValueChange={([value]) =>
                                      updateAdvancedSettings(asset.id, { stopLoss: value })
                                    }
                                    max={50}
                                    step={1}
                                    className="flex-1"
                                  />
                                  <span className="text-sm w-10 text-right">
                                    {asset.advancedSettings?.stopLoss ?? 10}%
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Take Profit (%)</Label>
                                <div className="flex items-center gap-3">
                                  <Slider
                                    value={[asset.advancedSettings?.takeProfit ?? 25]}
                                    onValueChange={([value]) =>
                                      updateAdvancedSettings(asset.id, { takeProfit: value })
                                    }
                                    max={100}
                                    step={1}
                                    className="flex-1"
                                  />
                                  <span className="text-sm w-10 text-right">
                                    {asset.advancedSettings?.takeProfit ?? 25}%
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Rebalance Frequency</Label>
                                <Select
                                  value={asset.advancedSettings?.rebalanceFrequency ?? 'monthly'}
                                  onValueChange={(value) =>
                                    updateAdvancedSettings(asset.id, {
                                      rebalanceFrequency: value,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover">
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="quarterly">Quarterly</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Use Trailing Stop</Label>
                                <Switch
                                  checked={asset.advancedSettings?.useTrailingStop ?? false}
                                  onCheckedChange={(checked) =>
                                    updateAdvancedSettings(asset.id, {
                                      useTrailingStop: checked,
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteAssetId(asset.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No assets added. Click "Add Asset" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      <AlertDialog open={!!deleteAssetId} onOpenChange={() => setDeleteAssetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this asset from your portfolio? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAssetId && deleteAsset(deleteAssetId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
