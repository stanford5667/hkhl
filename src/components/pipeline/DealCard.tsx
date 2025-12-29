import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, AlertTriangle, CheckCircle, Clock, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Deal {
  id: string;
  name: string;
  sector: string;
  ev: number;
  multiple: number;
  progress: number;
  owner: string;
  ownerInitials: string;
  status: "urgent" | "on-track" | "complete" | "at-risk";
  statusText: string;
  stage: string;
}

interface DealCardProps {
  deal: Deal;
  onDragStart?: (e: React.DragEvent, deal: Deal) => void;
}

export function DealCard({ deal, onDragStart }: DealCardProps) {
  const statusConfig = {
    urgent: {
      icon: <AlertTriangle className="h-3 w-3" />,
      variant: "warning" as const,
    },
    "on-track": {
      icon: <Clock className="h-3 w-3" />,
      variant: "default" as const,
    },
    complete: {
      icon: <CheckCircle className="h-3 w-3" />,
      variant: "success" as const,
    },
    "at-risk": {
      icon: <Calendar className="h-3 w-3" />,
      variant: "destructive" as const,
    },
  };

  const config = statusConfig[deal.status];

  return (
    <Card
      variant="interactive"
      className="p-4 cursor-grab active:cursor-grabbing group"
      draggable
      onDragStart={(e) => onDragStart?.(e, deal)}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
            {deal.name}
          </h4>
          <span className="text-xs text-muted-foreground">{deal.sector}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem>Edit Deal</DropdownMenuItem>
            <DropdownMenuItem>Move to Stage...</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex gap-4 text-sm mb-3">
        <div>
          <span className="text-muted-foreground">EV</span>
          <span className="text-foreground ml-1 font-mono">${deal.ev}M</span>
        </div>
        <div>
          <span className="text-muted-foreground">Multiple</span>
          <span className="text-foreground ml-1 font-mono">{deal.multiple}x</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-500"
            style={{ width: `${deal.progress}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground mt-1">{deal.progress}% complete</span>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-secondary text-xs">
              {deal.ownerInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{deal.owner}</span>
        </div>
        <Badge variant={config.variant} className="gap-1">
          {config.icon}
          {deal.statusText}
        </Badge>
      </div>
    </Card>
  );
}
