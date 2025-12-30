import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, Clock, AlertCircle, CheckCircle2, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Task, TaskStatus, useTasks } from '@/hooks/useTasks';
import { TaskBoardCard } from './TaskBoardCard';
import { TaskDetailDialog } from './TaskDetailDialog';
import { CreateTaskDialog } from './CreateTaskDialog';

const columns: { id: TaskStatus; title: string; icon: React.ElementType; color: string }[] = [
  { id: 'todo', title: 'To Do', icon: Clock, color: 'text-slate-400' },
  { id: 'in_progress', title: 'In Progress', icon: Clock, color: 'text-blue-400' },
  { id: 'blocked', title: 'Blocked', icon: Pause, color: 'text-amber-400' },
  { id: 'done', title: 'Done', icon: CheckCircle2, color: 'text-emerald-400' },
];

interface TaskBoardProps {
  tasks: Task[];
  onTaskUpdated: () => void;
}

export function TaskBoard({ tasks, onTaskUpdated }: TaskBoardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForStatus, setCreateForStatus] = useState<TaskStatus>('todo');
  const { updateTask } = useTasks();

  // Group tasks by status
  const tasksByStatus = columns.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside
    if (!destination) return;

    // Same position
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const newStatus = destination.droppableId as TaskStatus;
    const taskId = draggableId;

    // Optimistic update
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      try {
        await updateTask(taskId, { status: newStatus });
        onTaskUpdated();
      } catch (error) {
        console.error('Error updating task status:', error);
      }
    }
  };

  const handleAddTask = (status: TaskStatus) => {
    setCreateForStatus(status);
    setShowCreateDialog(true);
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4 min-w-max">
            {columns.map((column) => {
              const columnTasks = tasksByStatus[column.id] || [];
              const Icon = column.icon;

              return (
                <div
                  key={column.id}
                  className="w-80 flex-shrink-0 bg-slate-900/50 rounded-xl"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between p-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-4 w-4', column.color)} />
                      <span className="font-medium text-white text-sm">{column.title}</span>
                      <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                        {columnTasks.length}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-500 hover:text-white"
                      onClick={() => handleAddTask(column.id)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          'p-2 min-h-[200px] transition-colors',
                          snapshot.isDraggingOver && 'bg-slate-800/30'
                        )}
                      >
                        <div className="space-y-2">
                          {columnTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <TaskBoardCard
                                    task={task}
                                    onClick={() => setSelectedTask(task)}
                                    isDragging={snapshot.isDragging}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                        </div>
                        {provided.placeholder}

                        {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="text-center py-8 text-slate-600 text-sm">
                            No tasks
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </DragDropContext>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={onTaskUpdated}
        onTaskDeleted={onTaskUpdated}
      />

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onTaskCreated={onTaskUpdated}
      />
    </>
  );
}