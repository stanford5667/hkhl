import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Plus,
  Search,
  CheckSquare,
  AlertCircle,
  Clock,
  Calendar,
  CalendarDays,
  ChevronRight,
  Loader2,
  LayoutList,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTasks, Task } from '@/hooks/useTasks';
import { TaskCard } from '@/components/tasks/TaskCard';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';
import { TaskBoard } from '@/components/tasks/TaskBoard';

type FilterTab = 'my' | 'team' | 'all';
type ViewMode = 'list' | 'board';

export default function Tasks() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overdue: true,
    today: true,
    tomorrow: true,
    thisWeek: true,
    later: false,
    noDueDate: false,
    completed: false,
  });
  
  const {
    tasks,
    isLoading,
    overdueTasks,
    todayTasks,
    tomorrowTasks,
    thisWeekTasks,
    laterTasks,
    noDueDateTasks,
    completedTasks,
    openTasks,
    refetch,
  } = useTasks();
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };
  
  const filteredBySearch = (taskList: Task[]) => {
    if (!searchQuery) return taskList;
    const query = searchQuery.toLowerCase();
    return taskList.filter(t => 
      t.title.toLowerCase().includes(query) ||
      t.company?.name.toLowerCase().includes(query)
    );
  };

  // Filter all tasks for board view
  const filteredTasks = filteredBySearch(tasks);

  const sections = [
    {
      id: 'overdue',
      title: 'Overdue',
      icon: AlertCircle,
      tasks: filteredBySearch(overdueTasks),
      headerClass: 'text-rose-400',
      iconClass: 'text-rose-400',
    },
    {
      id: 'today',
      title: 'Today',
      icon: Clock,
      tasks: filteredBySearch(todayTasks),
      headerClass: 'text-blue-400',
      iconClass: 'text-blue-400',
    },
    {
      id: 'tomorrow',
      title: 'Tomorrow',
      icon: Calendar,
      tasks: filteredBySearch(tomorrowTasks),
      headerClass: 'text-amber-400',
      iconClass: 'text-amber-400',
    },
    {
      id: 'thisWeek',
      title: 'This Week',
      icon: CalendarDays,
      tasks: filteredBySearch(thisWeekTasks),
      headerClass: 'text-emerald-400',
      iconClass: 'text-emerald-400',
    },
    {
      id: 'later',
      title: 'Later',
      icon: Calendar,
      tasks: filteredBySearch(laterTasks),
      headerClass: 'text-slate-400',
      iconClass: 'text-slate-500',
    },
    {
      id: 'noDueDate',
      title: 'No Due Date',
      icon: Calendar,
      tasks: filteredBySearch(noDueDateTasks),
      headerClass: 'text-slate-400',
      iconClass: 'text-slate-500',
    },
    {
      id: 'completed',
      title: 'Completed',
      icon: CheckSquare,
      tasks: filteredBySearch(completedTasks),
      headerClass: 'text-slate-500',
      iconClass: 'text-slate-600',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-slate-400 text-sm mt-1">
            {openTasks.length} open task{openTasks.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>
      
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
        
        {/* Filter tabs */}
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
          <Button
            variant={activeFilter === 'my' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setActiveFilter('my')}
          >
            My Tasks
          </Button>
          <Button
            variant={activeFilter === 'team' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setActiveFilter('team')}
          >
            Team
          </Button>
          <Button
            variant={activeFilter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setActiveFilter('all')}
          >
            All
          </Button>
        </div>
        
        {/* Quick filters */}
        <div className="flex gap-2">
          {overdueTasks.length > 0 && (
            <Badge variant="outline" className="text-rose-400 border-rose-800 bg-rose-900/20">
              <AlertCircle className="h-3 w-3 mr-1" />
              {overdueTasks.length} Overdue
            </Badge>
          )}
          {todayTasks.length > 0 && (
            <Badge variant="outline" className="text-blue-400 border-blue-800 bg-blue-900/20">
              <Clock className="h-3 w-3 mr-1" />
              {todayTasks.length} Today
            </Badge>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1 ml-auto">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'board' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('board')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Content */}
      {viewMode === 'board' ? (
        <TaskBoard tasks={filteredTasks} onTaskUpdated={refetch} />
      ) : (
        /* Task Sections - List View */
        <div className="space-y-4">
          {sections.map(section => {
            if (section.tasks.length === 0) return null;
            
            const Icon = section.icon;
            const isExpanded = expandedSections[section.id];
            
            return (
              <Collapsible
                key={section.id}
                open={isExpanded}
                onOpenChange={() => toggleSection(section.id)}
              >
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 w-full text-left py-2 group">
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 text-slate-500 transition-transform',
                        isExpanded && 'rotate-90'
                      )}
                    />
                    <Icon className={cn('h-4 w-4', section.iconClass)} />
                    <span className={cn('font-medium text-sm', section.headerClass)}>
                      {section.title}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs border-0',
                        section.headerClass
                      )}
                    >
                      {section.tasks.length}
                    </Badge>
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="space-y-2 pl-6 pt-2">
                    {section.tasks.map(task => (
                      <div key={task.id} onClick={() => setSelectedTask(task)} className="cursor-pointer">
                        <TaskCard task={task} />
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
          
          {openTasks.length === 0 && completedTasks.length === 0 && (
            <div className="text-center py-16">
              <CheckSquare className="h-12 w-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">No tasks yet</p>
              <p className="text-slate-600 text-sm mb-4">
                Create your first task to get started
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onTaskCreated={refetch}
      />

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={refetch}
        onTaskDeleted={refetch}
      />
    </div>
  );
}