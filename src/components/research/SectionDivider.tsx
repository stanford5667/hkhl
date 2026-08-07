import { Zap } from "lucide-react";

export function SectionDivider() {
  return (
    <div className="relative w-full py-2">
      {/* Diagonal slash accents */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />
      </div>
      <div className="relative flex justify-center">
        <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 border border-primary/40 shadow-[0_0_12px_rgba(59,130,246,0.35)] backdrop-blur-sm">
          <Zap className="h-3.5 w-3.5 text-primary fill-primary/20" />
        </div>
      </div>
    </div>
  );
}

