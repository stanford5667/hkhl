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

  const applyFilters = (taskList: Task[]) => {
    let filtered = taskList;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) ||
        t.company?.name.toLowerCase().includes(query)
      );
    }
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned') {
        filtered = filtered.filter(t => !t.assignee_id && !t.assignee_contact_id);
      } else {
        filtered = filtered.filter(t => t.assignee_id === assigneeFilter);
      }
    }
    return filtered;
  };

  const activeFilterCount = [
    priorityFilter !== 'all',
    statusFilter !== 'all',
    assigneeFilter !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setPriorityFilter('all');
    setStatusFilter('all');
    setAssigneeFilter('all');
    setSearchQuery('');
  };

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
      headerClass: 'text-muted-foreground',
      iconClass: 'text-muted-foreground',
    },
    {
      id: 'noDueDate',
      title: 'No Due Date',
      icon: Calendar,
      tasks: applyFilters(noDueDateTasks),
      headerClass: 'text-muted-foreground',
      iconClass: 'text-muted-foreground',
    },
    {
      id: 'completed',
      title: 'Completed',
      icon: CheckSquare,
      tasks: applyFilters(completedTasks),
      headerClass: 'text-muted-foreground/70',
      iconClass: 'text-muted-foreground/60',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/10 border border-rose-500/30">
            <CheckSquare className="h-5 w-5 sm:h-6 sm:w-6 text-rose-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tasks</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-0.5">
              {openTasks.length} open task{openTasks.length !== 1 ? 's' : ''}
            </p>
          </div>
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filter tabs */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
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
              <Badge className="h-5 w-5 p-0 flex items-center justify-center bg-primary text-primary-foreground text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          
          {/* Quick filters */}
          <div className="flex gap-2">
            {overdueTasks.length > 0 && (
              <Badge variant="outline" className="text-rose-400 border-rose-500/30 bg-rose-500/10">
                <AlertCircle className="h-3 w-3 mr-1" />
                {overdueTasks.length} Overdue
              </Badge>
            )}
            {todayTasks.length > 0 && (
              <Badge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-500/10">
                <Clock className="h-3 w-3 mr-1" />
                {todayTasks.length} Today
              </Badge>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex gap-1 bg-muted rounded-lg p-1 ml-auto">
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
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
            {/* Priority Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Priority:</span>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
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
                  <SelectItem value="low" className="text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                      Low
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="todo">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground" />
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
              <span className="text-xs text-muted-foreground">Assignee:</span>
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[8px] bg-muted">
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
                className="h-8 text-muted-foreground hover:text-foreground ml-auto"
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
                        'h-4 w-4 text-muted-foreground transition-transform',
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
            <div className="text-center py-12">
              <CheckSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-foreground mb-1">No tasks found</h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery || activeFilterCount > 0
                  ? 'Try adjusting your filters'
                  : 'Create your first task to get started'}
              </p>
            </div>
          )}
        </div>
      )}

      <CreateTaskDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} />
      
      <TaskDetailDialog
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={refetch}
      />
    </div>
  );
}
