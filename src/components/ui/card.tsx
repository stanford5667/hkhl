import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-xl border text-card-foreground transition-all duration-300 ease-out",
  {
    variants: {
      variant: {
        default:
          "bg-card/80 backdrop-blur-xl border-border/40 shadow-lg shadow-black/5 dark:shadow-black/20 hover:shadow-xl hover:border-border/60",
        solid:
          "bg-card border-border shadow-lg shadow-black/5 dark:shadow-black/20",
        glass:
          "bg-card/20 backdrop-blur-2xl border-white/10 dark:border-white/5 shadow-2xl shadow-black/10 dark:shadow-black/30 ring-1 ring-white/10",
        gradient:
          "bg-gradient-to-br from-card via-card/95 to-background border-border/30 shadow-lg shadow-black/5 dark:shadow-black/20",
        success:
          "bg-gradient-to-br from-success/15 via-success/10 to-success/5 border-success/30 shadow-lg shadow-success/10",
        warning:
          "bg-gradient-to-br from-warning/15 via-warning/10 to-warning/5 border-warning/30 shadow-lg shadow-warning/10",
        destructive:
          "bg-gradient-to-br from-destructive/15 via-destructive/10 to-destructive/5 border-destructive/30 shadow-lg shadow-destructive/10",
        interactive:
          "bg-card/60 backdrop-blur-xl border-border/40 shadow-lg shadow-black/5 dark:shadow-black/20 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5 cursor-pointer active:translate-y-0 active:shadow-lg",
        // Market Intel variants
        surface:
          "bg-surface-3 border-border/20 shadow-lg shadow-black/5 dark:shadow-black/20",
        "accent-positive":
          "bg-gradient-to-br from-card to-success/5 border-border/40 shadow-lg accent-bar-positive",
        "accent-negative":
          "bg-gradient-to-br from-card to-destructive/5 border-border/40 shadow-lg accent-bar-negative",
        "accent-warning":
          "bg-gradient-to-br from-card to-warning/5 border-border/40 shadow-lg accent-bar-warning",
        "accent-primary":
          "bg-gradient-to-br from-card to-primary/5 border-border/40 shadow-lg accent-bar-primary",
        glow:
          "bg-card/60 backdrop-blur-xl border-primary/20 shadow-xl shadow-primary/10 ring-1 ring-primary/10 card-glow",
        // New premium variants
        elevated:
          "bg-card border-border/30 shadow-2xl shadow-black/10 dark:shadow-black/40 ring-1 ring-white/5",
        subtle:
          "bg-muted/30 backdrop-blur-sm border-border/20 shadow-sm hover:bg-muted/50 hover:border-border/30",
        outline:
          "bg-transparent border-2 border-border/60 hover:border-primary/50 hover:bg-primary/5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, className }))}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-foreground",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
};