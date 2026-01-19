import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-xl border text-card-foreground transition-all duration-300 ease-out",
  {
    variants: {
      variant: {
        default:
          "bg-card border-border shadow-md hover:shadow-lg hover:border-border/80",
        solid:
          "bg-card border-border shadow-md",
        glass:
          "bg-card/80 backdrop-blur-xl border-border/50 shadow-lg",
        gradient:
          "bg-gradient-to-br from-card via-card to-background border-border/30 shadow-md",
        success:
          "border-2 border-success/20 bg-success/5",
        warning:
          "border-2 border-warning/20 bg-warning/5",
        destructive:
          "border-2 border-destructive/20 bg-destructive/5",
        interactive:
          "bg-card border-border shadow-md hover:shadow-lg hover:scale-[1.02] hover:border-primary/30 cursor-pointer active:scale-[0.99]",
        // Surface hierarchy variants
        surface:
          "bg-surface-2 border-border/50 shadow-md",
        "accent-positive":
          "bg-card border-border/40 shadow-md accent-bar-positive",
        "accent-negative":
          "bg-card border-border/40 shadow-md accent-bar-negative",
        "accent-warning":
          "bg-card border-border/40 shadow-md accent-bar-warning",
        "accent-primary":
          "bg-card border-border/40 shadow-md accent-bar-primary",
        glow:
          "bg-card border-primary/20 shadow-lg ring-1 ring-primary/10 hover:shadow-[0_0_40px_hsl(220_90%_56%_/_0.1)]",
        // Additional variants
        elevated:
          "bg-card border-border/30 shadow-xl",
        subtle:
          "bg-muted/30 border-border/20 shadow-sm hover:bg-muted/50",
        outline:
          "bg-transparent border-2 border-border hover:border-primary/50 hover:bg-primary/5",
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