import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  ChevronDown, 
  Plus, 
  Trash2, 
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { TaskPriority } from '@/hooks/useTasks';

export interface TaskTemplate {
  id: string;
  template_name: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  recurrence_pattern: string | null;
  recurrence_interval: number | null;
  tags: string[] | null;
}

interface TaskTemplateManagerProps {
  onSelectTemplate: (template: TaskTemplate) => void;
  currentTask?: {
    title: string;
    description?: string;
    priority: TaskPriority;
    recurrence_pattern?: string | null;
    recurrence_interval?: number;
    tags?: string[];
  };
  onSaveAsTemplate?: () => void;
}

const priorityConfig: Record<TaskPriority, { label: string; color: string; icon: React.ReactNode }> = {
  low: { label: 'Low', color: 'text-slate-400', icon: <Clock className="h-3 w-3" /> },
  medium: { label: 'Medium', color: 'text-amber-400', icon: <Clock className="h-3 w-3" /> },
  high: { label: 'High', color: 'text-orange-400', icon: <AlertTriangle className="h-3 w-3" /> },
  urgent: { label: 'Urgent', color: 'text-rose-400', icon: <AlertTriangle className="h-3 w-3" /> },
};

export function TaskTemplateManager({ onSelectTemplate, currentTask, onSaveAsTemplate }: TaskTemplateManagerProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, template_name, title, description, priority, recurrence_pattern, recurrence_interval, tags')
        .eq('is_template', true)
        .eq('user_id', user.id)
        .order('template_name', { ascending: true });

      if (error) throw error;
      setTemplates((data || []).map(t => ({
        ...t,
        priority: t.priority as TaskPriority,
      })));
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, fetchTemplates]);

  const handleSaveAsTemplate = async () => {
    if (!user || !currentTask || !templateName.trim()) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        user_id: user.id,
        title: currentTask.title,
        description: currentTask.description,
        priority: currentTask.priority,
        recurrence_pattern: currentTask.recurrence_pattern,
        recurrence_interval: currentTask.recurrence_interval || 1,
        tags: currentTask.tags,
        is_template: true,
        template_name: templateName.trim(),
        status: 'todo',
      });

      if (error) throw error;
      
      toast.success('Template saved');
      setTemplateName('');
      setIsSaveDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      
      toast.success('Template deleted');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleSelectTemplate = (template: TaskTemplate) => {
    onSelectTemplate(template);
    setIsOpen(false);
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
          >
            <FileText className="h-4 w-4 mr-1" />
            Templates
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-80 bg-slate-900 border-slate-800"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : templates.length === 0 ? (
            <div className="py-4 px-2 text-center text-slate-500 text-sm">
              No templates yet. Create one by saving a task as template.
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              {templates.map((template) => (
                <DropdownMenuItem
                  key={template.id}
                  className="flex items-start gap-2 p-2 cursor-pointer focus:bg-slate-800"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white truncate">
                        {template.template_name}
                      </span>
                      <span className={priorityConfig[template.priority].color}>
                        {priorityConfig[template.priority].icon}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {template.title}
                    </p>
                    {template.recurrence_pattern && (
                      <Badge variant="outline" className="mt-1 text-[10px] h-4 border-slate-700 text-slate-400">
                        Recurring: {template.recurrence_pattern}
                      </Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-500 hover:text-rose-400 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTemplate(template.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              ))}
            </ScrollArea>
          )}
          
          <DropdownMenuSeparator className="bg-slate-800" />
          
          <DropdownMenuItem
            className="flex items-center gap-2 text-emerald-400 focus:bg-slate-800 focus:text-emerald-300 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              setIsOpen(false);
              setIsSaveDialogOpen(true);
            }}
            disabled={!currentTask?.title}
          >
            <Plus className="h-4 w-4" />
            Save current as template
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save as Template Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Template Name</label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Weekly Report, Client Follow-up..."
                className="bg-slate-800 border-slate-700 text-white"
                autoFocus
              />
            </div>
            
            {currentTask && (
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-white font-medium">Task Preview</span>
                </div>
                <p className="text-sm text-slate-300">{currentTask.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px] border-slate-600">
                    {currentTask.priority}
                  </Badge>
                  {currentTask.recurrence_pattern && (
                    <Badge variant="outline" className="text-[10px] border-slate-600">
                      {currentTask.recurrence_pattern}
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsSaveDialogOpen(false)}
                className="text-slate-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAsTemplate}
                disabled={!templateName.trim() || isSaving}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
