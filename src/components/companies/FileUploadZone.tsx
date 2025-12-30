import { useState, useRef } from 'react';
import { Upload, X, FileText, FileSpreadsheet, FileImage, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface UploadFile {
  file: File;
  documentType: string;
}

interface FileUploadZoneProps {
  files: UploadFile[];
  onChange: (files: UploadFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

const DOCUMENT_TYPES = [
  { value: 'cim', label: 'CIM / Teaser' },
  { value: 'financial_statements', label: 'Financial Statements' },
  { value: 'management_presentation', label: 'Management Deck' },
  { value: 'cap_table', label: 'Cap Table' },
  { value: 'qoe', label: 'Quality of Earnings' },
  { value: 'customer_list', label: 'Customer List' },
  { value: 'legal', label: 'Legal Documents' },
  { value: 'other', label: 'Other' },
];

function detectDocumentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('cim') || lower.includes('teaser') || lower.includes('memorandum')) return 'cim';
  if (lower.includes('financial') || lower.includes('income') || lower.includes('balance') || lower.includes('statement')) return 'financial_statements';
  if (lower.includes('cap') && lower.includes('table')) return 'cap_table';
  if (lower.includes('presentation') || lower.includes('deck') || lower.includes('management')) return 'management_presentation';
  if (lower.includes('qoe') || lower.includes('quality') || lower.includes('earnings')) return 'qoe';
  if (lower.includes('customer') || lower.includes('client')) return 'customer_list';
  if (lower.includes('legal') || lower.includes('contract') || lower.includes('agreement')) return 'legal';
  return 'other';
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-400" />;
    case 'xlsx':
    case 'xls':
      return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
    case 'docx':
    case 'doc':
      return <FileText className="h-5 w-5 text-blue-400" />;
    case 'pptx':
    case 'ppt':
      return <FileImage className="h-5 w-5 text-orange-400" />;
    default:
      return <File className="h-5 w-5 text-muted-foreground" />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadZone({ 
  files, 
  onChange, 
  maxFiles = 10, 
  maxSizeMB = 50 
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const addFiles = (newFiles: File[]) => {
    const validTypes = ['pdf', 'xlsx', 'xls', 'docx', 'doc', 'pptx', 'ppt'];
    const maxSize = maxSizeMB * 1024 * 1024;
    
    const validFiles = newFiles.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return validTypes.includes(ext || '') && f.size <= maxSize;
    });

    const withTypes: UploadFile[] = validFiles.map(file => ({
      file,
      documentType: detectDocumentType(file.name)
    }));

    onChange([...files, ...withTypes].slice(0, maxFiles));
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  const updateType = (index: number, type: string) => {
    const updated = [...files];
    updated[index].documentType = type;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragging 
            ? "border-primary bg-primary/10" 
            : "border-border hover:border-muted-foreground"
        )}
      >
        <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-foreground font-medium">Drop files here or click to browse</p>
        <p className="text-muted-foreground text-sm mt-1">
          PDF, Excel, Word, PowerPoint up to {maxSizeMB}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt"
          onChange={(e) => addFiles(Array.from(e.target.files || []))}
          className="hidden"
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((item, index) => (
            <div 
              key={index} 
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border"
            >
              {getFileIcon(item.file.name)}
              
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm truncate">{item.file.name}</p>
                <p className="text-muted-foreground text-xs">{formatFileSize(item.file.size)}</p>
              </div>
              
              <Select 
                value={item.documentType} 
                onValueChange={(v) => updateType(index, v)}
              >
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => { e.stopPropagation(); removeFile(index); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
