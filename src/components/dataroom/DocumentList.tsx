import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileSpreadsheet,
  FileText,
  File,
  MoreHorizontal,
  Download,
  Eye,
  Trash2,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Document {
  id: string;
  name: string;
  type: "xlsx" | "pdf" | "docx" | "csv" | "other";
  size: string;
  uploadedAt: string;
  uploadedBy: string;
  status?: "pending" | "reviewed" | "flagged";
}

interface DocumentListProps {
  documents: Document[];
  selectedDocuments: Set<string>;
  onToggleSelect: (docId: string) => void;
  onSelectAll: () => void;
  onViewDocument: (doc: Document) => void;
}

export function DocumentList({
  documents,
  selectedDocuments,
  onToggleSelect,
  onSelectAll,
  onViewDocument,
}: DocumentListProps) {
  const getFileIcon = (type: Document["type"]) => {
    switch (type) {
      case "xlsx":
      case "csv":
        return <FileSpreadsheet className="h-5 w-5 text-success" />;
      case "pdf":
        return <FileText className="h-5 w-5 text-destructive" />;
      case "docx":
        return <FileText className="h-5 w-5 text-primary" />;
      default:
        return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status?: Document["status"]) => {
    if (!status) return null;
    switch (status) {
      case "reviewed":
        return <Badge variant="success">Reviewed</Badge>;
      case "flagged":
        return <Badge variant="warning">Flagged</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-1">No documents</h3>
        <p className="text-sm text-muted-foreground">
          Upload documents to this folder to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
        <Checkbox
          checked={selectedDocuments.size === documents.length && documents.length > 0}
          onCheckedChange={onSelectAll}
          className="mr-2"
        />
        <span className="flex-1">Name</span>
        <span className="w-20 text-center">Type</span>
        <span className="w-20 text-right">Size</span>
        <span className="w-32">Uploaded</span>
        <span className="w-24">Status</span>
        <span className="w-10" />
      </div>

      {/* Documents */}
      {documents.map((doc) => (
        <Card
          key={doc.id}
          variant="interactive"
          className={cn(
            "flex items-center gap-4 px-4 py-3",
            selectedDocuments.has(doc.id) && "border-primary/50 bg-primary/5"
          )}
          onClick={() => onViewDocument(doc)}
        >
          <Checkbox
            checked={selectedDocuments.has(doc.id)}
            onCheckedChange={() => onToggleSelect(doc.id)}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {getFileIcon(doc.type)}
            <span className="font-medium text-foreground truncate">{doc.name}</span>
          </div>
          <span className="w-20 text-center text-xs text-muted-foreground uppercase">
            {doc.type}
          </span>
          <span className="w-20 text-right text-sm text-muted-foreground font-mono">
            {doc.size}
          </span>
          <span className="w-32 text-sm text-muted-foreground">{doc.uploadedAt}</span>
          <span className="w-24">{getStatusBadge(doc.status)}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Card>
      ))}
    </div>
  );
}
