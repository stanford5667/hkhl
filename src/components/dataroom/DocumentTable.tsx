import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  FolderInput,
  Link2,
  Pencil,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface DocumentItem {
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
    id: "Financial",
    name: "Financial",
    subfolders: [
      { id: "historical", name: "Historical Financials" },
      { id: "projections", name: "Projections & Models" },
      { id: "audit", name: "Audit Reports" },
      { id: "tax", name: "Tax Returns" },
    ],
  },
  {
    id: "Legal",
    name: "Legal",
    subfolders: [
      { id: "corporate", name: "Corporate Documents" },
      { id: "contracts", name: "Contracts & Agreements" },
      { id: "litigation", name: "Litigation" },
      { id: "ip", name: "IP & Patents" },
    ],
  },
  {
    id: "Commercial",
    name: "Commercial",
    subfolders: [
      { id: "customer", name: "Customer Data" },
      { id: "sales", name: "Sales Materials" },
      { id: "market", name: "Market Research" },
    ],
  },
  {
    id: "Operations",
    name: "Operations",
    subfolders: [
      { id: "hr", name: "HR & Org Charts" },
      { id: "it", name: "IT & Systems" },
      { id: "facilities", name: "Facilities" },
    ],
  },
  {
    id: "Deal Documents",
    name: "Deal Documents",
    subfolders: [
      { id: "cim", name: "CIM & Teasers" },
      { id: "loi", name: "LOI & Term Sheets" },
      { id: "ic-memos", name: "IC Memos" },
    ],
  },
  {
    id: "Diligence Reports",
    name: "Diligence Reports",
    subfolders: [
      { id: "qoe", name: "Quality of Earnings" },
      { id: "legal-dd", name: "Legal Due Diligence" },
      { id: "commercial-dd", name: "Commercial Due Diligence" },
    ],
  },
];

interface DocumentTableProps {
  documents: DocumentItem[];
  selectedDocuments: Set<string>;
  onToggleSelect: (docId: string) => void;
  onSelectAll: () => void;
  onView: (doc: DocumentItem) => void;
  onDownload?: (doc: DocumentItem) => Promise<void>;
  onDelete?: (doc: DocumentItem) => Promise<void>;
  onRename?: (doc: DocumentItem, newName: string) => Promise<void>;
  onMoveToFolder?: (doc: DocumentItem, folder: string, subfolder?: string) => Promise<void>;
}

