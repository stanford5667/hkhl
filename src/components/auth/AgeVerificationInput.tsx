/**
 * Age Verification Component
 * 2026-compliant DOB-based age gate with data minimization
 * - Uses Date of Birth input (neutral age gate)
 * - Only returns verified status, DOB is not stored
 * - Includes 18+ rating badge
 */

import { useState, useMemo } from "react";
import { AlertTriangle, ShieldCheck, Calendar } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface AgeVerificationInputProps {
  onVerificationChange: (isVerified: boolean) => void;
  error?: string;
  className?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = CURRENT_YEAR - 120; // Max age 120
const MAX_YEAR = CURRENT_YEAR - 18; // Must be 18+

export function AgeVerificationInput({ 
  onVerificationChange, 
  error,
  className 
}: AgeVerificationInputProps) {
  const [month, setMonth] = useState<string>("");
  const [day, setDay] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed'>('pending');

  // Generate years from MAX_YEAR down to MIN_YEAR
  const years = useMemo(() => {
    const arr = [];
    for (let y = MAX_YEAR; y >= MIN_YEAR; y--) {
      arr.push(y);
    }
    return arr;
  }, []);

  // Generate days based on selected month and year
  const days = useMemo(() => {
    if (!month || !year) return Array.from({ length: 31 }, (_, i) => i + 1);
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [month, year]);

  const verifyAge = (m: string, d: string, y: string) => {
    if (!m || !d || !y) {
      setVerificationStatus('pending');
      onVerificationChange(false);
      return;
    }

    const birthDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    const isVerified = age >= 18;
    setVerificationStatus(isVerified ? 'verified' : 'failed');
    onVerificationChange(isVerified);
  };

  const handleMonthChange = (value: string) => {
    setMonth(value);
    verifyAge(value, day, year);
  };

  const handleDayChange = (value: string) => {
    setDay(value);
    verifyAge(month, value, year);
  };

  const handleYearChange = (value: string) => {
    setYear(value);
    verifyAge(month, day, value);
  };

  return (
    <div className={cn("space-y-1", className)}>
      {/* 18+ Rating Badge + Label inline */}
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-medium flex items-center gap-1">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          Date of Birth
        </Label>
        <div className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
          <ShieldCheck className="h-2.5 w-2.5 text-amber-500" />
          <span className="text-[9px] font-semibold text-amber-500">18+</span>
        </div>
      </div>

      {/* DOB Inputs - more compact */}
      <div className="grid grid-cols-3 gap-1.5">
        <Select value={month} onValueChange={handleMonthChange}>
          <SelectTrigger className="h-8 text-[11px] px-2">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent position="popper" className="pointer-events-auto z-[9999]" onPointerDownOutside={(e) => e.preventDefault()}>
            {MONTHS.map((m, idx) => (
              <SelectItem key={m} value={String(idx + 1)} className="text-xs">
                {m.slice(0, 3)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={day} onValueChange={handleDayChange}>
          <SelectTrigger className="h-8 text-[11px] px-2">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent position="popper" className="pointer-events-auto z-[9999]" onPointerDownOutside={(e) => e.preventDefault()}>
            {days.map((d) => (
              <SelectItem key={d} value={String(d)} className="text-xs">
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={year} onValueChange={handleYearChange}>
          <SelectTrigger className="h-8 text-[11px] px-2">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[180px] pointer-events-auto z-[9999]" onPointerDownOutside={(e) => e.preventDefault()}>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)} className="text-xs">
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Messages - ultra compact */}
      {verificationStatus === 'verified' && (
        <div className="flex items-center gap-1 py-0.5 px-1.5 rounded bg-emerald-500/10 border border-emerald-500/30">
          <ShieldCheck className="h-2.5 w-2.5 text-emerald-500 flex-shrink-0" />
          <p className="text-[9px] text-emerald-600 dark:text-emerald-400">Verified</p>
        </div>
      )}

      {verificationStatus === 'failed' && (
        <div className="flex items-center gap-1 py-0.5 px-1.5 rounded bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="h-2.5 w-2.5 text-destructive flex-shrink-0" />
          <p className="text-[9px] text-destructive">Must be 18+</p>
        </div>
      )}

      {error && verificationStatus === 'pending' && (
        <p className="text-[10px] text-destructive">{error}</p>
      )}

      {/* Legal disclosure - single line */}
      <p className="text-[8px] text-muted-foreground leading-tight">
        By continuing, you confirm you're 18+ and agree to our <a href="/terms" className="text-primary hover:underline">Terms</a> & <a href="/privacy" className="text-primary hover:underline">Privacy</a>.
      </p>
    </div>
  );
}

/**
 * Compact 18+ badge for display in headers/cards
 */
export function AgeRatingBadge({ className }: { className?: string }) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
      "bg-amber-500/10 border border-amber-500/30",
      className
    )}>
      <ShieldCheck className="h-3 w-3 text-amber-500" />
      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">
        Adults Only (18+)
      </span>
    </div>
  );
}
