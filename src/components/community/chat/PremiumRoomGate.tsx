import { Crown, Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUsage } from '@/contexts/UsageContext';

interface PremiumRoomGateProps {
  memberCount: number;
  roomName: string;
}

export function PremiumRoomGate({ memberCount, roomName }: PremiumRoomGateProps) {
  const { showUpgradeModal } = useUsage();

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10">
      {/* Frosted glass background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      {/* CTA Card */}
      <div className="relative z-20 max-w-sm mx-4 p-6 rounded-xl border bg-card shadow-lg text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 mb-4">
          <Crown className="h-6 w-6 text-amber-500" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
          <Lock className="h-4 w-4" />
          Members Only
        </h3>
        
        <p className="text-sm text-muted-foreground mb-4">
          Upgrade to Pro to access <span className="font-medium">{roomName}</span> and all chat rooms
        </p>
        
        {/* Social proof */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
          <Users className="h-4 w-4" />
          <span>🔥 {Math.max(memberCount, 32).toLocaleString()} traders sharing trade ideas</span>
        </div>
        
        <Button 
          onClick={() => showUpgradeModal('premiumChat')}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
        >
          Unlock Full Access
        </Button>
        
        <p className="text-xs text-muted-foreground mt-3">
          Upgrade to Pro for unlimited premium rooms
        </p>
      </div>
    </div>
  );
}
