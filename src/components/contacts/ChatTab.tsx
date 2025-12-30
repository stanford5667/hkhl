import { useState, useRef, useEffect } from 'react';
import { Contact } from '@/hooks/useContacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Send,
  Paperclip,
  Smile,
  Mail,
  FileText,
  Sparkles,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ChatTabProps {
  contact: Contact;
}

export function ChatTab({ contact }: ChatTabProps) {
  const isTeamMember = contact.category === 'team';

  if (isTeamMember) {
    return <TeamChatInterface contact={contact} />;
  }

  return <EmailComposerInterface contact={contact} />;
}

function TeamChatInterface({ contact }: { contact: Contact }) {
  const [message, setMessage] = useState('');
  const [messages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) return;
    // TODO: Implement actual send logic
    setMessage('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground/70">
              Start a conversation with {contact.first_name}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <ChatMessage
                key={i}
                message={msg}
                isOwn={msg.senderId === 'currentUser'}
                showAvatar={i === 0 || messages[i - 1]?.senderId !== msg.senderId}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Message ${contact.first_name}...`}
              className="min-h-[80px] bg-muted/50 border-border resize-none pr-24"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="absolute bottom-2 right-2 flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Smile className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button onClick={handleSend} disabled={!message.trim()} className="h-auto py-3">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

function ChatMessage({
  message,
  isOwn,
  showAvatar,
}: {
  message: any;
  isOwn: boolean;
  showAvatar: boolean;
}) {
  return (
    <div className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
      {showAvatar ? (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs bg-muted">
            {message.sender?.name
              ?.split(' ')
              .map((n: string) => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 flex-shrink-0" />
      )}

      <div className={cn('max-w-[70%]', isOwn && 'text-right')}>
        {showAvatar && (
          <p className="text-xs text-muted-foreground mb-1">
            {message.sender?.name} · {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </p>
        )}
        <div
          className={cn(
            'inline-block px-4 py-2 rounded-2xl',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md'
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    </div>
  );
}

function EmailComposerInterface({ contact }: { contact: Contact }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailHistory] = useState<any[]>([]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;

    setIsSending(true);
    try {
      // TODO: Implement email sending
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSubject('');
      setBody('');
    } finally {
      setIsSending(false);
    }
  };

  const applyTemplate = (templateId: string) => {
    const templates: Record<string, { subject: string; body: string }> = {
      intro: {
        subject: `Introduction - ${contact.first_name}`,
        body: `Hi ${contact.first_name},\n\nI hope this email finds you well. I wanted to reach out to introduce myself and explore potential opportunities for collaboration.\n\nBest regards`,
      },
      'follow-up': {
        subject: `Following Up`,
        body: `Hi ${contact.first_name},\n\nI wanted to follow up on our previous conversation.\n\nBest regards`,
      },
      meeting: {
        subject: `Meeting Request`,
        body: `Hi ${contact.first_name},\n\nI would like to schedule a meeting to discuss...\n\nPlease let me know your availability.\n\nBest regards`,
      },
      thanks: {
        subject: `Thank You`,
        body: `Hi ${contact.first_name},\n\nThank you for taking the time to speak with me today.\n\nBest regards`,
      },
      'check-in': {
        subject: `Checking In`,
        body: `Hi ${contact.first_name},\n\nI hope you're doing well. I wanted to check in and see how things are going.\n\nBest regards`,
      },
    };

    const template = templates[templateId];
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
    setSelectedTemplate(templateId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Email History */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-foreground font-medium">Email History</h4>
          <Badge variant="outline" className="text-muted-foreground">
            {emailHistory.length} emails
          </Badge>
        </div>

        {emailHistory.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground">No emails yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {emailHistory.map((email) => (
              <EmailHistoryCard key={email.id} email={email} />
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-foreground font-medium">New Email</h4>

          <Select value={selectedTemplate} onValueChange={applyTemplate}>
            <SelectTrigger className="w-48 h-8 bg-muted/50 border-border">
              <FileText className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Use template..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="intro">Introduction</SelectItem>
              <SelectItem value="follow-up">Follow Up</SelectItem>
              <SelectItem value="meeting">Meeting Request</SelectItem>
              <SelectItem value="thanks">Thank You</SelectItem>
              <SelectItem value="check-in">Check In</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">To:</span>
          <Badge variant="outline" className="text-foreground">
            {contact.email}
          </Badge>
        </div>

        <Input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="bg-muted/50 border-border"
        />

        <Textarea
          placeholder="Write your message..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[120px] bg-muted/50 border-border resize-none"
        />

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">
              <Paperclip className="h-4 w-4 mr-1.5" />
              Attach
            </Button>
            <Button variant="ghost" size="sm">
              <Sparkles className="h-4 w-4 mr-1.5" />
              AI Write
            </Button>
          </div>

          <Button onClick={handleSend} disabled={!subject.trim() || !body.trim() || isSending}>
            {isSending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Email
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmailHistoryCard({ email }: { email: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className={cn(
        'p-3 bg-muted/30 border-border cursor-pointer hover:bg-muted/50 transition-colors',
        email.direction === 'sent' && 'border-l-2 border-l-primary',
        email.direction === 'received' && 'border-l-2 border-l-blue-500'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {email.direction === 'sent' ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowDownLeft className="h-3.5 w-3.5 text-blue-400" />
          )}
          <span className="text-foreground font-medium text-sm">{email.subject}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(email.sentAt), { addSuffix: true })}
        </span>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">{email.body}</p>
          {email.attachments?.length > 0 && (
            <div className="mt-2 flex gap-2">
              {email.attachments.map((att: any, i: number) => (
                <Badge key={i} variant="outline" className="text-muted-foreground">
                  <Paperclip className="h-3 w-3 mr-1" />
                  {att.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
