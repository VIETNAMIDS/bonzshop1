import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-bold uppercase tracking-wide ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-primary hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_hsl(0_0%_100%/0.2)]",
        destructive: "bg-destructive text-destructive-foreground border-destructive hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_hsl(0_72%_50%/0.4)]",
        outline: "border-foreground/30 bg-transparent hover:bg-foreground/5 hover:border-primary",
        secondary: "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80 hover:border-primary/50",
        ghost: "border-transparent hover:bg-secondary hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline border-transparent",
        gradient: "bg-primary text-primary-foreground border-primary hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_hsl(0_0%_0%)]",
        glow: "bg-primary text-primary-foreground border-primary hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_hsl(14_90%_55%/0.5)]",
        premium: "bg-warning text-warning-foreground border-warning hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_hsl(45_100%_55%/0.4)]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
