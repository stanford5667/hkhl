import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download,
  FileText,
  FileSpreadsheet,
  MessageSquare,
  Share2,
  Sparkles,
  Loader2,
  RefreshCw,
  Table,
} from "lucide-react";
import { Document } from "./DocumentList";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface DocumentPreviewProps {
  document: Document | null;
  open: boolean;
  onClose: () => void;
}

interface DocumentSummary {
  summary: string;
  key_figures: { label: string; value: string }[];
  time_period: string;
  insights: string[];
  document_type: string;
}

export function DocumentPreview({ document, open, onClose }: DocumentPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const [previewData, setPreviewData] = useState<string[][] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Reset and load preview when document changes
  useEffect(() => {
    if (document && open) {
      setSummary(null);
      setHasAttemptedFetch(false);
      setPreviewData(null);
      loadDocumentPreview();
    }
  }, [document?.id, open]);

  const loadDocumentPreview = async () => {
    if (!document?.filePath) return;
    
    setLoadingPreview(true);
    try {
      // Download the file from storage
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.filePath);
      
      if (error) {
        console.error('Error downloading file:', error);
        return;
      }

      // Parse Excel/CSV files
      if (document.type === 'xlsx' || document.type === 'xls' || document.type === 'csv') {
        const arrayBuffer = await data.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });
        // Get first 20 rows for preview
        setPreviewData(jsonData.slice(0, 20) as string[][]);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const fetchSummary = async () => {
    if (!document) return;
    
    setLoading(true);
    try {
      let documentContent = "";
      
      // Try to get actual file content
      if (document.filePath) {
        const { data, error } = await supabase.storage
          .from('documents')
          .download(document.filePath);
        
        if (!error && data) {
          if (document.type === 'xlsx' || document.type === 'xls' || document.type === 'csv') {
            const arrayBuffer = await data.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            // Convert to CSV for AI analysis
            documentContent = XLSX.utils.sheet_to_csv(firstSheet);
          } else if (document.type === 'pdf' || document.type === 'txt') {
            documentContent = await data.text();
          }
        }
      }
      
      // If we couldn't get content, use filename as context
      if (!documentContent) {
        documentContent = `Document: ${document.name}\nType: ${document.type}\nSize: ${document.size}`;
      }
      
      // Call the edge function
      const { data: summaryData, error } = await supabase.functions.invoke('summarize-document', {
        body: { 
          documentContent,
          fileName: document.name,
          fileType: document.type
        }
      });
      
      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to analyze document');
      }
      
      if (summaryData?.error) {
        throw new Error(summaryData.error);
      }
      
      setSummary(summaryData);
      setHasAttemptedFetch(true);
      toast.success('AI analysis complete');
    } catch (error) {
      console.error('Error fetching summary:', error);
      toast.error('Failed to analyze document');
    } finally {
      setLoading(false);
    }
  };

  if (!document) return null;

  const getFileIcon = () => {
    switch (document.type) {
      case "xlsx":
      case "xls":
      case "csv":
        return <FileSpreadsheet className="h-16 w-16 text-success/50" />;
      default:
        return <FileText className="h-16 w-16 text-muted-foreground/30" />;
    }
  };

  const isSpreadsheet = document.type === 'xlsx' || document.type === 'xls' || document.type === 'csv';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0" aria-describedby={undefined}>
        <div className="flex h-full">
          {/* Document Preview Area */}
          <div className="flex-1 bg-background/50 flex flex-col overflow-hidden">
            <DialogHeader className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg">{document.name}</DialogTitle>
                <Badge>{document.type.toUpperCase()}</Badge>
              </div>
              <DialogDescription className="sr-only">
                Preview and analyze {document.name}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto bg-muted/20">
              {loadingPreview ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : previewData && previewData.length > 0 ? (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Table className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Spreadsheet Preview</span>
                    <span className="text-xs text-muted-foreground">
                      (First 20 rows)
                    </span>
                  </div>
                  <div className="overflow-auto border border-border rounded-md">
                    <table className="min-w-full text-xs">
                      <tbody>
                        {previewData.map((row, rowIdx) => (
                          <tr key={rowIdx} className={rowIdx === 0 ? "bg-muted/50 font-medium" : "border-t border-border"}>
                            {(row || []).slice(0, 10).map((cell, cellIdx) => (
                              <td key={cellIdx} className="px-2 py-1.5 whitespace-nowrap max-w-[200px] truncate">
                                {cell !== undefined && cell !== null ? String(cell) : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    {getFileIcon()}
                    <p className="text-muted-foreground mt-4">
                      {document.filePath ? 'Loading preview...' : 'No preview available'}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {isSpreadsheet ? 'Click Analyze to extract insights' : 'Upload to storage for preview'}
                    </p>
                    <p className="text-xs text-muted-foreground/50 mt-2">
                      Size: {document.size}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l border-border bg-card flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {/* File Info */}
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">
                    File Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <span className="text-foreground uppercase">{document.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Size</span>
                      <span className="text-foreground">{document.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Uploaded</span>
                      <span className="text-foreground">{document.uploadedAt}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">By</span>
                      <span className="text-foreground">{document.uploadedBy}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* AI Summary Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      AI Analysis
                    </h4>
                    {!loading && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={fetchSummary}
                        className="h-7 text-xs"
                      >
                        {hasAttemptedFetch ? (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        ) : (
                          <Sparkles className="h-3 w-3 mr-1" />
                        )}
                        {hasAttemptedFetch ? 'Refresh' : 'Analyze'}
                      </Button>
                    )}
                  </div>
                  
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : summary ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {summary.summary}
                      </p>
                      
                      {summary.key_figures.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                              Key Figures
                            </h5>
                            <div className="space-y-2">
                              {summary.key_figures.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">{item.label}</span>
                                  <span className="font-mono text-foreground">{item.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                      
                      {summary.insights.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                              Key Insights
                            </h5>
                            <ul className="space-y-1.5">
                              {summary.insights.map((insight, i) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-primary mt-1">•</span>
                                  <span>{insight}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Click "Analyze" to extract key information from this document using AI
                    </p>
                  )}
                </div>

                <Separator />

                {/* Status */}
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Status</h4>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant={document.status === 'reviewed' ? 'success' : document.status === 'flagged' ? 'warning' : 'outline'}>
                      {document.status || 'Pending'}
                    </Badge>
                    {summary?.time_period && (
                      <Badge variant="outline">{summary.time_period}</Badge>
                    )}
                    {summary?.document_type && (
                      <Badge variant="secondary">{summary.document_type}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="p-4 border-t border-border space-y-2">
              <Button className="w-full" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button className="w-full" variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Extract to Model
              </Button>
              <Button className="w-full" variant="outline">
                <MessageSquare className="mr-2 h-4 w-4" />
                Ask AI About This
              </Button>
              <Button className="w-full" variant="outline">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