export function DocumentTable({
  documents,
  selectedDocuments,
  onToggleSelect,
  onSelectAll,
  onView,
  onDownload,
  onDelete,
  onRename,
  onMoveToFolder,
}: DocumentTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const getFileIcon = (type: DocumentItem["type"]) => {
    switch (type) {
      case "xlsx":
      case "xls":
      case "csv":
        return <FileSpreadsheet className="h-4 w-4 text-success" />;
      case "pdf":
        return <FileText className="h-4 w-4 text-destructive" />;
      case "docx":
        return <FileText className="h-4 w-4 text-primary" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status?: DocumentItem["status"]) => {
    if (!status) return null;
    switch (status) {
      case "reviewed":
        return <Badge variant="success" className="text-xs">Reviewed</Badge>;
      case "flagged":
        return <Badge variant="warning" className="text-xs">Flagged</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-xs">Pending</Badge>;
    }
  };

  const handleDownload = async (e: React.MouseEvent, doc: DocumentItem) => {
    e.stopPropagation();
    if (!onDownload || !doc.filePath) return;
    setLoadingAction(`download-${doc.id}`);
    try {
      await onDownload(doc);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, doc: DocumentItem) => {
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

  const handleCopyLink = (e: React.MouseEvent, doc: DocumentItem) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`Document: ${doc.name}`);
    toast.success("Link copied");
  };

  const handleMoveToFolder = async (
    e: React.MouseEvent,
    doc: DocumentItem,
    folder: string,
    subfolder?: string
  ) => {
    e.stopPropagation();
    if (!onMoveToFolder) return;
    setLoadingAction(`move-${doc.id}`);
    try {
      await onMoveToFolder(doc, folder, subfolder);
    } finally {
      setLoadingAction(null);
    }
  };

  // Inline rename handlers
  const startRename = (e: React.MouseEvent, doc: DocumentItem) => {
    e.stopPropagation();
    setEditingId(doc.id);
    // Remove extension for editing
    const nameWithoutExt = doc.name.replace(/\.[^/.]+$/, "");
    setEditingName(nameWithoutExt);
  };

  const handleRenameKeyDown = async (
    e: React.KeyboardEvent,
    doc: DocumentItem
  ) => {
    if (e.key === "Enter") {
      await saveRename(doc);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  const saveRename = async (doc: DocumentItem) => {
    if (!onRename || !editingName.trim()) {
      setEditingId(null);
      return;
    }
    // Get original extension
    const ext = doc.name.split(".").pop() || "";
    const newName = `${editingName.trim()}.${ext}`;
    
    if (newName !== doc.name) {
      setLoadingAction(`rename-${doc.id}`);
      try {
        await onRename(doc, newName);
      } finally {
        setLoadingAction(null);
      }
    }
    setEditingId(null);
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FolderOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No documents yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Upload CIMs, financials, and deal documents to get started
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30 border-b border-border">
          <Checkbox
            checked={selectedDocuments.size === documents.length && documents.length > 0}
            onCheckedChange={onSelectAll}
            className="mr-1"
          />
          <span className="flex-1">Name</span>
          <span className="w-16 text-center">Type</span>
          <span className="w-20 text-right">Size</span>
          <span className="w-28">Uploaded</span>
          <span className="w-20">Status</span>
          <span className="w-24">Actions</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {documents.map((doc) => {
            const isModel = doc.id.startsWith("model-");
            const isLoading = loadingAction?.includes(doc.id);
            const isEditing = editingId === doc.id;

            return (
              <div
                key={doc.id}
                className={cn(
                  "flex items-center gap-4 px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer group",
                  selectedDocuments.has(doc.id) && "bg-primary/5"
                )}
                onClick={() => onView(doc)}
              >
                <Checkbox
                  checked={selectedDocuments.has(doc.id)}
                  onCheckedChange={() => onToggleSelect(doc.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getFileIcon(doc.type)}
                  {isEditing ? (
                    <Input
                      ref={inputRef}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => handleRenameKeyDown(e, doc)}
                      onBlur={() => saveRename(doc)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 text-sm py-0"
                    />
                  ) : (
                    <span
                      className="font-medium text-foreground truncate"
                      onDoubleClick={(e) => !isModel && startRename(e, doc)}
                    >
                      {doc.name}
                    </span>
                  )}
                </div>
                <span className="w-16 text-center text-xs text-muted-foreground uppercase">
                  {doc.type}
                </span>
                <span className="w-20 text-right text-xs text-muted-foreground font-mono">
                  {doc.size}
                </span>
                <span className="w-28 text-xs text-muted-foreground truncate">
                  {doc.uploadedAt}
                </span>
                <span className="w-20">{getStatusBadge(doc.status)}</span>
                
                {/* Hover actions */}
                <div className="w-24 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {doc.filePath && onDownload && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => handleDownload(e, doc)}
                      disabled={isLoading}
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {!isModel && onRename && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => startRename(e, doc)}
                      disabled={isLoading}
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => e.stopPropagation()}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(doc); }}>
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleCopyLink(e, doc)}>
                        <Link2 className="mr-2 h-4 w-4" />
                        Copy link
                      </DropdownMenuItem>
                      
                      {!isModel && onMoveToFolder && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <FolderInput className="mr-2 h-4 w-4" />
                              Move
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-48">
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
                        </>
                      )}

                      {!isModel && onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => handleDeleteClick(e, doc)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
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
