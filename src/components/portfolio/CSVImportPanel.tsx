// CSV Import Panel with Column Mapping
import { useState, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Download,
  X
} from 'lucide-react';
import { ColumnMapping, CSVImportRow, PositionFormData } from '@/types/positions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CSVImportPanelProps {
  onImport: (positions: PositionFormData[]) => Promise<void>;
  isImporting?: boolean;
}

// Common column name patterns for auto-detection
const COLUMN_PATTERNS: Record<keyof ColumnMapping, string[]> = {
  symbol: ['symbol', 'ticker', 'stock', 'security'],
  name: ['name', 'company', 'description', 'security name'],
  quantity: ['quantity', 'shares', 'qty', 'units', 'amount'],
  costBasis: ['cost basis', 'total cost', 'book value', 'investment'],
  costPerShare: ['cost per share', 'avg cost', 'average cost', 'price paid', 'purchase price'],
  currentPrice: ['current price', 'price', 'market price', 'last price'],
};

export function CSVImportPanel({ onImport, isImporting }: CSVImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ symbol: '', quantity: '' });
  const [previewRows, setPreviewRows] = useState<CSVImportRow[]>([]);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');

  const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    return lines.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const autoDetectMapping = useCallback((headers: string[]): ColumnMapping => {
    const newMapping: ColumnMapping = { symbol: '', quantity: '' };
    
    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase();
      
      for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
        if (patterns.some(p => lowerHeader.includes(p))) {
          (newMapping as unknown as Record<string, string>)[field] = String(index);
        }
      }
    });
    
    return newMapping;
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Invalid file', { description: 'Please select a CSV file' });
      return;
    }

    setFile(selectedFile);
    
    try {
      const text = await selectedFile.text();
      const parsed = parseCSV(text);
      
      if (parsed.length < 2) {
        toast.error('Invalid CSV', { description: 'File must have at least a header and one data row' });
        return;
      }

      const fileHeaders = parsed[0];
      const dataRows = parsed.slice(1);
      
      setHeaders(fileHeaders);
      setRawData(dataRows);
      setMapping(autoDetectMapping(fileHeaders));
      setStep('mapping');
    } catch (err) {
      toast.error('Failed to parse CSV');
    }
  };

  const updateMapping = (field: keyof ColumnMapping, value: string) => {
    setMapping(prev => ({ ...prev, [field]: value }));
  };

  const generatePreview = useCallback(() => {
    const preview: CSVImportRow[] = rawData.slice(0, 10).map(row => {
      const symbolIdx = parseInt(mapping.symbol);
      const quantityIdx = parseInt(mapping.quantity);
      const nameIdx = mapping.name ? parseInt(mapping.name) : -1;
      const costBasisIdx = mapping.costBasis ? parseInt(mapping.costBasis) : -1;
      const costPerShareIdx = mapping.costPerShare ? parseInt(mapping.costPerShare) : -1;

      return {
        symbol: row[symbolIdx]?.toUpperCase() || '',
        name: nameIdx >= 0 ? row[nameIdx] : undefined,
        quantity: parseFloat(row[quantityIdx]) || 0,
        costBasis: costBasisIdx >= 0 ? parseFloat(row[costBasisIdx].replace(/[$,]/g, '')) || undefined : undefined,
        costPerShare: costPerShareIdx >= 0 ? parseFloat(row[costPerShareIdx].replace(/[$,]/g, '')) || undefined : undefined,
      };
    }).filter(row => row.symbol && row.quantity > 0);

    setPreviewRows(preview);
    setStep('preview');
  }, [rawData, mapping]);

  const handleImport = async () => {
    // Process all rows (not just preview)
    const allPositions: PositionFormData[] = rawData.map(row => {
      const symbolIdx = parseInt(mapping.symbol);
      const quantityIdx = parseInt(mapping.quantity);
      const nameIdx = mapping.name ? parseInt(mapping.name) : -1;
      const costBasisIdx = mapping.costBasis ? parseInt(mapping.costBasis) : -1;
      const costPerShareIdx = mapping.costPerShare ? parseInt(mapping.costPerShare) : -1;

      return {
        symbol: row[symbolIdx]?.toUpperCase() || '',
        name: nameIdx >= 0 ? row[nameIdx] : undefined,
        quantity: parseFloat(row[quantityIdx]) || 0,
        cost_basis: costBasisIdx >= 0 ? parseFloat(row[costBasisIdx].replace(/[$,]/g, '')) || undefined : undefined,
        cost_per_share: costPerShareIdx >= 0 ? parseFloat(row[costPerShareIdx].replace(/[$,]/g, '')) || undefined : undefined,
      };
    }).filter(row => row.symbol && row.quantity > 0);

    await onImport(allPositions);
    
    // Reset state
    setFile(null);
    setRawData([]);
    setHeaders([]);
    setPreviewRows([]);
    setStep('upload');
  };

  const isValidMapping = mapping.symbol && mapping.quantity;

  // Upload Step
  if (step === 'upload') {
    return (
      <div className="space-y-6">
        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer",
            "hover:border-primary/50 hover:bg-muted/30 transition-all"
          )}
        >
          <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="font-medium mb-2">Drop CSV file here or click to browse</p>
          <p className="text-sm text-muted-foreground">
            Supports exports from Robinhood, Fidelity, Schwab, and more
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Sample Format */}
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm font-medium mb-2">Expected Format</p>
          <code className="text-xs text-muted-foreground block whitespace-pre">
{`Symbol,Name,Quantity,Cost Basis
AAPL,Apple Inc,100,15000.00
MSFT,Microsoft Corp,50,17500.00
GOOGL,Alphabet Inc,25,4125.00`}
          </code>
        </div>
      </div>
    );
  }

  // Mapping Step
  if (step === 'mapping') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">{file?.name}</h4>
            <p className="text-sm text-muted-foreground">{rawData.length} rows detected</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Map your CSV columns to position fields:
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Symbol <span className="text-destructive">*</span>
              </Label>
              <Select value={mapping.symbol} onValueChange={(v) => updateMapping('symbol', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((header, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Select value={mapping.quantity} onValueChange={(v) => updateMapping('quantity', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((header, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Company Name</Label>
              <Select value={mapping.name || ''} onValueChange={(v) => updateMapping('name', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-- Skip --</SelectItem>
                  {headers.map((header, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cost Basis</Label>
              <Select value={mapping.costBasis || ''} onValueChange={(v) => updateMapping('costBasis', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-- Skip --</SelectItem>
                  {headers.map((header, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cost Per Share</Label>
              <Select value={mapping.costPerShare || ''} onValueChange={(v) => updateMapping('costPerShare', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-- Skip --</SelectItem>
                  {headers.map((header, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Button onClick={generatePreview} disabled={!isValidMapping} className="w-full">
          Preview Import
        </Button>
      </div>
    );
  }

  // Preview Step
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Preview ({previewRows.length} of {rawData.length} positions)</h4>
          <p className="text-sm text-muted-foreground">Review before importing</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setStep('mapping')}>
          Edit Mapping
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Shares</TableHead>
              <TableHead className="text-right">Cost Basis</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewRows.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Badge variant="outline" className="font-mono">{row.symbol}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[200px]">
                  {row.name || '-'}
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.costBasis ? `$${row.costBasis.toLocaleString()}` : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {rawData.length > 10 && (
        <p className="text-sm text-muted-foreground text-center">
          + {rawData.length - 10} more positions will be imported
        </p>
      )}

      <Button 
        onClick={handleImport} 
        disabled={isImporting} 
        className="w-full"
        size="lg"
      >
        {isImporting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Upload className="h-4 w-4 mr-2" />
        )}
        Import {rawData.filter(r => r[parseInt(mapping.symbol)] && parseFloat(r[parseInt(mapping.quantity)]) > 0).length} Positions
      </Button>
    </div>
  );
}
