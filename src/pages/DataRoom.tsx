import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FolderPlus,
  LayoutGrid,
  List,
  Search,
  ChevronRight,
  HardDrive,
} from "lucide-react";
import { FolderTree, FolderNode } from "@/components/dataroom/FolderTree";
import { DocumentList, Document } from "@/components/dataroom/DocumentList";
import { UploadZone } from "@/components/dataroom/UploadZone";
import { AIInsightsPanel } from "@/components/dataroom/AIInsightsPanel";
import { DocumentPreview } from "@/components/dataroom/DocumentPreview";
import { Input } from "@/components/ui/input";

const folderStructure: FolderNode[] = [
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
      { id: "qoe", name: "QoE Reports" },
      { id: "legal-dd", name: "Legal DD" },
      { id: "commercial-dd", name: "Commercial DD" },
    ],
  },
];

const sampleDocuments: Document[] = [
  {
    id: "1",
    name: "FY24 Financial Statements.xlsx",
    type: "xlsx",
    size: "2.4 MB",
    uploadedAt: "Dec 28, 2024",
    uploadedBy: "Sarah",
    status: "reviewed",
  },
  {
    id: "2",
    name: "FY23 Financial Statements.xlsx",
    type: "xlsx",
    size: "2.1 MB",
    uploadedAt: "Dec 15, 2024",
    uploadedBy: "Sarah",
    status: "reviewed",
  },
  {
    id: "3",
    name: "FY22 Financial Statements.xlsx",
    type: "xlsx",
    size: "1.9 MB",
    uploadedAt: "Nov 20, 2024",
    uploadedBy: "Mike",
    status: "reviewed",
  },
  {
    id: "4",
    name: "Monthly Flash Report - Dec.pdf",
    type: "pdf",
    size: "890 KB",
    uploadedAt: "Dec 28, 2024",
    uploadedBy: "Sarah",
    status: "pending",
  },
  {
    id: "5",
    name: "Monthly Flash Report - Nov.pdf",
    type: "pdf",
    size: "856 KB",
    uploadedAt: "Dec 1, 2024",
    uploadedBy: "Sarah",
    status: "reviewed",
  },
  {
    id: "6",
    name: "Revenue Breakdown by Segment.xlsx",
    type: "xlsx",
    size: "1.2 MB",
    uploadedAt: "Nov 28, 2024",
    uploadedBy: "Mike",
    status: "flagged",
  },
];

const companies = [
  { id: "acme", name: "Acme Corp" },
  { id: "techco", name: "TechCo Inc" },
  { id: "beta", name: "Beta Healthcare" },
];

export default function DataRoom() {
  const [selectedCompany, setSelectedCompany] = useState("acme");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>("historical");
  const [selectedPath, setSelectedPath] = useState<string[]>(["Financial", "Historical Financials"]);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleSelectAll = () => {
    if (selectedDocuments.size === sampleDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(sampleDocuments.map((d) => d.id)));
    }
  };

  const storageUsed = 4.2;
  const storageTotal = 10;
  const storagePercent = (storageUsed / storageTotal) * 100;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Sidebar - Folder Tree */}
      <div className="w-64 border-r border-border flex flex-col bg-card/30">
        <div className="p-4 border-b border-border">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            {storageUsed} GB / {storageTotal} GB used
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              {selectedPath.map((segment, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight className="h-3 w-3" />}
                  <span className={i === selectedPath.length - 1 ? "text-foreground" : ""}>
                    {segment}
                  </span>
                </span>
              ))}
            </div>
            <h1 className="text-xl font-semibold text-foreground">
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
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm">
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </Button>

            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Upload Documents</DialogTitle>
                </DialogHeader>
                <UploadZone
                  onUploadComplete={() => {
                    // Handle upload complete
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <DocumentList
            documents={sampleDocuments}
            selectedDocuments={selectedDocuments}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onViewDocument={setPreviewDocument}
          />

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {sampleDocuments.length} of {sampleDocuments.length} documents
          </div>
        </div>
      </div>

      {/* Right Sidebar - AI Insights */}
      <div className="w-80 border-l border-border overflow-y-auto p-4 custom-scrollbar bg-card/30">
        <AIInsightsPanel folderPath={selectedPath} />
      </div>

      {/* Document Preview Modal */}
      <DocumentPreview
        document={previewDocument}
        open={!!previewDocument}
        onClose={() => setPreviewDocument(null)}
      />
    </div>
  );
}
