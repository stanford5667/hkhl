import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ResearchHeroProps {
  className?: string;
}

export function ResearchHero({ className }: ResearchHeroProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="relative max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-10 pb-5 sm:pb-8">
        {/* Hero Text — Terminal style */}
        <div className="text-center mb-5 sm:mb-10">
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
            <div className="inline-flex items-center gap-2 sm:gap-3">
              <Link
                to="/academy"
                className="inline-flex items-center px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-widest hover:bg-primary/20 transition-colors"
              >
                Learn
              </Link>
              <span aria-hidden="true" className="text-primary/40">·</span>
              <Link
                to="/auth"
                state={{ mode: 'signup' }}
                className="inline-flex items-center px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-widest hover:bg-primary/20 transition-colors"
              >
                Test
              </Link>
              <span aria-hidden="true" className="text-primary/40">·</span>
              <Link
                to="/watchlist"
                className="inline-flex items-center px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-widest hover:bg-primary/20 transition-colors"
              >
                Track
              </Link>
            </div>
          </motion.div>

          <motion.p
            className="text-muted-foreground text-[15px] sm:text-base lg:text-xl max-w-2xl sm:mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
          >
            <span className="text-primary font-medium">Automate investing with AI.</span>{' '}
            Learn investing from top fund managers. Access their best plays.
          </motion.p>
        </div>


      </div>
    </div>
  );
}
