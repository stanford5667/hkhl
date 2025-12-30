import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  Trash2,
  Pencil,
  Eye,
  FolderOpen,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Document {
  id: string;
  name: string;
  file_type: string | null;
  file_path: string;
  folder: string | null;
  subfolder: string | null;
  file_size: number | null;
  doc_status: string | null;
  created_at: string;
  updated_at: string;
}

interface CompanyDocumentListProps {
  documents: Document[];
  onRename?: (docId: string, newName: string) => Promise<void>;
  onDelete?: (docId: string) => Promise<void>;
  onStatusChange?: (docId: string, status: string) => Promise<void>;
}

export function CompanyDocumentList({ 
  documents, 
  onRename,
  onDelete,
  onStatusChange 
}: CompanyDocumentListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const getFileIcon = (fileType: string | null) => {
    const type = fileType?.toLowerCase() || '';
    if (['xlsx', 'xls', 'csv'].includes(type)) {
      return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
    }
    if (type === 'pdf') {
      return <FileText className="h-5 w-5 text-rose-500" />;
    }
    if (['doc', 'docx'].includes(type)) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    }
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'needs_review':
        return (
          <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Needs Review
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-rose-600/20 text-rose-400 border-rose-600/30">
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDeleteClick = (doc: Document) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!documentToDelete || !onDelete) return;
    await onDelete(documentToDelete.id);
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const startRename = (doc: Document) => {
    setEditingId(doc.id);
    const nameWithoutExt = doc.name.replace(/\.[^/.]+$/, "");
    setEditingName(nameWithoutExt);
  };

  const saveRename = async (doc: Document) => {
    if (!onRename || !editingName.trim()) {
      setEditingId(null);
      return;
    }
    const ext = doc.name.split(".").pop() || "";
    const newName = ext ? `${editingName.trim()}.${ext}` : editingName.trim();
    
    if (newName !== doc.name) {
      await onRename(doc.id, newName);
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
          Upload documents to get started
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30 border-b border-border">
          <span className="flex-1">Name</span>
          <span className="w-20 text-right">Size</span>
          <span className="w-28">Uploaded</span>
          <span className="w-28">Status</span>
          <span className="w-10"></span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {documents.map((doc) => {
            const isEditing = editingId === doc.id;

            return (
              <div
                key={doc.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileIcon(doc.file_type)}
                  {isEditing ? (
                    <Input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename(doc);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={() => saveRename(doc)}
                      className="h-7 text-sm"
                    />
                  ) : (
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{doc.name}</p>
                      {doc.folder && (
                        <p className="text-xs text-muted-foreground">{doc.folder}</p>
                      )}
                    </div>
                  )}
                </div>
                
                <span className="w-20 text-right text-sm text-muted-foreground">
                  {formatFileSize(doc.file_size)}
                </span>
                
                <span className="w-28 text-sm text-muted-foreground">
                  {format(new Date(doc.created_at), 'MMM d, yyyy')}
                </span>
                
                <div className="w-28">
                  {getStatusBadge(doc.doc_status)}
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => window.open(doc.file_path, '_blank')}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </DropdownMenuItem>
                    {onRename && (
                      <DropdownMenuItem onClick={() => startRename(doc)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                    )}
                    {onStatusChange && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onStatusChange(doc.id, 'approved')}>
                          <CheckCircle className="mr-2 h-4 w-4 text-emerald-400" />
                          Mark Approved
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusChange(doc.id, 'needs_review')}>
                          <AlertTriangle className="mr-2 h-4 w-4 text-yellow-400" />
                          Needs Review
                        </DropdownMenuItem>
                      </>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteClick(doc)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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
