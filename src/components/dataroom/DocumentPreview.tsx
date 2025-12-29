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
  MessageSquare,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { Document } from "./DocumentList";

interface DocumentPreviewProps {
  document: Document | null;
  open: boolean;
  onClose: () => void;
}

export function DocumentPreview({ document, open, onClose }: DocumentPreviewProps) {
  if (!document) return null;

  const extractedData = [
    { label: "Revenue (LTM)", value: "$61.5M" },
    { label: "EBITDA (LTM)", value: "$10.8M" },
    { label: "EBITDA Margin", value: "17.6%" },
    { label: "YoY Growth", value: "+18.0%" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0">
        <div className="flex h-full">
          {/* Document Preview Area */}
          <div className="flex-1 bg-background/50 flex flex-col">
            <DialogHeader className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg">{document.name}</DialogTitle>
              </div>
            </DialogHeader>
            <div className="flex-1 flex items-center justify-center bg-muted/20">
              <div className="text-center">
                <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Document preview</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  PDF viewer would render here
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

                {/* AI Summary */}
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Summary
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    This financial statement shows strong revenue growth of 18% YoY with
                    improving EBITDA margins. Key highlights include expansion into new
                    market segments and successful cost optimization initiatives.
                  </p>
                </div>

                <Separator />

                {/* Extracted Data */}
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">
                    Key Figures Extracted
                  </h4>
                  <div className="space-y-2">
                    {extractedData.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-mono text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Status */}
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Status</h4>
                  <div className="flex gap-2">
                    <Badge variant="success">Reviewed</Badge>
                    <Badge variant="outline">3 years data</Badge>
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
