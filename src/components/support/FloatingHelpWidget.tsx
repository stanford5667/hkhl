/**
 * Floating Help Widget
 * 
 * A floating help button that's always accessible across the app.
 * Features:
 * - Quick access to support
 * - Expandable menu with options
 * - Feedback form
 * - Keyboard shortcut support
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  HelpCircle,
  MessageSquare,
  Mail,
  Book,
  FileQuestion,
  Lightbulb,
  Bug,
  X,
  Send,
  ExternalLink,
  Keyboard,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Headphones,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: any;
  action: () => void;
  color: string;
}

export function FloatingHelpWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'general'>('general');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Set email from user
  useEffect(() => {
    if (user?.email) {
      setFeedbackEmail(user.email);
    }
  }, [user]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift + ? to open help
      if (e.shiftKey && e.key === '?') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const quickActions: QuickAction[] = [
    {
      id: 'support',
      label: 'Support Center',
      description: 'Browse help articles & tickets',
      icon: Headphones,
      action: () => {
        navigate('/support');
        setIsOpen(false);
      },
      color: 'text-blue-400',
    },
    {
      id: 'email',
      label: 'Email Support',
      description: 'support@assetlabs.ai',
      icon: Mail,
      action: () => {
        window.location.href = 'mailto:support@assetlabs.ai';
        setIsOpen(false);
      },
      color: 'text-emerald-400',
    },
    {
      id: 'docs',
      label: 'Documentation',
      description: 'Guides & API reference',
      icon: Book,
      action: () => {
        window.open('https://docs.assetlabs.ai', '_blank');
        setIsOpen(false);
      },
      color: 'text-purple-400',
    },
    {
      id: 'feedback',
      label: 'Send Feedback',
      description: 'Bug reports & suggestions',
      icon: Lightbulb,
      action: () => {
        setShowFeedback(true);
      },
      color: 'text-amber-400',
    },
  ];

  const submitFeedback = async () => {
    if (!feedbackText.trim()) {
      toast.error('Please enter your feedback');
      return;
    }

    setIsSubmitting(true);
    try {
      // Save to database
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id || null,
          subject: `[${feedbackType.toUpperCase()}] Quick Feedback`,
          description: feedbackText.trim(),
          category: feedbackType === 'bug' ? 'bug_report' : feedbackType === 'feature' ? 'feature_request' : 'general',
          priority: 'medium',
          status: 'open',
        });

      if (error) throw error;

      // Send email notification
      await supabase.functions.invoke('send-support-notification', {
        body: {
          type: 'feedback',
          feedbackType,
          message: feedbackText.trim(),
          userEmail: feedbackEmail || user?.email || 'anonymous',
        }
      }).catch(() => {}); // Don't fail if notification fails

      setSubmitted(true);
      setTimeout(() => {
        setShowFeedback(false);
        setSubmitted(false);
        setFeedbackText('');
        setFeedbackType('general');
        setIsOpen(false);
      }, 2000);

    } catch (err) {
      console.error('Error submitting feedback:', err);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              size="lg"
              className={cn(
                "h-14 w-14 rounded-full shadow-lg transition-all duration-200",
                "bg-primary hover:bg-primary/90 hover:scale-105",
                isOpen && "rotate-45"
              )}
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <HelpCircle className="h-6 w-6" />
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent 
            side="top" 
            align="end" 
            className="w-80 p-0 bg-background/95 backdrop-blur-lg border-border shadow-2xl"
            sideOffset={16}
          >
            <AnimatePresence mode="wait">
              {!showFeedback ? (
                <motion.div
                  key="menu"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Header */}
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold">Need help?</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      We're here to assist you
                    </p>
                  </div>

                  {/* Quick Actions */}
                  <div className="p-2">
                    {quickActions.map((action) => (
                      <button
                        key={action.id}
                        onClick={action.action}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/80 transition-colors text-left group"
                      >
                        <div className={cn("p-2 rounded-lg bg-secondary", action.color)}>
                          <action.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{action.label}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {action.description}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>

                  {/* Keyboard Shortcut Hint */}
                  <div className="px-4 py-3 border-t border-border bg-secondary/50">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Keyboard className="h-3 w-3" />
                        Press <kbd className="px-1.5 py-0.5 bg-background rounded border border-border font-mono">?</kbd> for help
                      </span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="feedback"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {submitted ? (
                    <div className="p-8 text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', duration: 0.5 }}
                      >
                        <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-400 mb-4" />
                      </motion.div>
                      <h3 className="font-semibold">Thank you!</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your feedback has been submitted
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Header */}
                      <div className="p-4 border-b border-border flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">Send Feedback</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Help us improve AssetLabs
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setShowFeedback(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Feedback Type */}
                      <div className="p-4 space-y-4">
                        <div className="flex gap-2">
                          {[
                            { id: 'general', label: 'General', icon: MessageSquare },
                            { id: 'bug', label: 'Bug', icon: Bug },
                            { id: 'feature', label: 'Feature', icon: Lightbulb },
                          ].map((type) => (
                            <Button
                              key={type.id}
                              variant={feedbackType === type.id ? 'default' : 'outline'}
                              size="sm"
                              className="flex-1 gap-1"
                              onClick={() => setFeedbackType(type.id as any)}
                            >
                              <type.icon className="h-3 w-3" />
                              {type.label}
                            </Button>
                          ))}
                        </div>

                        {!user && (
                          <div className="space-y-2">
                            <Label htmlFor="feedback-email" className="text-xs">Email (optional)</Label>
                            <Input
                              id="feedback-email"
                              type="email"
                              placeholder="your@email.com"
                              value={feedbackEmail}
                              onChange={(e) => setFeedbackEmail(e.target.value)}
                              className="h-9"
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="feedback-text" className="text-xs">Your feedback</Label>
                          <Textarea
                            id="feedback-text"
                            placeholder={
                              feedbackType === 'bug'
                                ? 'Describe the bug...'
                                : feedbackType === 'feature'
                                ? 'Describe your feature idea...'
                                : 'Share your thoughts...'
                            }
                            rows={4}
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            className="resize-none"
                          />
                        </div>

                        <Button
                          className="w-full gap-2"
                          onClick={submitFeedback}
                          disabled={isSubmitting || !feedbackText.trim()}
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Send Feedback
                        </Button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
