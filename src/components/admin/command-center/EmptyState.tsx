import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Users, Zap, Lightbulb } from 'lucide-react';

interface EmptyStateProps {
  type: 'growth' | 'retention' | 'system' | 'users';
}

const emptyStateConfig = {
  growth: {
    icon: <BarChart3 className="h-12 w-12 text-muted-foreground/50" />,
    title: 'No growth data yet',
    description: 'Growth metrics will appear here once users start signing up.',
    tips: [
      'Promote your app on social media',
      'Enable referral programs',
      'Optimize your onboarding flow',
    ],
  },
  retention: {
    icon: <Users className="h-12 w-12 text-muted-foreground/50" />,
    title: 'No retention data yet',
    description: 'Retention metrics will populate as users return to your app.',
    tips: [
      'Send re-engagement emails',
      'Add push notifications',
      'Create compelling features',
    ],
  },
  system: {
    icon: <Zap className="h-12 w-12 text-muted-foreground/50" />,
    title: 'No system activity yet',
    description: 'System health metrics will show once API calls are made.',
    tips: [
      'Monitor error rates closely',
      'Set up alerting thresholds',
      'Optimize slow endpoints',
    ],
  },
  users: {
    icon: <Users className="h-12 w-12 text-muted-foreground/50" />,
    title: 'No users in this tier',
    description: 'Users matching this filter will appear here.',
    tips: [
      'Adjust your tier filter',
      'Check your pricing strategy',
      'Review upgrade prompts',
    ],
  },
};

export function EmptyState({ type }: EmptyStateProps) {
  const config = emptyStateConfig[type];

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          {config.icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{config.title}</h3>
        <p className="text-muted-foreground max-w-sm mb-6">{config.description}</p>
        
        <div className="bg-muted/50 rounded-lg p-4 max-w-sm">
          <div className="flex items-center gap-2 text-sm font-medium mb-3">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <span>Pro Tips</span>
          </div>
          <ul className="text-sm text-muted-foreground space-y-2 text-left">
            {config.tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
