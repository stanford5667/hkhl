/**
 * Market Data Table Component
 * 
 * Displays market indicators in a sortable, filterable table format
 * with quick study actions for each data point.
 */

import React, { useState, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Search,
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Minus,
  LineChart,
  Gauge,
  Calendar,
  Zap,
  ArrowRight,
  Table as TableIcon,
  LayoutGrid,
  ExternalLink,
  MoreHorizontal,
  Eye,
  Star,
  StarOff,
  Shield,
  Target,
  Volume2,
  Layers,
  Settings2,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { StudyBuilderSheet, STUDY_CONFIG } from './StudyBuilderPanel';

export interface MarketDataRow {
  id: string;
  symbol: string;
  name: string;
  currentValue: number | string;
  previousValue?: number | string;
  change?: number;
  changePercent?: number;
  category: string;
  type: 'rate' | 'economic' | 'index' | 'commodity' | 'forex' | 'crypto' | 'bond';
  unit?: string;
  lastUpdated?: string;
  description?: string;
  importance?: 'high' | 'medium' | 'low';
}

interface MarketDataTableProps {
  data: MarketDataRow[];
  title?: string;
  onRowClick?: (row: MarketDataRow) => void;
  showStudyActions?: boolean;
  compact?: boolean;
}

type SortField = 'name' | 'currentValue' | 'change' | 'changePercent' | 'category';
type SortDirection = 'asc' | 'desc';

export function MarketDataTable({ 
  data, 
  title = 'Market Data',
  onRowClick,
  showStudyActions = true,
  compact = false,
}: MarketDataTableProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data.filter(row => {
      const searchLower = search.toLowerCase();
      return (
        row.name.toLowerCase().includes(searchLower) ||
        row.symbol.toLowerCase().includes(searchLower) ||
        row.category.toLowerCase().includes(searchLower)
      );
    });

    // Sort favorites first, then by selected field
    filtered.sort((a, b) => {
      // Favorites first
      const aFav = favorites.has(a.id) ? 0 : 1;
      const bFav = favorites.has(b.id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;

      // Then by selected field
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle numeric comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // String comparison
      aVal = String(aVal ?? '').toLowerCase();
      bVal = String(bVal ?? '').toLowerCase();
      
      if (sortDirection === 'asc') {
        return aVal.localeCompare(bVal);
      }
      return bVal.localeCompare(aVal);
    });

    return filtered;
  }, [data, search, sortField, sortDirection, favorites]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const runStudy = (symbol: string, studyId: string) => {
    navigate(`/quant-lab?ticker=${symbol}&study=${studyId}`);
  };

  const openQuantLab = (symbol: string) => {
    navigate(`/quant-lab?ticker=${symbol}`);
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="h-3 w-3 text-primary" />
          ) : (
            <ArrowDown className="h-3 w-3 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />
        )}
      </div>
    </TableHead>
  );

  const getChangeIndicator = (change?: number) => {
    if (!change || change === 0) {
      return { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted/50' };
    }
    if (change > 0) {
      return { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    }
    return { icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10' };
  };

  const formatValue = (value: number | string, unit?: string) => {
    if (typeof value === 'string') return value;
    if (unit === '%') return `${value.toFixed(2)}%`;
    if (unit === '$') return `$${value.toLocaleString()}`;
    if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(2);
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TableIcon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {processedData.length} items
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 w-40 sm:w-56"
              />
            </div>
            
            {/* View Toggle */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-2 rounded-r-none"
                onClick={() => setViewMode('table')}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-2 rounded-l-none"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {viewMode === 'table' ? (
          <div className="rounded-md border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-10"></TableHead>
                    <SortHeader field="name">Name</SortHeader>
                    <SortHeader field="currentValue">Value</SortHeader>
                    <SortHeader field="change">Change</SortHeader>
                    <SortHeader field="category">Category</SortHeader>
                    {showStudyActions && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={showStudyActions ? 6 : 5} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Search className="h-8 w-8 opacity-50" />
                          <p>No data found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    processedData.map((row) => {
                      const changeInfo = getChangeIndicator(row.change);
                      const ChangeIcon = changeInfo.icon;
                      const isFavorite = favorites.has(row.id);

                      return (
                        <TableRow 
                          key={row.id}
                          className={cn(
                            "cursor-pointer transition-colors",
                            isFavorite && "bg-primary/5"
                          )}
                          onClick={() => onRowClick?.(row)}
                        >
                          {/* Favorite */}
                          <TableCell className="w-10">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(row.id);
                              }}
                            >
                              {isFavorite ? (
                                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                              ) : (
                                <StarOff className="h-4 w-4 text-muted-foreground opacity-50 hover:opacity-100" />
                              )}
                            </Button>
                          </TableCell>

                          {/* Name */}
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{row.name}</span>
                              <span className="text-xs text-muted-foreground font-mono">{row.symbol}</span>
                            </div>
                          </TableCell>

                          {/* Value */}
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-mono font-semibold">
                                    {formatValue(row.currentValue, row.unit)}
                                  </span>
                                </TooltipTrigger>
                                {row.previousValue && (
                                  <TooltipContent>
                                    <p>Previous: {formatValue(row.previousValue, row.unit)}</p>
                                    {row.lastUpdated && (
                                      <p className="text-xs text-muted-foreground">Updated: {row.lastUpdated}</p>
                                    )}
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>

                          {/* Change */}
                          <TableCell>
                            <div className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                              changeInfo.bg, changeInfo.color
                            )}>
                              <ChangeIcon className="h-3 w-3" />
                              {row.change !== undefined ? (
                                <>
                                  {row.change > 0 ? '+' : ''}
                                  {row.change.toFixed(2)}
                                  {row.changePercent !== undefined && (
                                    <span className="opacity-70">
                                      ({row.changePercent > 0 ? '+' : ''}{row.changePercent.toFixed(1)}%)
                                    </span>
                                  )}
                                </>
                              ) : (
                                'N/A'
                              )}
                            </div>
                          </TableCell>

                          {/* Category */}
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">
                              {row.category}
                            </Badge>
                          </TableCell>

                          {/* Actions */}
                          {showStudyActions && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => onRowClick?.(row)}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View Details</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 gap-1"
                                    >
                                      <FlaskConical className="h-4 w-4 text-primary" />
                                      <span className="text-xs hidden sm:inline">Studies</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56">
                                    {/* Quick Studies */}
                                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                      Quick Studies
                                    </div>
                                    <DropdownMenuItem onClick={() => runStudy(row.symbol, 'rsi_analysis')}>
                                      <Gauge className="h-4 w-4 mr-2 text-emerald-500" />
                                      RSI Analysis
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => runStudy(row.symbol, 'moving_average_analysis')}>
                                      <LineChart className="h-4 w-4 mr-2 text-blue-500" />
                                      Moving Averages
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => runStudy(row.symbol, 'volatility_analysis')}>
                                      <Zap className="h-4 w-4 mr-2 text-rose-500" />
                                      Volatility Profile
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuSeparator />
                                    
                                    {/* Categories Submenu */}
                                    {STUDY_CONFIG.categories.slice(0, 4).map((cat) => {
                                      const CatIcon = cat.icon;
                                      const catStudies = STUDY_CONFIG.studies.filter(s => s.category === cat.id);
                                      
                                      return (
                                        <DropdownMenuSub key={cat.id}>
                                          <DropdownMenuSubTrigger>
                                            <CatIcon className={cn("h-4 w-4 mr-2", cat.color)} />
                                            {cat.name}
                                          </DropdownMenuSubTrigger>
                                          <DropdownMenuSubContent className="w-48">
                                            {catStudies.map((study) => {
                                              const StudyIcon = study.icon;
                                              return (
                                                <DropdownMenuItem 
                                                  key={study.id}
                                                  onClick={() => runStudy(row.symbol, study.id)}
                                                >
                                                  <StudyIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                                                  {study.name}
                                                </DropdownMenuItem>
                                              );
                                            })}
                                          </DropdownMenuSubContent>
                                        </DropdownMenuSub>
                                      );
                                    })}
                                    
                                    <DropdownMenuSeparator />
                                    
                                    {/* Presets */}
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger>
                                        <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
                                        Quick Presets
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent className="w-52">
                                        {STUDY_CONFIG.presets.map((preset) => {
                                          const PresetIcon = preset.icon;
                                          return (
                                            <DropdownMenuItem 
                                              key={preset.id}
                                              onClick={() => {
                                                const params = new URLSearchParams({
                                                  ticker: row.symbol,
                                                  studies: preset.studies.join(','),
                                                });
                                                navigate(`/quant-lab?${params.toString()}`);
                                              }}
                                            >
                                              <PresetIcon className="h-4 w-4 mr-2 text-primary" />
                                              <div className="flex-1 min-w-0">
                                                <div className="text-sm">{preset.name}</div>
                                                <div className="text-xs text-muted-foreground">{preset.studies.length} studies</div>
                                              </div>
                                            </DropdownMenuItem>
                                          );
                                        })}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    
                                    <DropdownMenuSeparator />
                                    
                                    <DropdownMenuItem onClick={() => openQuantLab(row.symbol)}>
                                      <FlaskConical className="h-4 w-4 mr-2 text-primary" />
                                      Open Quant Lab
                                      <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground" />
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                
                                {/* Advanced Study Builder */}
                                <StudyBuilderSheet
                                  symbol={row.symbol}
                                  symbolName={row.name}
                                  trigger={
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <Settings2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  }
                                />
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {processedData.map((row) => {
              const changeInfo = getChangeIndicator(row.change);
              const ChangeIcon = changeInfo.icon;
              const isFavorite = favorites.has(row.id);

              return (
                <div
                  key={row.id}
                  className={cn(
                    "group p-4 rounded-lg border border-border/50 cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
                    isFavorite && "border-amber-500/30 bg-amber-500/5"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs capitalize shrink-0">
                          {row.category}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(row.id);
                          }}
                        >
                          {isFavorite ? (
                            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                          ) : (
                            <StarOff className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                          )}
                        </Button>
                      </div>
                      <h4 className="font-medium mt-1 truncate">{row.name}</h4>
                      <p className="text-xs text-muted-foreground font-mono">{row.symbol}</p>
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold font-mono">
                        {formatValue(row.currentValue, row.unit)}
                      </p>
                      <div className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium mt-1",
                        changeInfo.color
                      )}>
                        <ChangeIcon className="h-3 w-3" />
                        {row.change !== undefined ? (
                          <>
                            {row.change > 0 ? '+' : ''}{row.change.toFixed(2)}
                            {row.changePercent !== undefined && (
                              <span className="opacity-70">
                                ({row.changePercent > 0 ? '+' : ''}{row.changePercent.toFixed(1)}%)
                              </span>
                            )}
                          </>
                        ) : (
                          'N/A'
                        )}
                      </div>
                    </div>

                    {showStudyActions && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 gap-1">
                              <FlaskConical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                              Quick Studies
                            </div>
                            <DropdownMenuItem onClick={() => runStudy(row.symbol, 'rsi_analysis')}>
                              <Gauge className="h-4 w-4 mr-2 text-emerald-500" />
                              RSI Analysis
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => runStudy(row.symbol, 'moving_average_analysis')}>
                              <LineChart className="h-4 w-4 mr-2 text-blue-500" />
                              Moving Averages
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => runStudy(row.symbol, 'volatility_analysis')}>
                              <Zap className="h-4 w-4 mr-2 text-rose-500" />
                              Volatility
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openQuantLab(row.symbol)}>
                              <FlaskConical className="h-4 w-4 mr-2" />
                              Quant Lab
                              <ArrowRight className="h-3 w-3 ml-auto" />
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <StudyBuilderSheet
                          symbol={row.symbol}
                          symbolName={row.name}
                          trigger={
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Settings2 className="h-3 w-3" />
                            </Button>
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MarketDataTable;
