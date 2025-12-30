import { Contact } from '@/hooks/useContacts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  FileText,
  CheckSquare,
  Workflow,
  UserPlus,
  Edit,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ActivityTabProps {
  contact: Contact;
}

interface Activity {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'message' | 'note' | 'task' | 'flow' | 'created' | 'updated';
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export function ActivityTab({ contact }: ActivityTabProps) {
  const activities: Activity[] = [
    {
      id: '1',
      type: 'email',
      title: 'Email sent',
      description: 'Re: Introduction and next steps',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      type: 'task',
      title: 'Task completed',
      description: 'Follow up on proposal',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      type: 'meeting',
      title: 'Meeting scheduled',
      description: 'Intro call - 30 mins',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      type: 'flow',
      title: 'Added to flow',
      description: 'Introduction Sequence',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '5',
      type: 'note',
      title: 'Note added',
      description: 'Interested in Series A discussion',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '6',
      type: 'created',
      title: 'Contact created',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const activityConfig: Record<
    Activity['type'],
    { icon: typeof Mail; color: string; bgColor: string }
  > = {
    email: { icon: Mail, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    call: { icon: Phone, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
    meeting: { icon: Calendar, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    message: { icon: MessageSquare, color: 'text-pink-400', bgColor: 'bg-pink-500/10' },
    note: { icon: FileText, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
    task: { icon: CheckSquare, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
    flow: { icon: Workflow, color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
    created: { icon: UserPlus, color: 'text-muted-foreground', bgColor: 'bg-muted' },
    updated: { icon: Edit, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-foreground font-medium">Activity Timeline</h4>
        <Badge variant="outline" className="text-muted-foreground">
          {activities.length} activities
        </Badge>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-4">
          {activities.map((activity, index) => {
            const config = activityConfig[activity.type];
            const Icon = config.icon;

            return (
              <div key={activity.id} className="relative flex gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    'relative z-10 h-10 w-10 rounded-full flex items-center justify-center',
                    config.bgColor
                  )}
                >
                  <Icon className={cn('h-4 w-4', config.color)} />
                </div>

                {/* Content */}
                <Card className="flex-1 p-3 bg-muted/30 border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-foreground text-sm font-medium">{activity.title}</p>
                      {activity.description && (
                        <p className="text-muted-foreground text-sm mt-0.5">{activity.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
