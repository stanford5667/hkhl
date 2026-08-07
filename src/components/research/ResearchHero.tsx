import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';

interface ResearchHeroProps {
  className?: string;
}

export function ResearchHero({ className }: ResearchHeroProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="relative max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-10 pb-5 sm:pb-8">
        {/* Hero Text — Terminal style */}
        <div className="text-center mb-2 sm:mb-3">
      {/* Removed Research Terminal badge */}


          <motion.h1
            className="font-display text-[clamp(2.75rem,12vw,4.5rem)] leading-[1.0] tracking-tight font-bold mb-4 sm:mb-5 w-full"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Mobile: 3-line stacked */}
            <span className="block sm:hidden">
              <span className="text-foreground block">Your next big</span>
              <span className="text-primary block">investment</span>
              <span className="text-foreground block">starts here</span>
            </span>
            {/* Desktop: single line */}
            <span className="hidden sm:block whitespace-nowrap text-[clamp(2.25rem,4vw,3.25rem)]">
              <span className="text-foreground">Your next big </span>
              <span className="text-primary">investment</span>
              <span className="text-foreground"> starts here</span>
            </span>
          </motion.h1>

          <motion.div
            className="flex justify-center mb-3 sm:mb-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
          >
            <div className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] border border-white/[0.08] p-1">
              <Link
                to="/academy"
                className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-primary text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-blue-600 transition-colors"
              >
                Learn
              </Link>
              <Link
                to="/auth"
                state={{ mode: 'signup' }}
                className="inline-flex items-center px-3.5 py-1.5 rounded-full text-white/50 text-[10px] font-semibold uppercase tracking-widest hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                Test
              </Link>
              <Link
                to="/watchlist"
                className="inline-flex items-center px-3.5 py-1.5 rounded-full text-white/50 text-[10px] font-semibold uppercase tracking-widest hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                Track
              </Link>
            </div>
          </motion.div>

          <motion.p
            className="text-[15px] sm:text-base lg:text-xl max-w-2xl sm:mx-auto leading-relaxed text-white/65"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
          >
            Automate investing with AI. Learn investing from top fund managers. Access their best plays.
          </motion.p>




        </div>


      </div>
    </div>
  );
}
