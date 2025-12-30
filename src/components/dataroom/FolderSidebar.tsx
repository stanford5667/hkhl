import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Building2,
  Files,
  Loader2,
  Plus,
} from "lucide-react";

export interface FolderNode {
  id: string;
  name: string;
  count?: number;
  children?: FolderNode[];
}

interface Company {
  id: string;
  name: string;
}

interface FolderSidebarProps {
  companies: Company[];
  selectedCompanyId: string;
  onSelectCompany: (id: string) => void;
  companiesLoading: boolean;
  folders: FolderNode[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string, path: string[]) => void;
  documentCounts: Record<string, number>;
  totalDocuments: number;
}

export function FolderSidebar({
  companies,
  selectedCompanyId,
  onSelectCompany,
  companiesLoading,
  folders,
  selectedFolderId,
  onSelectFolder,
  documentCounts,
  totalDocuments,
}: FolderSidebarProps) {
  return (
    <div className="w-56 border-r border-border flex flex-col bg-muted/30">
      {/* Company Selector */}
      <div className="p-3 border-b border-border">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Company
        </label>
        {companiesLoading ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : companies.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-2">
            No companies
          </div>
        ) : (
          <Select value={selectedCompanyId} onValueChange={onSelectCompany}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{company.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Folder Navigation */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <div className="space-y-1">
          {/* All Files */}
          <button
            onClick={() => onSelectFolder("all", ["All Files"])}
            className={cn(
              "flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm transition-colors",
              selectedFolderId === "all"
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground hover:bg-muted"
            )}
          >
            <div className="flex items-center gap-2">
              <Files className="h-4 w-4" />
              <span>All Files</span>
            </div>
            <Badge variant="secondary" className="text-xs h-5 px-1.5">
              {totalDocuments}
            </Badge>
          </button>

          <div className="h-px bg-border my-2" />

          {/* Folder Tree */}
          <FolderTreeRecursive
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={onSelectFolder}
            documentCounts={documentCounts}
            level={0}
            parentPath={[]}
          />
        </div>
      </div>
    </div>
  );
}

interface FolderTreeRecursiveProps {
  folders: FolderNode[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string, path: string[]) => void;
  documentCounts: Record<string, number>;
  level: number;
  parentPath: string[];
}

function FolderTreeRecursive({
  folders,
  selectedFolderId,
  onSelectFolder,
  documentCounts,
  level,
  parentPath,
}: FolderTreeRecursiveProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["financial", "legal", "deal-docs"])
  );

  const toggleExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  return (
    <ul className={cn("space-y-0.5", level > 0 && "ml-3 mt-0.5")}>
      {folders.map((folder) => {
        const isExpanded = expandedFolders.has(folder.id);
        const isSelected = selectedFolderId === folder.id;
        const hasChildren = folder.children && folder.children.length > 0;
        const currentPath = [...parentPath, folder.name];
        const count = documentCounts[folder.id] || 0;

        return (
          <li key={folder.id}>
            <button
              onClick={() => onSelectFolder(folder.id, currentPath)}
              className={cn(
                "flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm transition-colors group",
                isSelected
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {hasChildren ? (
                  <span
                    onClick={(e) => toggleExpand(folder.id, e)}
                    className="p-0.5 hover:bg-muted rounded cursor-pointer"
                  >
                    <ChevronRight
                      className={cn(
                        "h-3 w-3 transition-transform",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </span>
                ) : (
                  <span className="w-4" />
                )}
                {isExpanded ? (
                  <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                ) : (
                  <Folder className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate">{folder.name}</span>
              </div>
              {count > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs h-4 px-1 ml-1 opacity-60 group-hover:opacity-100"
                >
                  {count}
                </Badge>
              )}
            </button>
            {hasChildren && isExpanded && (
              <FolderTreeRecursive
                folders={folder.children!}
                selectedFolderId={selectedFolderId}
                onSelectFolder={onSelectFolder}
                documentCounts={documentCounts}
                level={level + 1}
                parentPath={currentPath}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
