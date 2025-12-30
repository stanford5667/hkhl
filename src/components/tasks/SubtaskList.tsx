import { useState } from 'react';
import { Check, Plus, Trash2, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useSubtasks } from '@/hooks/useSubtasks';

interface SubtaskListProps {
  taskId: string;
}

export function SubtaskList({ taskId }: SubtaskListProps) {
  const [newSubtask, setNewSubtask] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const {
    subtasks,
    isLoading,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    completedCount,
    totalCount,
    progress,
  } = useSubtasks(taskId);

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    
    setIsAdding(true);
    try {
      await addSubtask(newSubtask.trim());
      setNewSubtask('');
    } catch (error) {
      console.error('Error adding subtask:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">
          Subtasks {totalCount > 0 && `(${completedCount}/${totalCount})`}
        </span>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <Progress value={progress} className="h-1.5 bg-slate-800" />
      )}

      {/* Subtask list */}
      <div className="space-y-1">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="group flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <GripVertical className="h-3 w-3 text-slate-700 opacity-0 group-hover:opacity-100 cursor-grab" />
            
            <button
              onClick={() => toggleSubtask(subtask.id)}
              className={cn(
                'h-4 w-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0',
                subtask.completed
                  ? 'bg-emerald-600 border-emerald-600'
                  : 'border-slate-600 hover:border-slate-500'
              )}
            >
              {subtask.completed && <Check className="h-2.5 w-2.5 text-white" />}
            </button>
            
            <span className={cn(
              'flex-1 text-sm',
              subtask.completed ? 'text-slate-500 line-through' : 'text-white'
            )}>
              {subtask.title}
            </span>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400"
              onClick={() => deleteSubtask(subtask.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add subtask input */}
      <div className="flex gap-2">
        <Input
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          placeholder="Add subtask..."
          className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 h-8 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddSubtask();
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleAddSubtask}
          disabled={!newSubtask.trim() || isAdding}
          className="h-8 px-2 text-slate-400 hover:text-white"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}