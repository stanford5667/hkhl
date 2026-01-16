/**
 * Fortune 500 Style Plan Card
 * Premium card design with glassmorphism
 */

import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Target, Calendar, Brain, Shield, ChevronRight, MoreVertical,
  Eye, Download, Trash2, TrendingUp, Clock, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface PlanCardProps {
  plan: {
    id: string;
    name: string;
    created_at: string;
    risk_score: number | null;
    risk_profile: string | null;
    investor_type_name: string | null;
    investor_type: string | null;
  };
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
  index?: number;
}

const getRiskGradient = (profile: string | null) => {
  switch (profile?.toLowerCase()) {
    case 'conservative': return 'from-blue-500 to-cyan-400';
    case 'moderate': return 'from-emerald-500 to-teal-400';
    case 'aggressive': return 'from-orange-500 to-amber-400';
    case 'very aggressive': return 'from-rose-500 to-pink-400';
    default: return 'from-violet-500 to-purple-400';
  }
};

const getRiskBg = (profile: string | null) => {
  switch (profile?.toLowerCase()) {
    case 'conservative': return 'from-blue-500/10 to-cyan-500/5';
    case 'moderate': return 'from-emerald-500/10 to-teal-500/5';
    case 'aggressive': return 'from-orange-500/10 to-amber-500/5';
    case 'very aggressive': return 'from-rose-500/10 to-pink-500/5';
    default: return 'from-violet-500/10 to-purple-500/5';
  }
};

export function PlanCard({ plan, onView, onDownload, onDelete, index = 0 }: PlanCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group"
    >
      <div
        onClick={onView}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br backdrop-blur-sm cursor-pointer transition-all duration-300",
          "hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/10 hover:scale-[1.02]",
          getRiskBg(plan.risk_profile)
        )}
      >
        {/* Animated gradient border on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className={cn(
            "absolute inset-0 bg-gradient-to-r opacity-10 blur-xl",
            getRiskGradient(plan.risk_profile)
          )} />
        </div>

        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                getRiskGradient(plan.risk_profile)
              )}>
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-foreground truncate pr-2">{plan.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDistanceToNow(new Date(plan.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-xl border-white/10">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(); }}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Risk Profile */}
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Risk Profile</span>
              </div>
              <div className={cn(
                "font-semibold bg-gradient-to-r bg-clip-text text-transparent",
                getRiskGradient(plan.risk_profile)
              )}>
                {plan.risk_profile || 'Moderate'}
              </div>
            </div>

            {/* Risk Score */}
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Risk Score</span>
              </div>
              <div className="font-semibold font-mono text-foreground">
                {plan.risk_score ?? 50}/100
              </div>
            </div>
          </div>

          {/* Investor Type */}
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Investor Type</div>
              <div className="font-medium text-foreground truncate">
                {plan.investor_type_name || 'Balanced Investor'}
              </div>
            </div>
            {plan.investor_type && (
              <Badge variant="outline" className="font-mono text-xs border-white/20">
                {plan.investor_type}
              </Badge>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-emerald-400">AI Generated</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              <span>View Strategy</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
