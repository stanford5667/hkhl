// src/components/earnings/EarningsCalendar.tsx

import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { format, isToday, isTomorrow, addDays, subDays } from 'date-fns';
import { Calendar as CalendarIcon, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useEarningsCalendar, useFetchEarningsData, useGeneratePredictions, useAdjacentEarningsDates } from '@/hooks/useEarningsCalendar';
import { EarningsCalendarFilters } from '@/types/earnings';
import { EarningsTable } from './EarningsTable';
import { parseDateOnly } from '@/lib/date';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

// Lazy load the screener since it's a secondary tab
const EarningsScreener = lazy(() => import('./EarningsScreener').then(m => ({ default: m.EarningsScreener })));

const ITEMS_PER_PAGE = 20;

export const EarningsCalendar = () => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'screener'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const hasAutoFetched = useRef(false);

  // Build filters from selected date
  const filters: EarningsCalendarFilters = {
    dateRange: 'custom',
    customStart: format(selectedDate, 'yyyy-MM-dd'),
    customEnd: format(selectedDate, 'yyyy-MM-dd'),
  };

  const { data: earnings, isLoading, error, isFetched } = useEarningsCalendar(filters);
  const fetchEarnings = useFetchEarningsData();
  const generatePredictions = useGeneratePredictions();
  const { data: adjacentDates } = useAdjacentEarningsDates(selectedDate);

  // Reset to page 1 when date changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate]);

  // Auto-jump to nearest earnings date if today has no earnings
  const hasAutoJumped = useRef(false);
  useEffect(() => {
    if (
      !hasAutoJumped.current &&
      isFetched &&
      !isLoading &&
      earnings &&
      earnings.length === 0 &&
      isToday(selectedDate) &&
      adjacentDates
    ) {
      hasAutoJumped.current = true;
      if (adjacentDates.nextDate) {
        setSelectedDate(parseDateOnly(adjacentDates.nextDate));
      } else if (adjacentDates.prevDate) {
        setSelectedDate(parseDateOnly(adjacentDates.prevDate));
      }
    }
  }, [isFetched, isLoading, earnings, selectedDate, adjacentDates]);

  // Auto-fetch earnings data on first load if empty - fetch 1 year ahead
  useEffect(() => {
    if (isFetched && !isLoading && !hasAutoFetched.current && (!earnings || earnings.length === 0)) {
      hasAutoFetched.current = true;
      const today = new Date().toISOString().split('T')[0];
      const yearAhead = new Date();
      yearAhead.setFullYear(yearAhead.getFullYear() + 1);
      
      fetchEarnings.mutate({
        startDate: today,
        endDate: yearAhead.toISOString().split('T')[0],
      });
    }
  }, [isFetched, isLoading, earnings, fetchEarnings]);

  // Also auto-generate predictions when we have earnings but no predictions
  useEffect(() => {
    if (earnings && earnings.length > 0) {
      const withoutPredictions = earnings.filter(e => !e.prediction);
      if (withoutPredictions.length > 0 && withoutPredictions.length === earnings.length) {
        // No predictions at all - auto-generate for current view
        const symbols = [...new Set(earnings.slice(0, 50).map(e => e.symbol))];
        if (symbols.length > 0) {
          generatePredictions.mutate({ symbols, useBulkPrediction: true });
        }
      }
    }
  }, [earnings?.length]);

  // Pagination logic
  const totalItems = earnings?.length || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedEarnings = earnings?.slice(startIndex, endIndex) || [];

  const getDateLabel = () => {
    if (isToday(selectedDate)) return 'Today';
    if (isTomorrow(selectedDate)) return 'Tomorrow';
    return format(selectedDate, 'EEEE, MMMM d, yyyy');
  };

  const goToPreviousDay = () => {
    if (adjacentDates?.prevDate) {
      setSelectedDate(parseDateOnly(adjacentDates.prevDate));
    } else {
      setSelectedDate(prev => subDays(prev, 1));
    }
  };
  const goToNextDay = () => {
    if (adjacentDates?.nextDate) {
      setSelectedDate(parseDateOnly(adjacentDates.nextDate));
    } else {
      setSelectedDate(prev => addDays(prev, 1));
    }
  };
  const goToToday = () => setSelectedDate(new Date());

  return (
    <div className="space-y-4">
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'calendar' | 'screener')}>
        <TabsList>
          <TabsTrigger value="calendar">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="screener">
            <Sparkles className="h-4 w-4 mr-2" />
            Screener
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          {/* Date Navigation - Mobile optimized */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
              <Button variant="outline" size="icon" onClick={goToPreviousDay} className="h-8 w-8 sm:h-10 sm:w-10">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 sm:flex-none sm:min-w-[200px] justify-start text-left font-normal h-8 sm:h-10 text-xs sm:text-sm px-2 sm:px-4">
                    <CalendarIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span className="truncate">{getDateLabel()}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="icon" onClick={goToNextDay} className="h-8 w-8 sm:h-10 sm:w-10">
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isToday(selectedDate) && (
                <Button variant="ghost" size="sm" onClick={goToToday} className="h-8 text-xs hidden sm:flex">
                  Today
                </Button>
              )}
            </div>
            <Badge variant="secondary" className="text-xs sm:text-sm self-end sm:self-auto">
              {totalItems} {totalItems === 1 ? 'company' : 'companies'}
            </Badge>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to load earnings calendar: {error.message}
              </AlertDescription>
            </Alert>
          )}

          {isLoading || fetchEarnings.isPending ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ) : paginatedEarnings.length > 0 ? (
            <div className="space-y-4">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-4">
                  <EarningsTable earnings={paginatedEarnings} showDate />
                </CardContent>
              </Card>

              {/* Pagination Controls - Mobile optimized */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/50">
                  <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                    {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
                  </p>
                  <div className="flex items-center gap-2 order-1 sm:order-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 text-xs"
                    >
                      <ChevronLeft className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                    <span className="text-xs sm:text-sm px-2 whitespace-nowrap">
                      {currentPage}/{totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 text-xs"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-3 w-3 sm:ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                {fetchEarnings.isPending ? 'Loading earnings data...' : `No earnings reports for ${getDateLabel()}.`}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="screener">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <EarningsScreener />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};
