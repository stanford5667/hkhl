import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const cardVariants = cva("rounded-lg border text-card-foreground transition-all duration-200", {
  variants: {
    variant: {
      default: "bg-card/50 backdrop-blur-xl border-border/50 shadow-card",
      solid: "bg-card border-border shadow-card",
      glass: "bg-card/30 backdrop-blur-xl border-border/30 shadow-card",
      gradient: "bg-gradient-to-br from-card to-background border-border/50 shadow-card",
      success: "bg-gradient-to-br from-success/10 to-success/5 border-success/20 shadow-card",
      warning: "bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20 shadow-card",
      destructive: "bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20 shadow-card",
      interactive: "bg-card/50 backdrop-blur-xl border-border/50 shadow-card hover:border-primary/30 hover:shadow-card-hover cursor-pointer",
      // Market Intel variants
      surface: "bg-surface-3 border-border/30 shadow-card",
      "accent-positive": "bg-card border-border/50 shadow-card accent-bar-positive",
      "accent-negative": "bg-card border-border/50 shadow-card accent-bar-negative",
      "accent-warning": "bg-card border-border/50 shadow-card accent-bar-warning",
      "accent-primary": "bg-card border-border/50 shadow-card accent-bar-primary",
      glow: "bg-card/50 backdrop-blur-xl border-border/50 shadow-card card-glow"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});
export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}
const Card = React.forwardRef<HTMLDivElement, CardProps>(({
  className,
  variant,
  ...props
}, ref) => <div ref={ref} className={cn(cardVariants({
  variant,
  className
}))} {...props} />);
Card.displayName = "Card";
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({
  className,
  ...props
}, ref) => <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />);
CardHeader.displayName = "CardHeader";
const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({
  className,
  ...props
}, ref) => <h3 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight text-foreground", className)} {...props} />);
CardTitle.displayName = "CardTitle";
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({
  className,
  ...props
}, ref) => <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />);
CardDescription.displayName = "CardDescription";
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({
  className,
  ...props
}, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />);
CardContent.displayName = "CardContent";
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({
  className,
  ...props
}, ref) => <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />);
CardFooter.displayName = "CardFooter";
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };