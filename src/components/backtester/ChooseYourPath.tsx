// Choose Your Path - Manual vs AI Co-Pilot vs IPS Questionnaire landing experience
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
  Brain,
  ClipboardList,
  GraduationCap,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ChooseYourPathProps {
  onSelectManual: () => void;
  onSelectAI: () => void;
  onSelectQuestionnaire?: () => void;
}

export function ChooseYourPath({ onSelectManual, onSelectAI, onSelectQuestionnaire }: ChooseYourPathProps) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-12">
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
          Build your investment portfolio with precision, AI guidance, or a comprehensive questionnaire
        </p>
      </motion.div>

      {/* Path Cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl w-full">
        {/* Manual Mode Card */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card 
            className={cn(
              "relative overflow-hidden cursor-pointer transition-all duration-300 h-full",
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
            
            <CardContent className="p-6 relative flex flex-col h-full">
              {/* Icon */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 w-fit mb-4 group-hover:scale-110 transition-transform">
                <Wrench className="h-6 w-6 text-blue-500" />
              </div>
              
              {/* Title */}
              <h2 className="text-xl font-bold mb-2">I have a strategy</h2>
              <p className="text-sm text-muted-foreground mb-4 flex-1">
                For experienced investors who know their targets and allocations.
              </p>
              
              {/* Features */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span>Set custom ticker weights</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>Define time horizon</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  <span>Black-Litterman analysis</span>
                </div>
              </div>
              
              {/* CTA */}
              <div className="flex items-center justify-between mt-auto">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                  Full Control
                </Badge>
                <ChevronRight className="h-5 w-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Co-Pilot Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card 
            className={cn(
              "relative overflow-hidden cursor-pointer transition-all duration-300 h-full",
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
            <div className="absolute top-3 right-3">
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-xs">
                Quick
              </Badge>
            </div>
            
            <CardContent className="p-6 relative flex flex-col h-full">
              {/* Icon */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 w-fit mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6 text-purple-500" />
              </div>
              
              {/* Title */}
              <h2 className="text-xl font-bold mb-2">Quick AI wizard</h2>
              <p className="text-sm text-muted-foreground mb-4 flex-1">
                Fast setup with AI guidance. Perfect for getting started quickly.
              </p>
              
              {/* Features */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4 text-purple-500" />
                  <span>Step-by-step wizard</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-purple-500" />
                  <span>Risk assessment</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Brain className="h-4 w-4 text-purple-500" />
                  <span>AI-optimized allocation</span>
                </div>
              </div>
              
              {/* CTA */}
              <div className="flex items-center justify-between mt-auto">
                <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">
                  AI Co-Pilot
                </Badge>
                <ChevronRight className="h-5 w-5 text-purple-500 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* IPS Questionnaire Card */}
        {onSelectQuestionnaire && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card 
              className={cn(
                "relative overflow-hidden cursor-pointer transition-all duration-300 h-full",
                "hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1",
                "border-2 border-transparent hover:border-emerald-500/30",
                "group"
              )}
              onClick={onSelectQuestionnaire}
            >
              {/* Gradient Top Bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
              
              {/* Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {/* Recommended Badge */}
              <div className="absolute top-3 right-3">
                <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 text-xs">
                  Recommended
                </Badge>
              </div>
              
              <CardContent className="p-6 relative flex flex-col h-full">
                {/* Icon */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 w-fit mb-4 group-hover:scale-110 transition-transform">
                  <ClipboardList className="h-6 w-6 text-emerald-500" />
                </div>
                
                {/* Title */}
                <h2 className="text-xl font-bold mb-2">Build my investor profile</h2>
                <p className="text-sm text-muted-foreground mb-4 flex-1">
                  Comprehensive questionnaire to build your personalized Investor Policy Statement.
                </p>
                
                {/* Features */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <GraduationCap className="h-4 w-4 text-emerald-500" />
                    <span>Educational explanations</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Lightbulb className="h-4 w-4 text-emerald-500" />
                    <span>Goals & risk analysis</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <span>Personalized IPS</span>
                  </div>
                </div>
                
                {/* CTA */}
                <div className="flex items-center justify-between mt-auto">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                    Deep Dive
                  </Badge>
                  <ChevronRight className="h-5 w-5 text-emerald-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Footer note */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="text-sm text-muted-foreground mt-12 text-center max-w-2xl"
      >
        All paths provide institutional-grade analysis powered by Black-Litterman and HRP optimization
      </motion.p>
    </div>
  );
}
