import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";

export interface FolderNode {
  id: string;
  name: string;
  children?: FolderNode[];
}

interface FolderTreeProps {
  folders: FolderNode[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string, path: string[]) => void;
  level?: number;
  parentPath?: string[];
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  level = 0,
  parentPath = [],
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["financial", "legal", "commercial", "deal-docs"])
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
    <ul className={cn("space-y-0.5", level > 0 && "ml-4 mt-0.5")}>
      {folders.map((folder) => {
        const isExpanded = expandedFolders.has(folder.id);
        const isSelected = selectedFolderId === folder.id;
        const hasChildren = folder.children && folder.children.length > 0;
        const currentPath = [...parentPath, folder.name];

        return (
          <li key={folder.id}>
            <button
              onClick={() => onSelectFolder(folder.id, currentPath)}
              className={cn(
                "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                isSelected
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {hasChildren ? (
                <span
                  onClick={(e) => toggleExpand(folder.id, e)}
                  className="p-0.5 hover:bg-secondary rounded cursor-pointer"
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
                <FolderOpen className="h-4 w-4 text-primary" />
              ) : (
                <Folder className="h-4 w-4" />
              )}
              <span className="truncate">{folder.name}</span>
            </button>
            {hasChildren && isExpanded && (
              <FolderTree
                folders={folder.children!}
                selectedFolderId={selectedFolderId}
                onSelectFolder={onSelectFolder}
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
