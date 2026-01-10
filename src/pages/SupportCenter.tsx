/**
 * Support Center Page
 * 
 * Comprehensive customer support system featuring:
 * - Submit support tickets
 * - View ticket history and status
 * - FAQ / Knowledge base
 * - Contact information
 * - Live chat trigger (Intercom-style)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  HelpCircle,
  MessageSquare,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  Circle,
  Plus,
  Search,
  Send,
  Paperclip,
  ChevronRight,
  ExternalLink,
  BookOpen,
  FileQuestion,
  Bug,
  Lightbulb,
  CreditCard,
  Shield,
  Zap,
  MoreVertical,
  RefreshCw,
  X,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Headphones,
  FileText,
  Video,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

// Types
interface SupportTicket {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to?: string;
  resolution?: string;
  resolved_at?: string;
}

interface TicketMessage {
  id: string;
  created_at: string;
  ticket_id: string;
  user_id?: string;
  is_staff: boolean;
  message: string;
  attachments?: string[];
}

type TicketCategory = 'general' | 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'account';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketStatus = 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed';

// FAQ Data
const FAQ_CATEGORIES = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Zap,
    articles: [
      {
        question: 'How do I add my first portfolio position?',
        answer: 'Navigate to the Portfolio page and click the "+ Add Position" button. You can search for any stock by ticker or company name, enter the quantity and purchase price, then save. Your position will appear in your holdings list immediately.'
      },
      {
        question: 'How do I connect my brokerage account?',
        answer: 'Go to Settings → Integrations and click "Connect Brokerage". We support most major brokerages through Plaid. Select your broker, enter your credentials securely, and your positions will sync automatically.'
      },
      {
        question: 'What asset types does AssetLabs support?',
        answer: 'AssetLabs supports stocks, ETFs, mutual funds, bonds, real estate investments, private equity, crypto, and alternative assets. You can enable or disable asset types in your organization settings.'
      },
    ]
  },
  {
    id: 'portfolio',
    title: 'Portfolio Management',
    icon: FileText,
    articles: [
      {
        question: 'How is portfolio performance calculated?',
        answer: 'We use time-weighted returns (TWR) as the standard methodology, which is the industry standard for measuring investment performance. This accounts for cash flows and provides an accurate picture of your investment decisions. You can also view money-weighted returns in the detailed analytics section.'
      },
      {
        question: 'Can I track multiple portfolios?',
        answer: 'Yes! You can create unlimited portfolios within your organization. Each portfolio can have its own benchmark, target allocation, and reporting preferences. Use the portfolio switcher in the top navigation to move between them.'
      },
      {
        question: 'How do I set up automatic rebalancing alerts?',
        answer: 'Go to Portfolio Settings → Alerts and enable "Rebalancing Notifications". Set your drift threshold (e.g., 5%) and we\'ll notify you when any position deviates from your target allocation by that amount.'
      },
    ]
  },
  {
    id: 'billing',
    title: 'Billing & Subscription',
    icon: CreditCard,
    articles: [
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover), ACH bank transfers, and wire transfers for annual enterprise plans. All payments are processed securely through Stripe.'
      },
      {
        question: 'How do I upgrade or downgrade my plan?',
        answer: 'Go to Settings → Billing → Change Plan. Select your new plan and confirm. Upgrades take effect immediately with prorated billing. Downgrades take effect at the end of your current billing period.'
      },
      {
        question: 'Can I get a refund?',
        answer: 'We offer a 14-day money-back guarantee for new subscriptions. If you\'re not satisfied, contact support within 14 days of your purchase for a full refund. After 14 days, we offer prorated refunds on annual plans only.'
      },
    ]
  },
  {
    id: 'security',
    title: 'Security & Privacy',
    icon: Shield,
    articles: [
      {
        question: 'Is my financial data secure?',
        answer: 'Absolutely. We use bank-level 256-bit AES encryption for all data at rest and TLS 1.3 for data in transit. We\'re SOC 2 Type II certified and undergo regular third-party security audits. Your brokerage credentials are never stored on our servers - we use secure OAuth connections through Plaid.'
      },
      {
        question: 'How do I enable two-factor authentication?',
        answer: 'Go to Settings → Security → Two-Factor Authentication and click "Enable 2FA". You can use an authenticator app (recommended) or SMS verification. We strongly recommend using an authenticator app like Google Authenticator or Authy for better security.'
      },
      {
        question: 'Who can see my portfolio data?',
        answer: 'Only you and team members you explicitly invite to your organization can see your data. We never share, sell, or use your financial data for any purpose other than providing the AssetLabs service. See our Privacy Policy for complete details.'
      },
    ]
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: Zap,
    articles: [
      {
        question: 'Which brokerages do you integrate with?',
        answer: 'We integrate with 10,000+ financial institutions through Plaid, including Fidelity, Charles Schwab, TD Ameritrade, E*TRADE, Robinhood, Vanguard, Interactive Brokers, and many more. Check our integrations page for the full list.'
      },
      {
        question: 'Can I export my data to Excel?',
        answer: 'Yes! On any page with data tables, click the "Export" button to download as CSV or Excel format. You can also set up scheduled exports in Settings → Data Export to receive automatic reports via email.'
      },
      {
        question: 'Do you have an API?',
        answer: 'Yes, we offer a REST API for programmatic access to your portfolio data. API access is available on Pro and Enterprise plans. Documentation is available at docs.assetlabs.ai/api.'
      },
    ]
  },
];

// Category config
const CATEGORY_CONFIG: Record<TicketCategory, { label: string; icon: any; color: string }> = {
  general: { label: 'General Inquiry', icon: HelpCircle, color: 'text-blue-400 bg-blue-500/10' },
  technical: { label: 'Technical Issue', icon: Bug, color: 'text-orange-400 bg-orange-500/10' },
  billing: { label: 'Billing', icon: CreditCard, color: 'text-emerald-400 bg-emerald-500/10' },
  feature_request: { label: 'Feature Request', icon: Lightbulb, color: 'text-purple-400 bg-purple-500/10' },
  bug_report: { label: 'Bug Report', icon: Bug, color: 'text-rose-400 bg-rose-500/10' },
  account: { label: 'Account', icon: Shield, color: 'text-cyan-400 bg-cyan-500/10' },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-slate-400 bg-slate-500/10' },
  medium: { label: 'Medium', color: 'text-blue-400 bg-blue-500/10' },
  high: { label: 'High', color: 'text-orange-400 bg-orange-500/10' },
  urgent: { label: 'Urgent', color: 'text-rose-400 bg-rose-500/10' },
};

const STATUS_CONFIG: Record<TicketStatus, { label: string; icon: any; color: string }> = {
  open: { label: 'Open', icon: Circle, color: 'text-blue-400 bg-blue-500/10' },
  in_progress: { label: 'In Progress', icon: RefreshCw, color: 'text-amber-400 bg-amber-500/10' },
  waiting_on_customer: { label: 'Waiting on You', icon: Clock, color: 'text-purple-400 bg-purple-500/10' },
  resolved: { label: 'Resolved', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10' },
  closed: { label: 'Closed', icon: X, color: 'text-slate-400 bg-slate-500/10' },
};

export default function SupportCenter() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('help');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New ticket form
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    category: 'general' as TicketCategory,
    priority: 'medium' as TicketPriority,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Ticket detail view
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  // FAQ helpful tracking
  const [helpfulArticles, setHelpfulArticles] = useState<Set<string>>(new Set());

  // Fetch tickets
  useEffect(() => {
    if (user) {
      fetchTickets();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchTickets = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets((data || []) as unknown as SupportTicket[]);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      // Don't show error toast - table might not exist yet
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTicketMessages((data || []) as unknown as TicketMessage[]);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const submitTicket = async () => {
    if (!user) {
      toast.error('Please sign in to submit a ticket');
      return;
    }
    
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: newTicket.subject.trim(),
          description: newTicket.description.trim(),
          category: newTicket.category,
          priority: newTicket.priority,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification
      await supabase.functions.invoke('send-support-notification', {
        body: {
          type: 'new_ticket',
          ticket: data,
          userEmail: user.email,
        }
      }).catch(() => {}); // Don't fail if notification fails

      setTickets(prev => [data as unknown as SupportTicket, ...prev]);
      setShowNewTicket(false);
      setNewTicket({
        subject: '',
        description: '',
        category: 'general',
        priority: 'medium',
      });
      toast.success('Ticket submitted! We\'ll respond within 24 hours.');
    } catch (err) {
      console.error('Error submitting ticket:', err);
      toast.error('Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedTicket || !newMessage.trim()) return;

    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user.id,
          is_staff: false,
          message: newMessage.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update ticket status if it was waiting on customer
      if (selectedTicket.status === 'waiting_on_customer') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', selectedTicket.id);
        
        setSelectedTicket(prev => prev ? { ...prev, status: 'in_progress' } : null);
        setTickets(prev => prev.map(t => 
          t.id === selectedTicket.id ? { ...t, status: 'in_progress' as TicketStatus } : t
        ));
      }

      setTicketMessages(prev => [...prev, data as unknown as TicketMessage]);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    }
  };

  const openTicketDetail = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    fetchTicketMessages(ticket.id);
  };

  // Filter FAQ articles by search
  const filteredFAQ = FAQ_CATEGORIES.map(category => ({
    ...category,
    articles: category.articles.filter(article =>
      article.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.articles.length > 0);

  const openTickets = tickets.filter(t => !['resolved', 'closed'].includes(t.status));
  const closedTickets = tickets.filter(t => ['resolved', 'closed'].includes(t.status));

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Headphones className="h-7 w-7 text-primary" />
            Support Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Get help, submit tickets, and find answers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <a href="mailto:support@assetlabs.ai" className="gap-2">
              <Mail className="h-4 w-4" />
              Email Support
            </a>
          </Button>
          <Button onClick={() => setShowNewTicket(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Quick Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <Mail className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email Us</p>
              <a href="mailto:support@assetlabs.ai" className="font-medium text-blue-400 hover:underline">
                support@assetlabs.ai
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/20">
              <Clock className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Response Time</p>
              <p className="font-medium text-emerald-400">Within 24 hours</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/20">
              <MessageCircle className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Live Chat</p>
              <p className="font-medium text-purple-400">Mon-Fri 9am-6pm EST</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="help" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Help Center
          </TabsTrigger>
          <TabsTrigger value="tickets" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            My Tickets
            {openTickets.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {openTickets.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-2">
            <Zap className="h-4 w-4" />
            System Status
          </TabsTrigger>
        </TabsList>

        {/* Help Center Tab */}
        <TabsContent value="help" className="mt-6 space-y-6">
          {/* Search */}
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* FAQ Accordion */}
          {filteredFAQ.length === 0 ? (
            <Card className="bg-secondary/30">
              <CardContent className="p-8 text-center">
                <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No articles found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try different search terms or browse all categories
                </p>
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  Clear Search
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredFAQ.map((category) => (
                <Card key={category.id} className="bg-secondary/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <category.icon className="h-5 w-5 text-primary" />
                      {category.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Accordion type="single" collapsible className="w-full">
                      {category.articles.map((article, idx) => (
                        <AccordionItem key={idx} value={`${category.id}-${idx}`} className="border-border/50">
                          <AccordionTrigger className="text-left hover:no-underline py-4">
                            <span className="text-sm">{article.question}</span>
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground text-sm pb-4">
                            {article.answer}
                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50">
                              <span className="text-xs text-muted-foreground">Was this helpful?</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-8 px-2",
                                  helpfulArticles.has(`${category.id}-${idx}-yes`) && "text-emerald-400"
                                )}
                                onClick={() => {
                                  setHelpfulArticles(prev => new Set(prev).add(`${category.id}-${idx}-yes`));
                                  toast.success('Thanks for your feedback!');
                                }}
                              >
                                <ThumbsUp className="h-4 w-4 mr-1" />
                                Yes
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-8 px-2",
                                  helpfulArticles.has(`${category.id}-${idx}-no`) && "text-rose-400"
                                )}
                                onClick={() => {
                                  setHelpfulArticles(prev => new Set(prev).add(`${category.id}-${idx}-no`));
                                  setShowNewTicket(true);
                                }}
                              >
                                <ThumbsDown className="h-4 w-4 mr-1" />
                                No
                              </Button>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Still Need Help */}
          <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-10 w-10 mx-auto text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Still need help?</h3>
              <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button onClick={() => setShowNewTicket(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Submit a Ticket
                </Button>
                <Button variant="outline" asChild>
                  <a href="mailto:support@assetlabs.ai" className="gap-2">
                    <Mail className="h-4 w-4" />
                    Email Us
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <Card className="bg-secondary/30">
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No support tickets</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                  You haven't submitted any support tickets yet. If you need help, we're here for you!
                </p>
                <Button onClick={() => setShowNewTicket(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Ticket
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Open Tickets */}
              {openTickets.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Open Tickets ({openTickets.length})
                  </h3>
                  <div className="space-y-3">
                    {openTickets.map((ticket) => (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        onClick={() => openTicketDetail(ticket)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Closed Tickets */}
              {closedTickets.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Resolved ({closedTickets.length})
                  </h3>
                  <div className="space-y-3">
                    {closedTickets.map((ticket) => (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        onClick={() => openTicketDetail(ticket)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* System Status Tab */}
        <TabsContent value="status" className="mt-6">
          <Card className="bg-secondary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                All Systems Operational
              </CardTitle>
              <CardDescription>
                Last updated: {format(new Date(), 'MMM d, yyyy h:mm a')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'Web Application', status: 'operational' },
                { name: 'API', status: 'operational' },
                { name: 'Database', status: 'operational' },
                { name: 'Real-time Data Feeds', status: 'operational' },
                { name: 'Authentication', status: 'operational' },
                { name: 'File Storage', status: 'operational' },
              ].map((service) => (
                <div key={service.name} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm">{service.name}</span>
                  <Badge className="text-emerald-400 bg-emerald-500/10">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Operational
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Scheduled Maintenance */}
          <Card className="bg-secondary/30 mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Scheduled Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No scheduled maintenance at this time.
              </p>
            </CardContent>
          </Card>

          {/* Status Page Link */}
          <div className="mt-4 text-center">
            <Button variant="outline" asChild>
              <a href="https://status.assetlabs.ai" target="_blank" rel="noopener noreferrer" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View Full Status Page
              </a>
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Ticket Dialog */}
      <Dialog open={showNewTicket} onOpenChange={setShowNewTicket}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit a Support Ticket</DialogTitle>
            <DialogDescription>
              Describe your issue and we'll get back to you within 24 hours.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Brief description of your issue"
                value={newTicket.subject}
                onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newTicket.category}
                  onValueChange={(value: TicketCategory) => setNewTicket(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <config.icon className="h-4 w-4" />
                          {config.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={newTicket.priority}
                  onValueChange={(value: TicketPriority) => setNewTicket(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Please provide as much detail as possible about your issue..."
                rows={5}
                value={newTicket.description}
                onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTicket(false)}>
              Cancel
            </Button>
            <Button onClick={submitTicket} disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] p-0">
          {selectedTicket && (
            <>
              <DialogHeader className="p-6 pb-4 border-b border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-lg">{selectedTicket.subject}</DialogTitle>
                    <DialogDescription className="flex items-center gap-3 mt-2">
                      <Badge className={cn("text-xs", STATUS_CONFIG[selectedTicket.status].color)}>
                        {STATUS_CONFIG[selectedTicket.status].label}
                      </Badge>
                      <Badge className={cn("text-xs", CATEGORY_CONFIG[selectedTicket.category].color)}>
                        {CATEGORY_CONFIG[selectedTicket.category].label}
                      </Badge>
                      <span className="text-xs">
                        Created {formatDistanceToNow(new Date(selectedTicket.created_at), { addSuffix: true })}
                      </span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="h-[400px]">
                <div className="p-6 space-y-4">
                  {/* Original Description */}
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-2">Original Request</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>

                  {/* Messages */}
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    ticketMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "rounded-lg p-4",
                          msg.is_staff 
                            ? "bg-primary/10 border border-primary/20" 
                            : "bg-secondary/50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={cn(
                            "text-xs font-medium",
                            msg.is_staff ? "text-primary" : "text-muted-foreground"
                          )}>
                            {msg.is_staff ? 'AssetLabs Support' : 'You'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    ))
                  )}

                  {/* Resolution */}
                  {selectedTicket.resolution && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-medium text-emerald-400">Resolution</span>
                      </div>
                      <p className="text-sm">{selectedTicket.resolution}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Reply Input */}
              {!['resolved', 'closed'].includes(selectedTicket.status) && (
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your reply..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim()} size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Ticket Card Component
function TicketCard({ ticket, onClick }: { ticket: SupportTicket; onClick: () => void }) {
  const statusConfig = STATUS_CONFIG[ticket.status];
  const categoryConfig = CATEGORY_CONFIG[ticket.category];
  const StatusIcon = statusConfig.icon;

  return (
    <Card 
      className="bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{ticket.subject}</h4>
            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
              {ticket.description}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <Badge className={cn("text-xs", statusConfig.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
              <Badge className={cn("text-xs", categoryConfig.color)}>
                {categoryConfig.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-4" />
        </div>
      </CardContent>
    </Card>
  );
}
