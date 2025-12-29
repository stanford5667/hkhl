import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
} from "lucide-react";
import { Document } from "./DocumentList";
import { toast } from "sonner";

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

  // Reset when document changes
  useEffect(() => {
    if (document) {
      setSummary(null);
      setHasAttemptedFetch(false);
    }
  }, [document?.id]);

  const fetchSummary = async () => {
    if (!document) return;
    
    setLoading(true);
    try {
      // For demo, we'll use mock data since we don't have actual file content
      // In production, you'd fetch the file content and send to the edge function
      const mockSummary: DocumentSummary = {
        summary: `This ${document.type.toUpperCase()} file contains financial data for the company. The document appears to be ${document.name.includes('Financial') ? 'a financial statement' : 'a business document'} with detailed metrics.`,
        key_figures: [
          { label: "Revenue (LTM)", value: "$61.5M" },
          { label: "EBITDA (LTM)", value: "$10.8M" },
          { label: "EBITDA Margin", value: "17.6%" },
          { label: "YoY Growth", value: "+18.0%" },
        ],
        time_period: "FY2023-2024",
        insights: [
          "Strong revenue growth of 18% YoY",
          "Improving EBITDA margins from operational efficiencies",
          "Healthy working capital position"
        ],
        document_type: document.name.includes('Financial') ? 'Financial Statement' : 'Report'
      };
      
      setSummary(mockSummary);
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
      case "csv":
        return <FileSpreadsheet className="h-16 w-16 text-success/50" />;
      default:
        return <FileText className="h-16 w-16 text-muted-foreground/30" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0">
        <div className="flex h-full">
          {/* Document Preview Area */}
          <div className="flex-1 bg-background/50 flex flex-col">
            <DialogHeader className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg">{document.name}</DialogTitle>
                <Badge variant="outline">{document.type.toUpperCase()}</Badge>
              </div>
            </DialogHeader>
            <div className="flex-1 flex items-center justify-center bg-muted/20">
              <div className="text-center">
                {getFileIcon()}
                <p className="text-muted-foreground mt-4">Document preview</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Full document viewer would render here
                </p>
                <p className="text-xs text-muted-foreground/50 mt-2">
                  Size: {document.size}
                </p>
              </div>
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
