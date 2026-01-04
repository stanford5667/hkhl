import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Newspaper, Globe, FileText, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface Source {
  title: string;
  url: string;
  source_name: string;
  published_at?: string;
  category?: string;
}

interface SourcesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: Source[];
  thesis: string;
}

export function SourcesModal({ open, onOpenChange, sources, thesis }: SourcesModalProps) {
  const getSourceIcon = (sourceName: string) => {
    const name = sourceName.toLowerCase();
    if (name.includes('reuters') || name.includes('ap') || name.includes('news')) {
      return <Newspaper className="h-4 w-4" />;
    }
    if (name.includes('gov') || name.includes('official')) {
      return <FileText className="h-4 w-4" />;
    }
    return <Globe className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#1a1a1a] border-border/50">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            Source Intelligence
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {thesis}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {sources.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No source data available</p>
              </div>
            ) : (
              sources.map((source, index) => (
                <div 
                  key={index}
                  className="p-4 rounded-lg bg-[#252525] border border-border/30 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getSourceIcon(source.source_name)}
                        <Badge variant="outline" className="text-xs">
                          {source.source_name}
                        </Badge>
                        {source.category && (
                          <Badge variant="secondary" className="text-xs">
                            {source.category}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium text-foreground line-clamp-2 mb-2">
                        {source.title}
                      </h4>
                      {source.published_at && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(source.published_at), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => window.open(source.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t border-border/30">
          <span className="text-xs text-muted-foreground">
            {sources.length} source{sources.length !== 1 ? 's' : ''} verified
          </span>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
