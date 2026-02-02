/**
 * Trade Export Component
 * 
 * Provides CSV and Excel export functionality for backtest trade data
 */

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { parseDateOnly } from '@/lib/date';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface Trade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  shares: number;
  pnl: number;
  pnlPercent: number;
  type: 'LONG' | 'SHORT';
  entryReason: string;
  exitReason: string;
  holdingDays: number;
}

interface TradeExportProps {
  trades: Trade[];
  ticker: string;
  strategy: string;
}

export function TradeExport({ trades, ticker, strategy }: TradeExportProps) {
  const formatTradesForExport = () => {
    return trades.map((trade, index) => ({
      'Trade #': index + 1,
      'Entry Date': format(parseDateOnly(trade.entryDate), 'yyyy-MM-dd'),
      'Entry Price': trade.entryPrice,
      'Exit Date': format(parseDateOnly(trade.exitDate), 'yyyy-MM-dd'),
      'Exit Price': trade.exitPrice,
      'Shares': trade.shares,
      'Holding Days (Trading)': trade.holdingDays,
      'P&L ($)': Math.round(trade.pnl * 100) / 100,
      'Return (%)': Math.round(trade.pnlPercent * 100) / 100,
      'Type': trade.type,
      'Entry Signal': trade.entryReason,
      'Exit Signal': trade.exitReason,
    }));
  };

  const exportToCSV = () => {
    try {
      const data = formatTradesForExport();
      if (data.length === 0) {
        toast.error('No trades to export');
        return;
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escape commas and quotes in string values
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${ticker}_${strategy}_trades_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${trades.length} trades to CSV`);
    } catch (err) {
      console.error('CSV export error:', err);
      toast.error('Failed to export CSV');
    }
  };

  const exportToExcel = () => {
    try {
      const data = formatTradesForExport();
      if (data.length === 0) {
        toast.error('No trades to export');
        return;
      }

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      // Set column widths
      ws['!cols'] = [
        { wch: 8 },  // Trade #
        { wch: 12 }, // Entry Date
        { wch: 12 }, // Entry Price
        { wch: 12 }, // Exit Date
        { wch: 12 }, // Exit Price
        { wch: 10 }, // Shares
        { wch: 12 }, // Holding Days
        { wch: 12 }, // P&L ($)
        { wch: 12 }, // Return (%)
        { wch: 8 },  // Type
        { wch: 30 }, // Entry Signal
        { wch: 30 }, // Exit Signal
      ];

      // Add summary sheet
      const summaryData = [
        { Metric: 'Ticker', Value: ticker },
        { Metric: 'Strategy', Value: strategy },
        { Metric: 'Total Trades', Value: trades.length },
        { Metric: 'Winning Trades', Value: trades.filter(t => t.pnl > 0).length },
        { Metric: 'Losing Trades', Value: trades.filter(t => t.pnl <= 0).length },
        { Metric: 'Win Rate (%)', Value: Math.round((trades.filter(t => t.pnl > 0).length / trades.length) * 10000) / 100 },
        { Metric: 'Total P&L ($)', Value: Math.round(trades.reduce((sum, t) => sum + t.pnl, 0) * 100) / 100 },
        { Metric: 'Avg Return (%)', Value: Math.round((trades.reduce((sum, t) => sum + t.pnlPercent, 0) / trades.length) * 100) / 100 },
        { Metric: 'Best Trade (%)', Value: Math.round(Math.max(...trades.map(t => t.pnlPercent)) * 100) / 100 },
        { Metric: 'Worst Trade (%)', Value: Math.round(Math.min(...trades.map(t => t.pnlPercent)) * 100) / 100 },
        { Metric: 'Export Date', Value: format(new Date(), 'yyyy-MM-dd HH:mm:ss') },
      ];
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 20 }, { wch: 30 }];

      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
      XLSX.utils.book_append_sheet(wb, ws, 'Trades');

      // Save workbook
      XLSX.writeFile(wb, `${ticker}_${strategy}_trades_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

      toast.success(`Exported ${trades.length} trades to Excel`);
    } catch (err) {
      console.error('Excel export error:', err);
      toast.error('Failed to export Excel');
    }
  };

  if (trades.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
