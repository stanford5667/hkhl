import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileUp, X, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "complete" | "error";
  error?: string;
}

interface UploadZoneProps {
  companyId?: string;
  folder?: string;
  subfolder?: string;
  onUploadComplete?: (files: File[]) => void;
}

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

  const uploadFile = async (file: File, id: string) => {
    if (!user || !companyId) {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, status: "error" as const, error: "No company selected" } : u
        )
      );
      return;
    }

    try {
      // Simulate progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 20;
        if (progress <= 80) {
          setUploads((prev) =>
            prev.map((u) => (u.id === id ? { ...u, progress } : u))
          );
        }
      }, 100);

      // Get file extension
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';

      // Save document record to database
      const { data, error } = await supabase
        .from('documents')
        .insert({
          company_id: companyId,
          user_id: user.id,
          name: file.name,
          file_path: `uploads/${companyId}/${file.name}`,
          file_type: fileExt,
          file_size: file.size,
          folder: folder,
          subfolder: subfolder
        })
        .select()
        .single();

      clearInterval(progressInterval);

      if (error) throw error;

      setUploads((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, progress: 100, status: "complete" as const } : u
        )
      );

      toast.success(`${file.name} uploaded successfully`);
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

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newUploads: UploadFile[] = fileArray.map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      progress: 0,
      status: "uploading" as const,
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    // Upload each file
    newUploads.forEach((upload) => {
      uploadFile(upload.file, upload.id);
    });

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

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
          "flex flex-col items-center justify-center py-12",
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
              "p-4 rounded-full mb-4 transition-colors",
              isDragOver ? "bg-primary/10" : "bg-secondary"
            )}
          >
            <Upload
              className={cn(
                "h-8 w-8",
                isDragOver ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            {companyId ? "Drop files here" : "Select a company first"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {companyId ? "or click to browse" : "Choose a company to upload documents"}
          </p>
          <p className="text-xs text-muted-foreground">
            Supported: PDF, Excel, Word, PowerPoint, CSV
          </p>
        </label>
      </Card>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Uploads</h4>
          {uploads.map((upload) => (
            <Card key={upload.id} className="p-3">
              <div className="flex items-center gap-3">
                <FileUp className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground truncate">
                      {upload.file.name}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatFileSize(upload.file.size)}
                    </span>
                  </div>
                  {upload.status === "uploading" && (
                    <Progress value={upload.progress} className="h-1" />
                  )}
                  {upload.status === "error" && (
                    <p className="text-xs text-destructive">{upload.error}</p>
                  )}
                </div>
                {upload.status === "complete" && (
                  <CheckCircle className="h-5 w-5 text-success" />
                )}
                {upload.status === "error" && (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeUpload(upload.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
