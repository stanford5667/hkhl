import { useState } from 'react';
import { Contact } from '@/hooks/useContacts';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  MessageSquare,
  ListTodo,
  Workflow,
  Activity,
  Info,
  Mail,
  Phone,
  Linkedin,
  Star,
  Building2,
  Calendar,
  FileText,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatTab } from './ChatTab';
import { TasksTab } from './TasksTab';
import { FlowsTab } from './FlowsTab';
import { ActivityTab } from './ActivityTab';
import { InfoTab } from './InfoTab';

interface ContactDetailPanelProps {
  contact: Contact | null;
  open: boolean;
  onClose: () => void;
}

export function ContactDetailPanel({ contact, open, onClose }: ContactDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('chat');

  if (!contact) return null;

  const initials = `${contact.first_name[0]}${contact.last_name[0]}`.toUpperCase();
  const isTeamMember = contact.category === 'team';

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col bg-card border-border">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {isTeamMember && (
                  <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-card" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">
                    {contact.first_name} {contact.last_name}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {contact.title}
                  {contact.company && ` at ${contact.company.name}`}
                </p>

                <div className="flex items-center gap-3 mt-2">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {contact.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <QuickStat label="Tasks" value="3" />
            <QuickStat label="Emails" value="12" />
            <QuickStat label="Meetings" value="5" />
            <QuickStat label="Notes" value="8" />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-5 mx-6 mt-4 bg-muted/50">
            <TabsTrigger value="chat" className="text-xs gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              {isTeamMember ? 'Chat' : 'Email'}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs gap-1.5">
              <ListTodo className="h-3.5 w-3.5" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="flows" className="text-xs gap-1.5">
              <Workflow className="h-3.5 w-3.5" />
              Flows
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="info" className="text-xs gap-1.5">
              <Info className="h-3.5 w-3.5" />
              Info
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="chat" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <ChatTab contact={contact} />
            </TabsContent>
            <TabsContent value="tasks" className="h-full m-0 p-6 overflow-y-auto">
              <TasksTab contact={contact} />
            </TabsContent>
            <TabsContent value="flows" className="h-full m-0 p-6 overflow-y-auto">
              <FlowsTab contact={contact} />
            </TabsContent>
            <TabsContent value="activity" className="h-full m-0 p-6 overflow-y-auto">
              <ActivityTab contact={contact} />
            </TabsContent>
            <TabsContent value="info" className="h-full m-0 p-6 overflow-y-auto">
              <InfoTab contact={contact} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
