import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  LayoutGrid,
  List,
  Loader2,
  FolderOpen,
  ChevronRight,
  FileText,
} from "lucide-react";
import { FolderSidebar, FolderNode } from "@/components/dataroom/FolderSidebar";
import { DocumentTable, DocumentItem } from "@/components/dataroom/DocumentTable";
import { InlineUploadZone } from "@/components/dataroom/InlineUploadZone";
import { DocumentPreview } from "@/components/dataroom/DocumentPreview";
import { DataRoomChecklist } from "@/components/dataroom/DataRoomChecklist";
import { SECFilingsPanel } from "@/components/dataroom/SECFilingsPanel";
import { useDocuments, DocumentRecord } from "@/hooks/useDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const folderStructure: FolderNode[] = [
  {
    id: "sec-filings",
    name: "SEC Filings",
    children: [
      { id: "10-k", name: "10-K Annual Reports" },
      { id: "10-q", name: "10-Q Quarterly" },
      { id: "8-k", name: "8-K Current Reports" },
      { id: "proxy", name: "Proxy Statements" },
    ],
  },
  {
    id: "financial",
    name: "Financial",
    children: [
      { id: "historical", name: "Historical Financials" },
      { id: "projections", name: "Projections & Models" },
      { id: "audit", name: "Audit Reports" },
      { id: "tax", name: "Tax Returns" },
    ],
  },
  {
    id: "legal",
    name: "Legal",
    children: [
      { id: "corporate", name: "Corporate Documents" },
      { id: "contracts", name: "Contracts & Agreements" },
      { id: "litigation", name: "Litigation" },
      { id: "ip", name: "IP & Patents" },
    ],
  },
  {
    id: "commercial",
    name: "Commercial",
    children: [
      { id: "customer", name: "Customer Data" },
      { id: "sales", name: "Sales Materials" },
      { id: "market", name: "Market Research" },
    ],
  },
  {
    id: "operations",
    name: "Operations",
    children: [
      { id: "hr", name: "HR & Org Charts" },
      { id: "it", name: "IT & Systems" },
      { id: "facilities", name: "Facilities" },
    ],
  },
  {
    id: "deal-docs",
    name: "Deal Documents",
    children: [
      { id: "cim", name: "CIM & Teasers" },
      { id: "loi", name: "LOI & Term Sheets" },
      { id: "ic-memos", name: "IC Memos" },
    ],
  },
  {
    id: "diligence",
    name: "Diligence Reports",
    children: [
      { id: "qoe", name: "Quality of Earnings" },
      { id: "legal-dd", name: "Legal Due Diligence" },
      { id: "commercial-dd", name: "Commercial Due Diligence" },
    ],
  },
];

interface ModelRecord {
  id: string;
  company_id: string;
  model_type: string;
  name: string;
  model_data: unknown;
  status: string | null;
  created_at: string;
  updated_at: string;
}

interface EmbeddedDataRoomProps {
  companyId: string;
  companyName: string;
  tickerSymbol?: string | null;
}

