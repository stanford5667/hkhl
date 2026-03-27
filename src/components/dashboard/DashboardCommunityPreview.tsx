import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, ChevronRight, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { SectionHeader } from '@/components/ui/design-system';
import { useChatRooms } from '@/hooks/useChatRooms';
import { cn } from '@/lib/utils';

export function DashboardCommunityPreview() {
  const navigate = useNavigate();
  const { rooms, loading } = useChatRooms();

  const displayRooms = rooms.slice(0, 4);

  return (
    <Card variant="surface" className="card-glow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="Community" subtitle="Live discussions" icon={<MessageCircle className="h-4 w-4 text-cyan-400" />} />
          <Button variant="ghost" size="sm" onClick={() => navigate('/community')} className="text-xs text-muted-foreground hover:text-foreground">
            Join Chat <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-lg bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : displayRooms.length > 0 ? (
          <div className="space-y-2">
            {displayRooms.map((room, i) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/community/chat/${room.slug}`)}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 text-lg shrink-0">
                  {room.icon || '💬'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-cyan-400 transition-colors">
                    {room.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {room.description || 'Join the discussion'}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Users className="h-3 w-3" />
                  {room.member_count}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No chat rooms available</p>
          </div>
        )}

        <Button 
          variant="outline" 
          className="w-full mt-4 text-sm border-cyan-500/20 hover:bg-cyan-500/5"
          onClick={() => navigate('/community')}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Browse All Rooms
        </Button>
      </CardContent>
    </Card>
  );
}
