import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Upload,
  FolderPlus,
  LayoutGrid,
  List,
  Search,
  ChevronRight,
  HardDrive,
  Building2,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { FolderTree, FolderNode } from "@/components/dataroom/FolderTree";
import { DocumentList, Document as DocumentDisplay } from "@/components/dataroom/DocumentList";
import { UploadZone } from "@/components/dataroom/UploadZone";
import { DataRoomChecklist } from "@/components/dataroom/DataRoomChecklist";
import { DocumentDetailsPanel } from "@/components/dataroom/DocumentDetailsPanel";
import { DocumentPreview } from "@/components/dataroom/DocumentPreview";
import { Input } from "@/components/ui/input";
import { useCompanies } from "@/hooks/useCompanies";
import { useDocuments, DocumentRecord } from "@/hooks/useDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const folderStructure: FolderNode[] = [
  { id: "all", name: "All Files" },
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
  model_data: any;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export default function DataRoom() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const companyFromUrl = searchParams.get('company');
  
  const { user } = useAuth();
  const { companies, loading: companiesLoading } = useCompanies();
  const { getDocumentsForCompany, deleteDocument, updateDocumentFolder, getDownloadUrl } = useDocuments();

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>("all");
  const [selectedPath, setSelectedPath] = useState<string[]>(["All Files"]);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<DocumentDisplay | null>(null);
  const [detailsDocument, setDetailsDocument] = useState<{ id: string; name: string; type: string; size: string; filePath?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Handle company from URL
  useEffect(() => {
    if (companyFromUrl && companies.length > 0) {
      const exists = companies.some(c => c.id === companyFromUrl);
      if (exists) {
        setSelectedCompanyId(companyFromUrl);
      }
    }
  }, [companyFromUrl, companies]);

  // Set first company as default
  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId && !companyFromUrl) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId, companyFromUrl]);

  // Fetch documents and models
  const refreshData = async () => {
    if (!selectedCompanyId || !user) return;

    setLoading(true);
    try {
      const docs = await getDocumentsForCompany(selectedCompanyId);
      setDocuments(docs);

      const { data: modelsData } = await supabase
        .from("models")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .order("updated_at", { ascending: false });

      setModels(modelsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompanyId && user) {
      refreshData();
    } else {
      setDocuments([]);
      setModels([]);
    }
  }, [selectedCompanyId, user]);

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

  const handleViewItem = (doc: DocumentDisplay) => {
    if (doc.id.startsWith("model-")) {
      const modelId = doc.id.replace("model-", "");
      navigate(`/models/view/${modelId}`);
    } else {
      setPreviewDocument(doc);
    }
  };

  const handleOpenDetails = (doc: DocumentDisplay) => {
    const realId = doc.id.startsWith("doc-") ? doc.id.replace("doc-", "") : doc.id;
    setDetailsDocument({
      id: realId,
      name: doc.name,
      type: doc.type,
      size: doc.size,
      filePath: doc.filePath,
    });
  };

  const handleDownload = async (doc: DocumentDisplay) => {
    if (!doc.filePath) return;
    const url = await getDownloadUrl(doc.filePath);
    if (url) {
      window.open(url, "_blank");
    }
  };

  const handleDelete = async (doc: DocumentDisplay) => {
    const realId = doc.id.startsWith("doc-") ? doc.id.replace("doc-", "") : doc.id;
    const success = await deleteDocument(realId, doc.filePath);
    if (success) {
      refreshData();
    }
  };

  const handleMoveToFolder = async (doc: DocumentDisplay, folder: string, subfolder?: string) => {
    const realId = doc.id.startsWith("doc-") ? doc.id.replace("doc-", "") : doc.id;
    const success = await updateDocumentFolder(realId, folder, subfolder);
    if (success) {
      refreshData();
    }
  };

  // Convert database records to display format
  const getDisplayItems = (): DocumentDisplay[] => {
    const items: DocumentDisplay[] = [];

    const filteredDocs = documents.filter((doc) => {
      if (selectedFolderId === "all") return true;
      const folderLower = doc.folder?.toLowerCase() || "";
      const subfolderLower = doc.subfolder?.toLowerCase() || "";
      return folderLower === selectedFolderId || subfolderLower === selectedFolderId;
    });

    filteredDocs.forEach((doc) => {
      const ext = doc.file_type?.toLowerCase() || doc.name.split(".").pop()?.toLowerCase() || "other";
      items.push({
        id: `doc-${doc.id}`,
        name: doc.name,
        type: ["xlsx", "xls"].includes(ext) ? "xlsx" : ext === "pdf" ? "pdf" : ext === "csv" ? "csv" : ext === "docx" ? "docx" : ext === "txt" ? "txt" : "other",
        size: doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : "—",
        uploadedAt: formatDistanceToNow(new Date(doc.created_at), { addSuffix: true }),
        uploadedBy: "You",
        status: "reviewed",
        filePath: doc.file_path,
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
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  const handleSelectAll = () => {
    if (selectedDocuments.size === displayItems.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(displayItems.map((d) => d.id)));
    }
  };

  const storageUsed = documents.reduce((acc, doc) => acc + (doc.file_size || 0), 0) / (1024 * 1024);
  const storageTotal = 10;
  const storagePercent = Math.min((storageUsed / storageTotal) * 100, 100);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to access Data Room</h2>
          <p className="text-muted-foreground">Your documents are stored securely.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-border flex flex-col bg-card/30">
        <div className="p-4 border-b border-border">
          {companiesLoading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : companies.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-2">No companies yet</div>
          ) : (
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {company.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <FolderTree
            folders={folderStructure}
            selectedFolderId={selectedFolderId}
            onSelectFolder={handleSelectFolder}
          />
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Storage</span>
          </div>
          <Progress value={storagePercent} className="h-1.5 mb-1" />
          <p className="text-xs text-muted-foreground">
            {storageUsed.toFixed(1)} MB / {storageTotal} GB used
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              {selectedCompany && (
                <>
                  <span>{selectedCompany.name}</span>
                  <ChevronRight className="h-3 w-3" />
                </>
              )}
              {selectedPath.map((segment, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight className="h-3 w-3" />}
                  <span className={i === selectedPath.length - 1 ? "text-foreground" : ""}>{segment}</span>
                </span>
              ))}
            </div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              {selectedPath[selectedPath.length - 1] || "Data Room"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>

            <div className="flex items-center border border-border rounded-lg p-1">
              <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon-sm" onClick={() => setViewMode("list")}>
                <List className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon-sm" onClick={() => setViewMode("grid")}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm">
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </Button>

            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={!selectedCompanyId}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Upload Documents</DialogTitle>
                </DialogHeader>
                <UploadZone
                  companyId={selectedCompanyId}
                  folder={selectedFolderId === "historical" ? "Financial" : "General"}
                  subfolder={selectedFolderId === "historical" ? "Historical" : undefined}
                  onUploadComplete={() => {
                    setUploadDialogOpen(false);
                    refreshData();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !selectedCompanyId ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">Select a company</h3>
              <p className="text-sm text-muted-foreground">Choose a company to view its documents</p>
            </div>
          ) : (
            <>
              <DocumentList
                documents={displayItems}
                selectedDocuments={selectedDocuments}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onViewDocument={handleViewItem}
                onOpenDetails={handleOpenDetails}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onMoveToFolder={handleMoveToFolder}
              />
              <div className="mt-4 text-sm text-muted-foreground">
                {displayItems.length === 0 ? (
                  <span>No documents yet</span>
                ) : (
                  <span>
                    Showing {displayItems.length} item{displayItems.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Sidebar - Checklist */}
      <div className="w-80 border-l border-border overflow-y-auto p-4 custom-scrollbar bg-card/30">
        <DataRoomChecklist documents={documents} />
      </div>

      {/* Document Preview Modal */}
      <DocumentPreview
        document={previewDocument}
        open={!!previewDocument}
        onClose={() => setPreviewDocument(null)}
      />

      {/* Document Details Panel */}
      <DocumentDetailsPanel
        documentId={detailsDocument?.id || null}
        documentName={detailsDocument?.name || ""}
        documentType={detailsDocument?.type || ""}
        documentSize={detailsDocument?.size || ""}
        filePath={detailsDocument?.filePath}
        open={!!detailsDocument}
        onClose={() => setDetailsDocument(null)}
        onStatusChange={refreshData}
      />
    </div>
  );
}
