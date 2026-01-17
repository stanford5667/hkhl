import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, BarChart3, TrendingUp, Zap, Sparkles, 
  Brain, LineChart, Target, Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudyRunningOverlayProps {
  isRunning: boolean;
  studyName: string;
  ticker: string;
  isGuest?: boolean;
}

const analysisSteps = [
  { icon: BarChart3, text: 'Fetching historical data...', delay: 0 },
  { icon: LineChart, text: 'Analyzing price patterns...', delay: 0.8 },
  { icon: Brain, text: 'Computing statistics...', delay: 1.6 },
  { icon: Target, text: 'Generating insights...', delay: 2.4 },
];

export function StudyRunningOverlay({ 
  isRunning, 
  studyName, 
  ticker,
  isGuest = false 
}: StudyRunningOverlayProps) {
  return (
    <AnimatePresence>
      {isRunning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative max-w-md w-full mx-4"
          >
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent rounded-3xl blur-2xl" />
            
            <div className="relative bg-card border-2 border-primary/30 rounded-3xl p-8 shadow-2xl overflow-hidden">
              {/* Animated particles */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-primary/30 rounded-full"
                    initial={{ 
                      x: Math.random() * 400, 
                      y: Math.random() * 400,
                      scale: 0 
                    }}
                    animate={{ 
                      x: [null, Math.random() * 400],
                      y: [null, Math.random() * 400],
                      scale: [0, 1, 0],
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.5,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>

              {/* Main content */}
              <div className="relative z-10 text-center">
                {/* Spinning icon with pulse */}
                <div className="relative inline-flex mb-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="p-4 rounded-full bg-primary/10 border-2 border-primary/30"
                  >
                    <Activity className="h-8 w-8 text-primary" />
                  </motion.div>
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary/50"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>

                {/* Study info */}
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="text-xl font-bold mb-1">Analyzing {ticker}</h3>
                  <p className="text-muted-foreground text-sm mb-6">{studyName}</p>
                </motion.div>

                {/* Analysis steps */}
                <div className="space-y-3 mb-6">
                  {analysisSteps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: step.delay }}
                      className="flex items-center gap-3 text-left"
                    >
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          opacity: [0.5, 1, 0.5]
                        }}
                        transition={{ 
                          duration: 1.5, 
                          repeat: Infinity,
                          delay: step.delay 
                        }}
                        className="p-2 rounded-lg bg-primary/10"
                      >
                        <step.icon className="h-4 w-4 text-primary" />
                      </motion.div>
                      <span className="text-sm text-muted-foreground">{step.text}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Guest user CTA */}
                {isGuest && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">Unlock Full Power</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Create a free account to save studies, run batch analyses, and build your research library
                    </p>
                  </motion.div>
                )}

                {/* Fun fact for engagement */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                  className="text-xs text-muted-foreground mt-4 italic"
                >
                  💡 Pro tip: Run multiple studies to discover hidden patterns
                </motion.p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