export function EmbeddedDataRoom({ companyId, companyName, tickerSymbol }: EmbeddedDataRoomProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    getDocumentsForCompany,
    deleteDocument,
    updateDocumentFolder,
    renameDocument,
    getDownloadUrl,
  } = useDocuments();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>("all");
  const [selectedPath, setSelectedPath] = useState<string[]>(["All Files"]);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [previewDocument, setPreviewDocument] = useState<DocumentItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch documents and models
  const refreshData = async () => {
    if (!companyId || !user) return;

    setLoading(true);
    try {
      const docs = await getDocumentsForCompany(companyId);
      setDocuments(docs);

      const { data: modelsData } = await supabase
        .from("models")
        .select("*")
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false });

      setModels(modelsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId && user) {
      refreshData();
    } else {
      setDocuments([]);
      setModels([]);
    }
  }, [companyId, user]);

  const handleSelectFolder = (folderId: string, path: string[]) => {
    setSelectedFolderId(folderId);
    setSelectedPath(path);
    setSelectedDocuments(new Set());
  };

  const handleToggleSelect = (docId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleView = (doc: DocumentItem) => {
    if (doc.id.startsWith("model-")) {
      const modelId = doc.id.replace("model-", "");
      navigate(`/models/view/${modelId}`);
    } else {
      setPreviewDocument(doc);
    }
  };

  const handleDownload = async (doc: DocumentItem) => {
    if (!doc.filePath) return;
    const url = await getDownloadUrl(doc.filePath);
    if (url) {
      window.open(url, "_blank");
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    const realId = doc.id.startsWith("doc-") ? doc.id.replace("doc-", "") : doc.id;
    const success = await deleteDocument(realId, doc.filePath);
    if (success) {
      refreshData();
    }
  };

  const handleRename = async (doc: DocumentItem, newName: string) => {
    const realId = doc.id.startsWith("doc-") ? doc.id.replace("doc-", "") : doc.id;
    const success = await renameDocument(realId, newName);
    if (success) {
      refreshData();
    }
  };

  const handleMoveToFolder = async (
    doc: DocumentItem,
    folder: string,
    subfolder?: string
  ) => {
    const realId = doc.id.startsWith("doc-") ? doc.id.replace("doc-", "") : doc.id;
    const success = await updateDocumentFolder(realId, folder, subfolder);
    if (success) {
      refreshData();
    }
  };

  // Calculate document counts per folder
  const documentCounts: Record<string, number> = {};
  documents.forEach((doc) => {
    const folderLower = doc.folder?.toLowerCase() || "";
    const subfolderLower = doc.subfolder?.toLowerCase() || "";
    if (folderLower) {
      documentCounts[folderLower] = (documentCounts[folderLower] || 0) + 1;
    }
    if (subfolderLower) {
      documentCounts[subfolderLower] = (documentCounts[subfolderLower] || 0) + 1;
    }
  });

  // Convert database records to display format
  const getDisplayItems = (): DocumentItem[] => {
    const items: DocumentItem[] = [];

    const filteredDocs = documents.filter((doc) => {
      if (selectedFolderId === "all") return true;
      const folderLower = doc.folder?.toLowerCase() || "";
      const subfolderLower = doc.subfolder?.toLowerCase() || "";
      return folderLower === selectedFolderId || subfolderLower === selectedFolderId;
    });

    filteredDocs.forEach((doc) => {
      const ext =
        doc.file_type?.toLowerCase() ||
        doc.name.split(".").pop()?.toLowerCase() ||
        "other";
      items.push({
        id: `doc-${doc.id}`,
        name: doc.name,
        type:
          ["xlsx", "xls"].includes(ext)
            ? "xlsx"
            : ext === "pdf"
            ? "pdf"
            : ext === "csv"
            ? "csv"
            : ext === "docx"
            ? "docx"
            : ext === "txt"
            ? "txt"
            : "other",
        size: doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : "—",
        uploadedAt: formatDistanceToNow(new Date(doc.created_at), { addSuffix: true }),
        uploadedBy: "You",
        status: "reviewed",
        filePath: doc.file_path,
        folder: doc.folder || undefined,
        subfolder: doc.subfolder || undefined,
      });
    });

    // Add models in relevant folders
    const showModels = selectedFolderId === "all" || selectedFolderId === "projections";
    if (showModels) {
      models.forEach((model) => {
        items.push({
          id: `model-${model.id}`,
          name: model.name,
          type: "xlsx",
          size: model.model_type,
          uploadedAt: formatDistanceToNow(new Date(model.updated_at), { addSuffix: true }),
          uploadedBy: "AI Generated",
          status: model.status === "final" ? "reviewed" : "pending",
        });
      });
    }

    // Filter by search
    if (searchQuery) {
      return items.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return items;
  };

  const displayItems = getDisplayItems();

  const handleSelectAll = () => {
    if (selectedDocuments.size === displayItems.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(displayItems.map((d) => d.id)));
    }
  };

  return (
    <div className="flex h-[600px] border border-border rounded-lg overflow-hidden bg-card">
      {/* Folder Sidebar - simplified version without company selector */}
      <div className="w-56 border-r border-border overflow-y-auto p-3 bg-muted/30">
        <div className="space-y-1">
          <Button
            variant={selectedFolderId === "all" ? "secondary" : "ghost"}
            size="sm"
            className="w-full justify-start text-sm"
            onClick={() => handleSelectFolder("all", ["All Files"])}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            All Files
            <span className="ml-auto text-xs text-muted-foreground">
              {documents.length + models.length}
            </span>
          </Button>
          
          {folderStructure.map((folder) => (
            <div key={folder.id} className="space-y-0.5">
              <Button
                variant={selectedFolderId === folder.id ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => handleSelectFolder(folder.id, [folder.name])}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                {folder.name}
                {documentCounts[folder.id] > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {documentCounts[folder.id]}
                  </span>
                )}
              </Button>
              {folder.children && (
                <div className="ml-4 space-y-0.5">
                  {folder.children.map((child) => (
                    <Button
                      key={child.id}
                      variant={selectedFolderId === child.id ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start text-xs h-7"
                      onClick={() => handleSelectFolder(child.id, [folder.name, child.name])}
                    >
                      {child.name}
                      {documentCounts[child.id] > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {documentCounts[child.id]}
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 p-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm">
            <FolderOpen className="h-4 w-4 text-primary" />
            {selectedPath.map((segment, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                <span
                  className={
                    i === selectedPath.length - 1
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {segment}
                </span>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-48 h-8"
              />
            </div>

            <div className="flex items-center border border-border rounded-md p-0.5">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-6 w-6"
                onClick={() => setViewMode("list")}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-6 w-6"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Show SEC Filings Panel when SEC Filings folder is selected */}
          {selectedFolderId === "sec-filings" || selectedFolderId === "10-k" || selectedFolderId === "10-q" || selectedFolderId === "8-k" || selectedFolderId === "proxy" ? (
            <SECFilingsPanel ticker={tickerSymbol || null} companyName={companyName} />
          ) : (
            <>
              {/* Upload zone */}
              <InlineUploadZone
                companyId={companyId}
                folder={selectedFolderId === "historical" ? "Financial" : "General"}
                subfolder={selectedFolderId === "historical" ? "Historical" : undefined}
                onUploadComplete={refreshData}
              />

              {/* Document Table */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <DocumentTable
                    documents={displayItems}
                    selectedDocuments={selectedDocuments}
                    onToggleSelect={handleToggleSelect}
                    onSelectAll={handleSelectAll}
                    onView={handleView}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                    onRename={handleRename}
                    onMoveToFolder={handleMoveToFolder}
                  />
                  {displayItems.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {displayItems.length} item{displayItems.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Sidebar - Checklist */}
      <div className="w-64 border-l border-border overflow-y-auto p-3 bg-muted/20">
        <DataRoomChecklist documents={documents} />
      </div>

      {/* Document Preview Modal */}
      <DocumentPreview
        open={!!previewDocument}
        document={
          previewDocument
            ? {
                id: previewDocument.id,
                name: previewDocument.name,
                type: previewDocument.type,
                size: previewDocument.size,
                uploadedAt: previewDocument.uploadedAt,
                uploadedBy: previewDocument.uploadedBy,
                status: previewDocument.status,
                filePath: previewDocument.filePath,
              }
            : null
        }
        onClose={() => setPreviewDocument(null)}
      />
    </div>
  );
}
