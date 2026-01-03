// Choose Your Path - Manual vs AI Co-Pilot landing experience
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, 
  Sparkles, 
  ChevronRight,
  Target,
  MessageSquare,
  BarChart3,
  Clock,
  TrendingUp,
  Shield,
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ChooseYourPathProps {
  onSelectManual: () => void;
  onSelectAI: () => void;
}

export function ChooseYourPath({ onSelectManual, onSelectAI }: ChooseYourPathProps) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6">
      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12 max-w-2xl"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
          <BarChart3 className="h-4 w-4" />
          Portfolio Visualizer
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
          Choose Your Path
        </h1>
        <p className="text-lg text-muted-foreground">
          Build your investment portfolio with precision or let our AI guide you through the process
        </p>
      </motion.div>

      {/* Path Cards */}
      <div className="grid md:grid-cols-2 gap-8 max-w-5xl w-full">
        {/* Manual Mode Card */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card 
            className={cn(
              "relative overflow-hidden cursor-pointer transition-all duration-300",
              "hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1",
              "border-2 border-transparent hover:border-blue-500/30",
              "group"
            )}
            onClick={onSelectManual}
          >
            {/* Gradient Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500" />
            
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <CardContent className="p-8 relative">
              {/* Icon */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 w-fit mb-6 group-hover:scale-110 transition-transform">
                <Wrench className="h-8 w-8 text-blue-500" />
              </div>
              
              {/* Title */}
              <h2 className="text-2xl font-bold mb-2">I have a strategy</h2>
              <p className="text-muted-foreground mb-6">
                For experienced investors who know their targets. Input your portfolio details directly.
              </p>
              
              {/* Features */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-1.5 rounded-lg bg-blue-500/10">
                    <Target className="h-4 w-4 text-blue-500" />
                  </div>
                  <span>Set custom ticker weights</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-1.5 rounded-lg bg-blue-500/10">
                    <Clock className="h-4 w-4 text-blue-500" />
                  </div>
                  <span>Define your time horizon</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-1.5 rounded-lg bg-blue-500/10">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                  </div>
                  <span>Black-Litterman analysis</span>
                </div>
              </div>
              
              {/* CTA */}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                  Full Control
                </Badge>
                <div className="flex items-center gap-2 text-blue-500 font-medium group-hover:gap-3 transition-all">
                  <span>Get Started</span>
                  <ChevronRight className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Co-Pilot Card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card 
            className={cn(
              "relative overflow-hidden cursor-pointer transition-all duration-300",
              "hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1",
              "border-2 border-transparent hover:border-purple-500/30",
              "group"
            )}
            onClick={onSelectAI}
          >
            {/* Gradient Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
            
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Recommended Badge */}
            <div className="absolute top-4 right-4">
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                Recommended
              </Badge>
            </div>
            
            <CardContent className="p-8 relative">
              {/* Icon */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 w-fit mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="h-8 w-8 text-purple-500" />
              </div>
              
              {/* Title */}
              <h2 className="text-2xl font-bold mb-2">Help me build one</h2>
              <p className="text-muted-foreground mb-6">
                For learners and those who want AI guidance. We'll build your portfolio together step-by-step.
              </p>
              
              {/* Features */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-1.5 rounded-lg bg-purple-500/10">
                    <MessageSquare className="h-4 w-4 text-purple-500" />
                  </div>
                  <span>Conversational step-by-step wizard</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-1.5 rounded-lg bg-purple-500/10">
                    <Shield className="h-4 w-4 text-purple-500" />
                  </div>
                  <span>Risk tolerance assessment</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-1.5 rounded-lg bg-purple-500/10">
                    <Brain className="h-4 w-4 text-purple-500" />
                  </div>
                  <span>AI-optimized allocation</span>
                </div>
              </div>
              
              {/* CTA */}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">
                  AI Co-Pilot
                </Badge>
                <div className="flex items-center gap-2 text-purple-500 font-medium group-hover:gap-3 transition-all">
                  <span>Start Wizard</span>
                  <ChevronRight className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Footer note */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="text-sm text-muted-foreground mt-12 text-center"
      >
        Both paths provide institutional-grade analysis powered by Black-Litterman and HRP optimization
      </motion.p>
    </div>
  );
}
