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
      className="group h-full"
    >
      <div
        onClick={onView}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border/50 bg-card cursor-pointer transition-all duration-300 h-full flex flex-col",
          "hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:scale-[1.01]"
        )}
      >
        {/* Subtle gradient accent at top */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
          getRiskGradient(plan.risk_profile)
        )} />

        <div className="relative p-5 flex flex-col flex-1">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={cn(
                "w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md shrink-0",
                getRiskGradient(plan.risk_profile)
              )}>
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground truncate text-base">{plan.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDistanceToNow(new Date(plan.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted shrink-0"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border-border">
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

          {/* Stats Grid - Fixed height alignment */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {/* Risk Profile */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Risk Profile</span>
              </div>
              <div className={cn(
                "font-semibold text-sm bg-gradient-to-r bg-clip-text text-transparent",
                getRiskGradient(plan.risk_profile)
              )}>
                {plan.risk_profile || 'Moderate'}
              </div>
            </div>

            {/* Risk Score */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Risk Score</span>
              </div>
              <div className="font-semibold font-mono text-sm text-foreground">
                {plan.risk_score ?? 50}<span className="text-muted-foreground font-normal">/100</span>
              </div>
            </div>
          </div>

          {/* Investor Type - Spacer for alignment */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg flex-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Investor Type</div>
              <div className="font-medium text-sm text-foreground truncate mt-0.5">
                {plan.investor_type_name || 'Balanced Investor'}
              </div>
            </div>
            {plan.investor_type && (
              <Badge variant="secondary" className="font-mono text-[10px] shrink-0">
                {plan.investor_type}
              </Badge>
            )}
          </div>

          {/* Footer - Always at bottom */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-primary font-medium">AI Generated</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              <span className="font-medium">View Strategy</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
