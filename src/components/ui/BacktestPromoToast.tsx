import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const SESSION_KEY = "backtest-promo-dismissed";

export function BacktestPromoToast() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const timer = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(SESSION_KEY, "1");
  };

  const handleCTA = () => {
    dismiss();
    navigate("/quant-lab?tab=backtest");
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 w-[370px] max-w-[calc(100vw-2rem)]",
        "bg-card border border-border rounded-lg shadow-xl",
        "border-l-4 border-l-cyan-400",
        "animate-fade-in"
      )}
    >
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="p-5 pr-10">
        <h4 className="font-bold text-foreground text-sm mb-1.5">
          Test Your Trading Ideas
        </h4>
        <p className="text-muted-foreground text-xs leading-relaxed mb-4">
          Curious how your strategy would have performed? Build and run your first AI-powered backtest completely for free. No coding required.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCTA}
            className="bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
          >
            Start Free Backtest
          </button>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
