/**
 * Typography Components
 * 
 * Consistent typography across the application.
 * Use these instead of applying inline text classes.
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TypographyProps {
  children: ReactNode;
  className?: string;
}

/**
 * Page Title - Main heading for pages
 * text-xl sm:text-2xl font-bold
 */
export function PageTitle({ children, className }: TypographyProps) {
  return (
    <h1 className={cn('text-xl sm:text-2xl font-bold text-foreground', className)}>
      {children}
    </h1>
  );
}

/**
 * Page Subtitle - Descriptive text under page title
 */
export function PageSubtitle({ children, className }: TypographyProps) {
  return (
    <p className={cn('text-muted-foreground text-sm sm:text-base mt-0.5', className)}>
      {children}
    </p>
  );
}

/**
 * Section Title - For major sections within a page
 */
export function SectionTitle({ children, className }: TypographyProps) {
  return (
    <h2 className={cn('text-lg font-semibold text-foreground', className)}>
      {children}
    </h2>
  );
}

/**
 * Card Title - For card headers
 */
export function CardTitleText({ children, className }: TypographyProps) {
  return (
    <h3 className={cn('text-base font-medium text-foreground', className)}>
      {children}
    </h3>
  );
}

/**
 * Label - For form labels and small headings
 */
export function Label({ children, className }: TypographyProps) {
  return (
    <span className={cn('text-sm font-medium text-foreground', className)}>
      {children}
    </span>
  );
}

/**
 * Caption - For helper text, timestamps, etc.
 */
export function Caption({ children, className }: TypographyProps) {
  return (
    <span className={cn('text-xs text-muted-foreground', className)}>
      {children}
    </span>
  );
}

/**
 * Metric Value - For financial numbers with monospace font
 */
export function MetricValue({ children, className }: TypographyProps) {
  return (
    <span className={cn('font-mono tabular-nums text-foreground', className)}>
      {children}
    </span>
  );
}

/**
 * Metric with color based on value
 */
interface ColoredMetricProps extends TypographyProps {
  value: number;
  format?: (val: number) => string;
}

export function ColoredMetric({ value, format, className }: ColoredMetricProps) {
  const colorClass = value > 0 
    ? 'text-success' 
    : value < 0 
      ? 'text-destructive' 
      : 'text-muted-foreground';
  
  const displayValue = format ? format(value) : value.toString();
  
  return (
    <span className={cn('font-mono tabular-nums', colorClass, className)}>
      {displayValue}
    </span>
  );
}

/**
 * Muted Text - For secondary information
 */
export function MutedText({ children, className }: TypographyProps) {
  return (
    <span className={cn('text-muted-foreground', className)}>
      {children}
    </span>
  );
}

/**
 * Lead Text - For important introductory text
 */
export function LeadText({ children, className }: TypographyProps) {
  return (
    <p className={cn('text-lg text-muted-foreground leading-relaxed', className)}>
      {children}
    </p>
  );
}

/**
 * Inline Code - For code snippets in text
 */
export function InlineCode({ children, className }: TypographyProps) {
  return (
    <code className={cn(
      'px-1.5 py-0.5 rounded bg-muted font-mono text-sm',
      className
    )}>
      {children}
    </code>
  );
}
