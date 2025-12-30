import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function TaskCheckbox({ checked, onChange, disabled, size = 'md' }: TaskCheckboxProps) {
  const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const iconSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3';
  
  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
      className={cn(
        "rounded-full border-2 flex items-center justify-center transition-colors",
        sizeClass,
        checked 
          ? "bg-emerald-500 border-emerald-500" 
          : "border-slate-600 hover:border-slate-500",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      whileTap={{ scale: disabled ? 1 : 0.9 }}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
    >
      <AnimatePresence mode="wait">
        {checked && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Check className={cn(iconSize, "text-white")} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
