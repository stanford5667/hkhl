import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileSpreadsheet,
  FileText,
  File,
  MoreHorizontal,
  Download,
  Eye,
  Trash2,
  Share2,
  FolderInput,
  Copy,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface Document {
  id: string;
  name: string;
  type: "xlsx" | "xls" | "pdf" | "docx" | "csv" | "txt" | "other";
  size: string;
  uploadedAt: string;
  uploadedBy: string;
  status?: "pending" | "reviewed" | "flagged";
  filePath?: string;
  folder?: string;
  subfolder?: string;
}

interface FolderOption {
  id: string;
  name: string;
  subfolders?: { id: string; name: string }[];
}

const folderOptions: FolderOption[] = [
  {
    id: "financial",
    name: "Financial",
    subfolders: [
      { id: "historical", name: "Historical Financials" },
      { id: "projections", name: "Projections & Models" },
      { id: "audit", name: "Audit Reports" },
      { id: "tax", name: "Tax Returns" },
    ],
  },
  {
    id: "legal",
    name: "Legal",
    subfolders: [
      { id: "corporate", name: "Corporate Documents" },
      { id: "contracts", name: "Contracts & Agreements" },
      { id: "litigation", name: "Litigation" },
      { id: "ip", name: "IP & Patents" },
    ],
  },
  {
    id: "commercial",
    name: "Commercial",
    subfolders: [
      { id: "customer", name: "Customer Data" },
      { id: "sales", name: "Sales Materials" },
      { id: "market", name: "Market Research" },
    ],
  },
  {
    id: "operations",
    name: "Operations",
    subfolders: [
      { id: "hr", name: "HR & Org Charts" },
      { id: "it", name: "IT & Systems" },
      { id: "facilities", name: "Facilities" },
    ],
  },
  {
    id: "deal-docs",
    name: "Deal Documents",
    subfolders: [
      { id: "cim", name: "CIM & Teasers" },
      { id: "loi", name: "LOI & Term Sheets" },
      { id: "ic-memos", name: "IC Memos" },
    ],
  },
  {
    id: "diligence",
    name: "Diligence Reports",
    subfolders: [
      { id: "qoe", name: "Quality of Earnings" },
      { id: "legal-dd", name: "Legal Due Diligence" },
      { id: "commercial-dd", name: "Commercial Due Diligence" },
    ],
  },
];

interface DocumentListProps {
  documents: Document[];
  selectedDocuments: Set<string>;
  onToggleSelect: (docId: string) => void;
  onSelectAll: () => void;
  onViewDocument: (doc: Document) => void;
  onOpenDetails?: (doc: Document) => void;
  onDownload?: (doc: Document) => Promise<void>;
  onDelete?: (doc: Document) => Promise<void>;
  onMoveToFolder?: (doc: Document, folder: string, subfolder?: string) => Promise<void>;
}

export function DocumentList({
  documents,
  selectedDocuments,
  onToggleSelect,
  onSelectAll,
  onViewDocument,
  onOpenDetails,
  onDownload,
  onDelete,
  onMoveToFolder,
}: DocumentListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

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

  const handleDownload = async (e: React.MouseEvent, doc: Document) => {
    e.stopPropagation();
    if (!onDownload || !doc.filePath) {
      toast.error("Download not available for this file");
      return;
    }
    setLoadingAction(`download-${doc.id}`);
    try {
      await onDownload(doc);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, doc: Document) => {
    e.stopPropagation();
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!documentToDelete || !onDelete) return;
    setLoadingAction(`delete-${documentToDelete.id}`);
    try {
      await onDelete(documentToDelete);
    } finally {
      setLoadingAction(null);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handleShare = (e: React.MouseEvent, doc: Document) => {
    e.stopPropagation();
    // Copy a shareable reference to clipboard
    const shareText = `Document: ${doc.name}`;
    navigator.clipboard.writeText(shareText);
    toast.success("Document info copied to clipboard");
  };

  const handleMoveToFolder = async (e: React.MouseEvent, doc: Document, folder: string, subfolder?: string) => {
    e.stopPropagation();
    if (!onMoveToFolder) return;
    setLoadingAction(`move-${doc.id}`);
    try {
      await onMoveToFolder(doc, folder, subfolder);
    } finally {
      setLoadingAction(null);
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
    <>
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
        {documents.map((doc) => {
          const isModel = doc.id.startsWith('model-');
          const isLoading = loadingAction?.includes(doc.id);
          
          return (
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
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreHorizontal className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDocument(doc); }}>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </DropdownMenuItem>
                  
                  {onOpenDetails && !isModel && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenDetails(doc); }}>
                      <FileText className="mr-2 h-4 w-4" />
                      Details
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  {!isModel && doc.filePath && (
                    <DropdownMenuItem onClick={(e) => handleDownload(e, doc)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem onClick={(e) => handleShare(e, doc)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Info
                  </DropdownMenuItem>
                  
                  {!isModel && onMoveToFolder && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <FolderInput className="mr-2 h-4 w-4" />
                        Move to Folder
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        {folderOptions.map((folder) => (
                          <DropdownMenuSub key={folder.id}>
                            <DropdownMenuSubTrigger>{folder.name}</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem 
                                onClick={(e) => handleMoveToFolder(e, doc, folder.name)}
                              >
                                {folder.name} (Root)
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {folder.subfolders?.map((sub) => (
                                <DropdownMenuItem
                                  key={sub.id}
                                  onClick={(e) => handleMoveToFolder(e, doc, folder.name, sub.id)}
                                >
                                  {sub.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}
                  
                  {!isModel && onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={(e) => handleDeleteClick(e, doc)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
