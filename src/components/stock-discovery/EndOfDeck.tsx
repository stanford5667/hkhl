import React from "react";
import { motion } from "framer-motion";
import { Sparkles, RotateCcw, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface EndOfDeckProps {
  likesCount: number;
  onReset: () => void;
}

export function EndOfDeck({ likesCount, onReset }: EndOfDeckProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      className="flex flex-col items-center justify-center text-center px-6 py-12 space-y-6"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      <motion.div
        className="h-24 w-24 rounded-3xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-500/30 flex items-center justify-center"
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      >
        <Sparkles className="h-10 w-10 text-violet-400" />
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-2xl font-black text-foreground">You're all caught up!</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          You've swiped through all available stocks.
          {likesCount > 0 && (
            <>
              {" "}You liked <span className="text-emerald-400 font-bold">{likesCount}</span> stocks.
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          onClick={onReset}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Shuffle & Restart
        </Button>

        {likesCount > 0 && (
          <Button
            onClick={() => navigate("/watchlist")}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
          >
            <Heart className="h-4 w-4" />
            View Liked Stocks
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
