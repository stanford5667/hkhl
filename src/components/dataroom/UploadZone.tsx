import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileUp, X, CheckCircle, AlertCircle, Sparkles, Loader2, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FolderSuggestion {
  folder: string;
  subfolder: string;
  confidence: "high" | "medium" | "low";
  reason: string;
}

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "analyzing" | "uploading" | "complete" | "error";
  error?: string;
  suggestion?: FolderSuggestion;
  selectedFolder?: string;
  selectedSubfolder?: string;
}

interface UploadZoneProps {
  companyId?: string;
  folder?: string;
  subfolder?: string;
  onUploadComplete?: (files: File[]) => void;
}

const folderOptions = [
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

export function UploadZone({ companyId, folder = "General", subfolder, onUploadComplete }: UploadZoneProps) {
  const { user } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadFile[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const getSuggestion = async (file: File, id: string): Promise<FolderSuggestion | null> => {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      
      const { data, error } = await supabase.functions.invoke('suggest-folder', {
        body: { fileName: file.name, fileType: fileExt }
      });

      if (error) {
        console.error('Suggestion error:', error);
        return null;
      }

      return data as FolderSuggestion;
    } catch (error) {
      console.error('Error getting suggestion:', error);
      return null;
    }
  };

  const uploadFile = async (upload: UploadFile) => {
    const { id, file, selectedFolder, selectedSubfolder } = upload;
    
    if (!user || !companyId) {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, status: "error" as const, error: "No company selected" } : u
        )
      );
      return;
    }

    const folderToUse = selectedFolder || folder;
    const subfolderToUse = selectedSubfolder || subfolder;

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${user.id}/${companyId}/${timestamp}_${sanitizedName}`;

      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: "uploading" as const, progress: 30 } : u))
      );

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, progress: 70 } : u))
      );

      const { error } = await supabase
        .from('documents')
        .insert({
          company_id: companyId,
          user_id: user.id,
          name: file.name,
          file_path: filePath,
          file_type: fileExt,
          file_size: file.size,
          folder: folderToUse,
          subfolder: subfolderToUse
        })
        .select()
        .single();

      if (error) throw error;

      setUploads((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, progress: 100, status: "complete" as const } : u
        )
      );

      toast.success(`${file.name} uploaded to ${folderToUse}${subfolderToUse ? ` / ${subfolderToUse}` : ''}`);
    } catch (error) {
      console.error('Upload error:', error);
      setUploads((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, status: "error" as const, error: "Upload failed" } : u
        )
      );
      toast.error(`Failed to upload ${file.name}`);
    }
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newUploads: UploadFile[] = fileArray.map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      progress: 0,
      status: "analyzing" as const,
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    // Get AI suggestions for each file
    for (const upload of newUploads) {
      const suggestion = await getSuggestion(upload.file, upload.id);
      
      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? {
                ...u,
                status: "pending" as const,
                suggestion: suggestion || undefined,
                selectedFolder: suggestion?.folder,
                selectedSubfolder: suggestion?.subfolder,
              }
            : u
        )
      );
    }

    onUploadComplete?.(fileArray);
  }, [companyId, user, folder, subfolder, onUploadComplete]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const handleFolderChange = (uploadId: string, folderId: string) => {
    const folder = folderOptions.find(f => f.id === folderId);
    setUploads((prev) =>
      prev.map((u) =>
        u.id === uploadId
          ? { ...u, selectedFolder: folderId, selectedSubfolder: folder?.subfolders[0]?.id }
          : u
      )
    );
  };

  const handleSubfolderChange = (uploadId: string, subfolderId: string) => {
    setUploads((prev) =>
      prev.map((u) =>
        u.id === uploadId ? { ...u, selectedSubfolder: subfolderId } : u
      )
    );
  };

  const handleUploadFile = (upload: UploadFile) => {
    uploadFile(upload);
  };

  const handleUploadAll = () => {
    const pendingUploads = uploads.filter(u => u.status === "pending");
    pendingUploads.forEach(upload => uploadFile(upload));
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "high":
        return <Badge variant="success" className="text-xs">High confidence</Badge>;
      case "medium":
        return <Badge variant="warning" className="text-xs">Medium</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Low</Badge>;
    }
  };

  const pendingCount = uploads.filter(u => u.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card
        className={cn(
          "border-2 border-dashed transition-all cursor-pointer",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/50",
          !companyId && "opacity-50 cursor-not-allowed"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <label className={cn(
          "flex flex-col items-center justify-center py-8",
          companyId ? "cursor-pointer" : "cursor-not-allowed"
        )}>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInput}
            accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.pptx,.ppt"
            disabled={!companyId}
          />
          <div
            className={cn(
              "p-3 rounded-full mb-3 transition-colors",
              isDragOver ? "bg-primary/10" : "bg-secondary"
            )}
          >
            <Upload
              className={cn(
                "h-6 w-6",
                isDragOver ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
          <h3 className="text-base font-medium text-foreground mb-1">
            {companyId ? "Drop files here" : "Select a company first"}
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            {companyId ? "or click to browse" : "Choose a company to upload documents"}
          </p>
          <div className="flex items-center gap-1 text-xs text-primary">
            <Sparkles className="h-3 w-3" />
            <span>AI will suggest the best folder</span>
          </div>
        </label>
      </Card>

      {/* Upload List */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">Files to upload</h4>
            {pendingCount > 0 && (
              <Button size="sm" onClick={handleUploadAll}>
                Upload All ({pendingCount})
              </Button>
            )}
          </div>

          {uploads.map((upload) => {
            const selectedFolderObj = folderOptions.find(f => f.id === upload.selectedFolder);
            
            return (
              <Card key={upload.id} className="p-4">
                <div className="space-y-3">
                  {/* File info row */}
                  <div className="flex items-center gap-3">
                    <FileUp className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate block">
                        {upload.file.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(upload.file.size)}
                      </span>
                    </div>
                    
                    {upload.status === "analyzing" && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs">Analyzing...</span>
                      </div>
                    )}
                    {upload.status === "complete" && (
                      <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    )}
                    {upload.status === "error" && (
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                    )}
                    
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeUpload(upload.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* AI Suggestion */}
                  {upload.suggestion && upload.status === "pending" && (
                    <div className="flex items-start gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                      <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-foreground">AI Suggestion:</span>
                          {getConfidenceBadge(upload.suggestion.confidence)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {upload.suggestion.reason}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Folder Selection */}
                  {upload.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Select
                        value={upload.selectedFolder || ""}
                        onValueChange={(val) => handleFolderChange(upload.id, val)}
                      >
                        <SelectTrigger className="h-8 flex-1">
                          <SelectValue placeholder="Select folder" />
                        </SelectTrigger>
                        <SelectContent>
                          {folderOptions.map((folder) => (
                            <SelectItem key={folder.id} value={folder.id}>
                              {folder.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {selectedFolderObj && (
                        <Select
                          value={upload.selectedSubfolder || ""}
                          onValueChange={(val) => handleSubfolderChange(upload.id, val)}
                        >
                          <SelectTrigger className="h-8 flex-1">
                            <SelectValue placeholder="Subfolder" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedFolderObj.subfolders.map((sub) => (
                              <SelectItem key={sub.id} value={sub.id}>
                                {sub.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      <Button size="sm" onClick={() => handleUploadFile(upload)}>
                        Upload
                      </Button>
                    </div>
                  )}

                  {/* Upload Progress */}
                  {upload.status === "uploading" && (
                    <Progress value={upload.progress} className="h-1.5" />
                  )}

                  {/* Error */}
                  {upload.status === "error" && (
                    <p className="text-xs text-destructive">{upload.error}</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
