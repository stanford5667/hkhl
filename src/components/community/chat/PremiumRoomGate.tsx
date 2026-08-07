import { Crown, Lock, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useUsage } from '@/contexts/UsageContext';
import { useAuth } from '@/contexts/AuthContext';

interface PremiumRoomGateProps {
  memberCount: number;
  roomName: string;
}

export function PremiumRoomGate({ memberCount, roomName }: PremiumRoomGateProps) {
  const { showUpgradeModal } = useUsage();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10">
      {/* Frosted glass background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* CTA Card */}
      <div className="relative z-20 max-w-sm mx-4 p-6 rounded-xl border border-primary/20 bg-card shadow-lg text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <Crown className="h-6 w-6 text-primary" />
        </div>

        <h3 className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
          <Lock className="h-4 w-4" />
          Members Only
        </h3>

        <p className="text-sm text-muted-foreground mb-4">
          Upgrade to Pro to access <span className="font-medium text-foreground">{roomName}</span> and all chat rooms
        </p>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
          <Users className="h-4 w-4" />
          <span>🔥 {Math.max(memberCount, 32).toLocaleString()} traders sharing trade ideas</span>
        </div>

        <Button
          onClick={() => showUpgradeModal('premiumChat')}
          className="w-full"
        >
          Unlock Full Access
        </Button>

        {!user && (
          <>
            <Button
              variant="outline"
              onClick={() => navigate('/auth', { state: { mode: 'signin' } })}
              className="w-full mt-2 border-primary/30 text-primary hover:bg-primary/10"
            >
              Already a member? Sign in
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Sign in to access rooms included with your plan
            </p>
          </>
        )}

        {user && (
          <p className="text-xs text-muted-foreground mt-3">
            Upgrade to Pro for unlimited premium rooms
          </p>
        )}
      </div>
    </div>
  );
}
