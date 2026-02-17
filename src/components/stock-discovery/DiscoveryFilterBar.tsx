import React, { useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DiscoveryFilterBarProps {
  sectors: string[];
  selectedSector: string | null;
  onSelectSector: (sector: string | null) => void;
  assetType: string | null;
  onSelectAssetType: (type: string | null) => void;
}

const ASSET_TYPES = [
  { value: null, label: "All" },
  { value: "stock", label: "Stocks" },
  { value: "etf", label: "ETFs" },
];

export function DiscoveryFilterBar({
  sectors,
  selectedSector,
  onSelectSector,
  assetType,
  onSelectAssetType,
}: DiscoveryFilterBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-2">
      {/* Asset type tabs */}
      <div className="flex gap-1.5">
        {ASSET_TYPES.map((t) => (
          <button
            key={t.label}
            onClick={() => onSelectAssetType(t.value)}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
              assetType === t.value
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sector scroll */}
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <button
          onClick={() => onSelectSector(null)}
          className={cn(
            "shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all border",
            selectedSector === null
              ? "bg-foreground/10 text-foreground border-foreground/20"
              : "bg-transparent text-muted-foreground border-border/40 hover:border-border"
          )}
        >
          All Sectors
        </button>

        {sectors.map((sector) => (
          <button
            key={sector}
            onClick={() =>
              onSelectSector(selectedSector === sector ? null : sector)
            }
            className={cn(
              "shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all border",
              selectedSector === sector
                ? "bg-foreground/10 text-foreground border-foreground/20"
                : "bg-transparent text-muted-foreground border-border/40 hover:border-border"
            )}
          >
            {sector}
          </button>
        ))}
      </div>
    </div>
  );
}
