import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Filter,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTasks, Task, TaskPriority, TaskStatus } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
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
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
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

  const { teamMembers } = useTeamMembers();
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Apply all filters
  const applyFilters = (taskList: Task[]) => {
    let filtered = taskList;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) ||
        t.company?.name.toLowerCase().includes(query)
      );
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Assignee filter
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned') {
        filtered = filtered.filter(t => !t.assignee_id && !t.assignee_contact_id);
      } else {
        filtered = filtered.filter(t => t.assignee_id === assigneeFilter);
      }
    }

    return filtered;
  };

  // Count active filters
  const activeFilterCount = [
    priorityFilter !== 'all',
    statusFilter !== 'all',
    assigneeFilter !== 'all',
  ].filter(Boolean).length;

  // Clear all filters
  const clearFilters = () => {
    setPriorityFilter('all');
    setStatusFilter('all');
    setAssigneeFilter('all');
    setSearchQuery('');
  };

  // Filter all tasks for board view
  const filteredTasks = applyFilters(tasks);

  const sections = [
    {
      id: 'overdue',
      title: 'Overdue',
      icon: AlertCircle,
      tasks: applyFilters(overdueTasks),
      headerClass: 'text-rose-400',
      iconClass: 'text-rose-400',
    },
    {
      id: 'today',
      title: 'Today',
      icon: Clock,
      tasks: applyFilters(todayTasks),
      headerClass: 'text-blue-400',
      iconClass: 'text-blue-400',
    },
    {
      id: 'tomorrow',
      title: 'Tomorrow',
      icon: Calendar,
      tasks: applyFilters(tomorrowTasks),
      headerClass: 'text-amber-400',
      iconClass: 'text-amber-400',
    },
    {
      id: 'thisWeek',
      title: 'This Week',
      icon: CalendarDays,
      tasks: applyFilters(thisWeekTasks),
      headerClass: 'text-emerald-400',
      iconClass: 'text-emerald-400',
    },
    {
      id: 'later',
      title: 'Later',
      icon: Calendar,
      tasks: applyFilters(laterTasks),
      headerClass: 'text-slate-400',
      iconClass: 'text-slate-500',
    },
    {
      id: 'noDueDate',
      title: 'No Due Date',
      icon: Calendar,
      tasks: applyFilters(noDueDateTasks),
      headerClass: 'text-slate-400',
      iconClass: 'text-slate-500',
    },
    {
      id: 'completed',
      title: 'Completed',
      icon: CheckSquare,
      tasks: applyFilters(completedTasks),
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
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-4">
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

          {/* Advanced Filters Toggle */}
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="h-5 w-5 p-0 flex items-center justify-center bg-purple-500 text-white text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          
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

        {/* Advanced Filters Row */}
        {showFilters && (
          <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            {/* Priority Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Priority:</span>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32 h-8 bg-slate-800 border-slate-700 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="all" className="text-slate-300">All</SelectItem>
                  <SelectItem value="urgent" className="text-rose-400">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-rose-500" />
                      Urgent
                    </div>
                  </SelectItem>
                  <SelectItem value="high" className="text-orange-400">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-orange-500" />
                      High
                    </div>
                  </SelectItem>
                  <SelectItem value="medium" className="text-amber-400">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="low" className="text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-slate-500" />
                      Low
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-8 bg-slate-800 border-slate-700 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="all" className="text-slate-300">All</SelectItem>
                  <SelectItem value="todo" className="text-slate-300">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-slate-500" />
                      To Do
                    </div>
                  </SelectItem>
                  <SelectItem value="in_progress" className="text-blue-400">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      In Progress
                    </div>
                  </SelectItem>
                  <SelectItem value="blocked" className="text-amber-400">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      Blocked
                    </div>
                  </SelectItem>
                  <SelectItem value="done" className="text-emerald-400">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      Done
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignee Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Assignee:</span>
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-40 h-8 bg-slate-800 border-slate-700 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="all" className="text-slate-300">All</SelectItem>
                  <SelectItem value="unassigned" className="text-slate-400">Unassigned</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id} className="text-slate-300">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[8px] bg-slate-700">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        {member.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-slate-400 hover:text-white ml-auto"
                onClick={clearFilters}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
        )}
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
          
          {filteredTasks.length === 0 && (
            <div className="text-center py-16">
              <CheckSquare className="h-12 w-12 text-slate-700 mx-auto mb-4" />
              {activeFilterCount > 0 || searchQuery ? (
                <>
                  <p className="text-slate-400 mb-2">No tasks match your filters</p>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-slate-400 mb-2">No tasks yet</p>
                  <p className="text-slate-600 text-sm mb-4">
                    Create your first task to get started
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Task
                  </Button>
                </>
              )}
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