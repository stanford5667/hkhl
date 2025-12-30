import { useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, Sparkles, FileUp, X, CheckCircle, Loader2, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { triggerDocumentProcessing } from "@/hooks/useAppData";

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "processing" | "complete" | "error";
  error?: string;
}

interface InlineUploadZoneProps {
  companyId: string;
  folder?: string;
  subfolder?: string;
  onUploadComplete?: () => void;
  triggerProcessing?: boolean;
  className?: string;
}

export function InlineUploadZone({
  companyId,
  folder = "General",
  subfolder,
  onUploadComplete,
  triggerProcessing = true,
  className,
}: InlineUploadZoneProps) {
  const { user } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadingFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const uploadFile = async (file: File): Promise<boolean> => {
    const id = Math.random().toString(36).slice(2);
    
    if (!user || !companyId) {
      toast.error("Cannot upload: no company selected");
      return false;
    }

    setUploads((prev) => [
      ...prev,
      { id, file, progress: 0, status: "uploading" },
    ]);

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${user.id}/${companyId}/${timestamp}_${sanitizedName}`;

      // Update progress
      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, progress: 30 } : u))
      );

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, progress: 70 } : u))
      );

      // Get AI suggestion for folder
      let suggestedFolder = folder;
      let suggestedSubfolder = subfolder;
      
      try {
        const { data: suggestion } = await supabase.functions.invoke("suggest-folder", {
          body: { fileName: file.name, fileType: fileExt },
        });
        if (suggestion?.folder) {
          suggestedFolder = suggestion.folder;
          suggestedSubfolder = suggestion.subfolder;
        }
      } catch {
        // Use defaults if suggestion fails
      }

      const { error } = await supabase
        .from("documents")
        .insert({
          company_id: companyId,
          user_id: user.id,
          name: file.name,
          file_path: filePath,
          file_type: fileExt,
          file_size: file.size,
          folder: suggestedFolder,
          subfolder: suggestedSubfolder,
        });

      if (error) throw error;

      setUploads((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, progress: 100, status: "complete" } : u
        )
      );

      toast.success(`${file.name} uploaded`);
      
      // Auto-remove after 2 seconds
      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.id !== id));
      }, 2000);

      return true;
    } catch (error) {
      console.error("Upload error:", error);
      setUploads((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, status: "error", error: "Upload failed" } : u
        )
      );
      toast.error(`Failed to upload ${file.name}`);
      return false;
    }
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      let uploadedCount = 0;
      
      for (const file of fileArray) {
        const success = await uploadFile(file);
        if (success) uploadedCount++;
      }
      
      // Trigger AI processing after all uploads complete
      if (uploadedCount > 0 && triggerProcessing) {
        // Clear any existing timeout
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
        }
        
        // Debounce processing trigger (wait 1s for more uploads)
        processingTimeoutRef.current = setTimeout(async () => {
          setIsProcessing(true);
          toast.info("Starting AI analysis of uploaded documents...", {
            icon: <Brain className="h-4 w-4 animate-pulse" />,
          });
          
          try {
            const result = await triggerDocumentProcessing(companyId);
            if (result.error) {
              console.error("Processing error:", result.error);
            } else {
              toast.success(`AI processed ${result.data?.processed || uploadedCount} document(s)`);
            }
          } catch (e) {
            console.error("Failed to trigger processing:", e);
          } finally {
            setIsProcessing(false);
            onUploadComplete?.();
          }
        }, 1000);
      } else {
        onUploadComplete?.();
      }
    },
    [user, companyId, folder, subfolder, triggerProcessing, onUploadComplete]
  );

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

  const hasActiveUploads = uploads.length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Always-visible drop zone */}
      <Card
        className={cn(
          "border-2 border-dashed transition-all cursor-pointer",
          isDragOver
            ? "border-primary bg-primary/5 shadow-lg"
            : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <label className="flex items-center justify-center gap-3 py-4 px-4 cursor-pointer">
          <input
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInput}
            accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.pptx,.ppt"
          />
          <div
            className={cn(
              "p-2 rounded-full transition-colors",
              isProcessing
                ? "bg-primary/20"
                : isDragOver 
                  ? "bg-primary/10" 
                  : "bg-muted"
            )}
          >
            {isProcessing ? (
              <Brain className="h-4 w-4 text-primary animate-pulse" />
            ) : (
              <Upload
                className={cn(
                  "h-4 w-4",
                  isDragOver ? "text-primary" : "text-muted-foreground"
                )}
              />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {isProcessing ? "AI is analyzing documents..." : "Drop files here or click to upload"}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {isProcessing ? (
                <>
                  <Brain className="h-3 w-3 text-primary animate-pulse" />
                  <span>Extracting key metrics and insights</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span>AI auto-extracts data after upload</span>
                </>
              )}
            </div>
          </div>
        </label>
      </Card>

      {/* Upload progress toasts (inline, not blocking) */}
      {hasActiveUploads && (
        <div className="space-y-2">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center gap-3 p-2 rounded-md bg-muted/50 text-sm"
            >
              {upload.status === "uploading" ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              ) : upload.status === "complete" ? (
                <CheckCircle className="h-4 w-4 text-success shrink-0" />
              ) : (
                <FileUp className="h-4 w-4 text-destructive shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-foreground">{upload.file.name}</p>
                {upload.status === "uploading" && (
                  <Progress value={upload.progress} className="h-1 mt-1" />
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatFileSize(upload.file.size)}
              </span>
              {upload.status !== "uploading" && (
                <button
                  onClick={() => removeUpload(upload.id)}
                  className="p-1 hover:bg-muted rounded"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
