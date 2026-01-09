// Unified Add Position Dialog - Works on Portfolio and Backtester pages
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  PenLine, 
  Link2, 
  FileSpreadsheet,
} from 'lucide-react';
import { ManualPositionForm } from './ManualPositionForm';
import { BrokerageConnectionPanel } from './BrokerageConnectionPanel';
import { CSVImportPanel } from './CSVImportPanel';
import { usePositions } from '@/hooks/usePositions';
import { toast } from 'sonner';
import type { PositionFormData, SyncedPosition } from '@/types/positions';

interface UnifiedAddPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId?: string;
  onPositionAdded?: (position: SyncedPosition) => void;
  onPositionsImported?: (positions: SyncedPosition[]) => void;
}

export function UnifiedAddPositionDialog({
  open,
  onOpenChange,
  portfolioId,
  onPositionAdded,
  onPositionsImported,
}: UnifiedAddPositionDialogProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'brokerage' | 'csv'>('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { addPosition, importPositions } = usePositions(portfolioId);

  const handleManualSubmit = async (data: PositionFormData) => {
    setIsSubmitting(true);
    try {
      const position = await addPosition(data, 'manual');
      toast.success('Position added', {
        description: `Added ${data.quantity} shares of ${data.symbol}`,
      });
      onPositionAdded?.(position);
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to add position', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCSVImport = async (positions: PositionFormData[]) => {
    setIsSubmitting(true);
    try {
      const imported = await importPositions(positions);
      toast.success('Import complete', {
        description: `Added ${imported.length} positions to your portfolio`,
      });
      onPositionsImported?.(imported);
      onOpenChange(false);
    } catch (err) {
      toast.error('Import failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBrokerageSync = () => {
    // Refresh will be handled by the parent component
    toast.success('Brokerage connected', {
      description: 'Positions will sync automatically',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Add Positions</DialogTitle>
          <DialogDescription>
            Add positions manually, connect a brokerage, or import from CSV
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual" className="gap-2">
              <PenLine className="h-4 w-4" />
              <span className="hidden sm:inline">Manual</span>
            </TabsTrigger>
            <TabsTrigger value="brokerage" className="gap-2">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Brokerage</span>
            </TabsTrigger>
            <TabsTrigger value="csv" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">CSV Import</span>
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mt-6"
            >
              <TabsContent value="manual" className="m-0">
                <ManualPositionForm
                  onSubmit={handleManualSubmit}
                  isSubmitting={isSubmitting}
                />
              </TabsContent>

              <TabsContent value="brokerage" className="m-0">
                <BrokerageConnectionPanel
                  onSyncComplete={handleBrokerageSync}
                />
              </TabsContent>

              <TabsContent value="csv" className="m-0">
                <CSVImportPanel
                  onImport={handleCSVImport}
                  isImporting={isSubmitting}
                />
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
