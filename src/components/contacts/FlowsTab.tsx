import { useState } from 'react';
import { Contact } from '@/hooks/useContacts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Workflow,
  Clock,
  Play,
  Pause,
  X,
  Mail,
  CheckCircle2,
  Circle,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowsTabProps {
  contact: Contact;
}

interface Flow {
  id: string;
  flowId: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  currentStepId: string;
  steps: { id: string; name: string; type: string; completed: boolean }[];
  startedAt: string;
  nextStepAt: string | null;
}

interface AvailableFlow {
  id: string;
  name: string;
  description: string;
  steps: number;
  duration: string;
}

export function FlowsTab({ contact }: FlowsTabProps) {
  const [showAddFlow, setShowAddFlow] = useState(false);
  const [flows, setFlows] = useState<Flow[]>([
    {
      id: '1',
      flowId: 'intro',
      name: 'Introduction Sequence',
      description: 'Warm introduction and follow-up',
      status: 'active',
      currentStepId: '2',
      steps: [
        { id: '1', name: 'Initial intro email', type: 'email', completed: true },
        { id: '2', name: 'Follow-up after 3 days', type: 'email', completed: false },
        { id: '3', name: 'Meeting request', type: 'email', completed: false },
      ],
      startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      nextStepAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]);

  const availableFlows: AvailableFlow[] = [
    {
      id: 'intro',
      name: 'Introduction Sequence',
      description: 'Warm introduction and follow-up',
      steps: 3,
      duration: '2 weeks',
    },
    {
      id: 'nurture',
      name: 'Nurture Campaign',
      description: 'Long-term relationship building',
      steps: 6,
      duration: '3 months',
    },
    {
      id: 'deal-followup',
      name: 'Deal Follow-up',
      description: 'Post-meeting nurture sequence',
      steps: 4,
      duration: '1 month',
    },
    {
      id: 're-engage',
      name: 'Re-engagement',
      description: 'Reconnect with dormant contacts',
      steps: 3,
      duration: '3 weeks',
    },
  ];

  const addToFlow = (flowId: string) => {
    const flow = availableFlows.find((f) => f.id === flowId);
    if (!flow) return;

    setFlows([
      ...flows,
      {
        id: crypto.randomUUID(),
        flowId,
        name: flow.name,
        description: flow.description,
        status: 'active',
        currentStepId: '1',
        steps: [
          { id: '1', name: 'Step 1', type: 'email', completed: false },
          { id: '2', name: 'Step 2', type: 'email', completed: false },
          { id: '3', name: 'Step 3', type: 'email', completed: false },
        ],
        startedAt: new Date().toISOString(),
        nextStepAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);
    setShowAddFlow(false);
  };

  const pauseFlow = (id: string) => {
    setFlows(flows.map((f) => (f.id === id ? { ...f, status: 'paused' as const } : f)));
  };

  const resumeFlow = (id: string) => {
    setFlows(flows.map((f) => (f.id === id ? { ...f, status: 'active' as const } : f)));
  };

  const removeFromFlow = (id: string) => {
    setFlows(flows.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-foreground font-medium">Automation Flows</h4>
          <p className="text-muted-foreground text-sm">Automated communication sequences</p>
        </div>
        <Button size="sm" onClick={() => setShowAddFlow(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add to Flow
        </Button>
      </div>

      {/* Active Flows */}
      {flows.length === 0 ? (
        <div className="text-center py-12">
          <Workflow className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground mb-2">Not in any flows</p>
          <p className="text-muted-foreground/70 text-sm mb-4">
            Add {contact.first_name} to an automation flow to send scheduled emails
          </p>
          <Button variant="outline" onClick={() => setShowAddFlow(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add to Flow
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {flows.map((flow) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              onPause={() => pauseFlow(flow.id)}
              onResume={() => resumeFlow(flow.id)}
              onRemove={() => removeFromFlow(flow.id)}
            />
          ))}
        </div>
      )}

      {/* Available Flows */}
      <div className="pt-6 border-t border-border">
        <h5 className="text-muted-foreground text-sm font-medium mb-3">Available Flows</h5>
        <div className="grid grid-cols-2 gap-3">
          {availableFlows
            .filter((f) => !flows.find((cf) => cf.flowId === f.id))
            .map((flow) => (
              <Card
                key={flow.id}
                className="p-4 bg-muted/30 border-border hover:border-primary/50 cursor-pointer transition-colors"
                onClick={() => addToFlow(flow.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-foreground font-medium text-sm">{flow.name}</p>
                    <p className="text-muted-foreground text-xs mt-1">{flow.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {flow.steps} steps
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {flow.duration}
                </div>
              </Card>
            ))}
        </div>
      </div>

      {/* Add Flow Dialog */}
      <Dialog open={showAddFlow} onOpenChange={setShowAddFlow}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Automation Flow</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {availableFlows.map((flow) => (
              <Card
                key={flow.id}
                className={cn(
                  'p-4 border-border cursor-pointer transition-colors',
                  flows.find((f) => f.flowId === flow.id)
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:border-primary/50'
                )}
                onClick={() => !flows.find((f) => f.flowId === flow.id) && addToFlow(flow.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-foreground font-medium">{flow.name}</p>
                      <p className="text-muted-foreground text-sm">{flow.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-muted-foreground">
                      {flow.steps} steps
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{flow.duration}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FlowCard({
  flow,
  onPause,
  onResume,
  onRemove,
}: {
  flow: Flow;
  onPause: () => void;
  onResume: () => void;
  onRemove: () => void;
}) {
  const completedSteps = flow.steps.filter((s) => s.completed).length;
  const progress = (completedSteps / flow.steps.length) * 100;

  return (
    <Card className="p-4 bg-muted/30 border-border">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center',
              flow.status === 'active' && 'bg-emerald-500/10',
              flow.status === 'paused' && 'bg-amber-500/10',
              flow.status === 'completed' && 'bg-muted'
            )}
          >
            <Workflow
              className={cn(
                'h-5 w-5',
                flow.status === 'active' && 'text-emerald-500',
                flow.status === 'paused' && 'text-amber-500',
                flow.status === 'completed' && 'text-muted-foreground'
              )}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-foreground font-medium">{flow.name}</p>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs capitalize',
                  flow.status === 'active' && 'text-emerald-500 border-emerald-500/30',
                  flow.status === 'paused' && 'text-amber-500 border-amber-500/30'
                )}
              >
                {flow.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">{flow.description}</p>
          </div>
        </div>

        <div className="flex gap-1">
          {flow.status === 'active' ? (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onPause}>
              <Pause className="h-4 w-4" />
            </Button>
          ) : flow.status === 'paused' ? (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onResume}>
              <Play className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>
            Step {completedSteps + 1} of {flow.steps.length}
          </span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {flow.steps.map((step, i) => (
          <div
            key={step.id}
            className={cn(
              'flex items-center gap-3 p-2 rounded-md',
              step.id === flow.currentStepId && 'bg-primary/5 border border-primary/20'
            )}
          >
            {step.completed ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : step.id === flow.currentStepId ? (
              <div className="h-4 w-4 rounded-full border-2 border-primary animate-pulse" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/30" />
            )}
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span
              className={cn(
                'text-sm',
                step.completed && 'text-muted-foreground line-through',
                step.id === flow.currentStepId && 'text-foreground font-medium',
                !step.completed && step.id !== flow.currentStepId && 'text-muted-foreground'
              )}
            >
              {step.name}
            </span>
          </div>
        ))}
      </div>

      {/* Next Step */}
      {flow.nextStepAt && flow.status === 'active' && (
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Next email scheduled for{' '}
          {new Date(flow.nextStepAt).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      )}
    </Card>
  );
}
