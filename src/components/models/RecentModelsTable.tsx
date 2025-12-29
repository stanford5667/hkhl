import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  ExternalLink,
  Loader2,
  Pencil,
  Copy,
  Trash2,
  Download,
} from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModels } from "@/hooks/useModels";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface ModelWithCompany {
  id: string;
  company_id: string;
  model_type: string;
  name: string;
  model_data: any;
  status: string | null;
  created_at: string;
  updated_at: string;
  company_name?: string;
}

const modelTypeLabels: Record<string, string> = {
  cash_flow_buildup: "Cash Flow",
  lbo: "LBO",
  dcf: "DCF",
  pro_forma: "Pro Forma",
  merger: "Merger",
  cam: "CAM",
};

export function RecentModelsTable() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { duplicateModel, deleteModel } = useModels();
  const [models, setModels] = useState<ModelWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<ModelWithCompany | null>(null);

  const fetchModels = async () => {
    if (!user) {
      setModels([]);
      setLoading(false);
      return;
    }

    try {
      const { data: modelsData, error: modelsError } = await supabase
        .from("models")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(10);

      if (modelsError) throw modelsError;

      if (modelsData && modelsData.length > 0) {
        const companyIds = [...new Set(modelsData.map((m) => m.company_id))];

        const { data: companiesData } = await supabase
          .from("companies")
          .select("id, name")
          .in("id", companyIds);

        const companyMap = new Map(companiesData?.map((c) => [c.id, c.name]) || []);

        setModels(
          modelsData.map((m) => ({
            ...m,
            company_name: companyMap.get(m.company_id) || "Unknown Company",
          }))
        );
      } else {
        setModels([]);
      }
    } catch (error) {
      console.error("Error fetching models:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [user]);

  const handleEdit = (model: ModelWithCompany, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/models/${model.id}/edit`);
  };

  const handleDuplicate = async (model: ModelWithCompany, e: React.MouseEvent) => {
    e.stopPropagation();
    const newModel = await duplicateModel(model.id);
    if (newModel) {
      fetchModels();
    }
  };

  const handleDeleteClick = (model: ModelWithCompany, e: React.MouseEvent) => {
    e.stopPropagation();
    setModelToDelete(model);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!modelToDelete) return;
    const success = await deleteModel(modelToDelete.id);
    if (success) {
      setModels((prev) => prev.filter((m) => m.id !== modelToDelete.id));
    }
    setDeleteDialogOpen(false);
    setModelToDelete(null);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Recent Models</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (models.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Recent Models</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No models yet. Create your first model to get started.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/models/new")}>
              Create New Model
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">Recent Models</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate("/models/new")}>
            New Model
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Company
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => (
                  <tr
                    key={model.id}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/models/${model.id}/edit`)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{model.name}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">
                        {modelTypeLabels[model.model_type] || model.model_type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {model.company_name}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={model.status === "final" ? "default" : "secondary"}>
                        {model.status || "draft"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(model.updated_at), { addSuffix: true })}
                    </td>
                    <td className="py-3 px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => handleEdit(model, e)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleDuplicate(model, e)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => handleDeleteClick(model, e)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{modelToDelete?.name}"? This action cannot be undone.
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
