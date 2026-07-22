import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Enterprise buttons — ink primary by default (calm).
 * Brand purple only via otzar-cta-fill class, and that purple is muted.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "rounded-full bg-[#1e1b4b] text-white shadow-sm hover:bg-[#2a2758]",
        destructive:
          "rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "rounded-full border border-[#1e1b4b]/12 bg-white text-[#1e1b4b] hover:bg-[#F7F6FC]",
        secondary:
          "rounded-full bg-[#F3F1FA] text-[#1e1b4b] hover:bg-[#EBE8F5]",
        ghost:
          "rounded-full text-[#1e1b4b] hover:bg-[#1e1b4b]/06",
        link: "text-[#1e1b4b] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 rounded-full px-5",
        sm: "h-9 rounded-full px-4 text-xs",
        lg: "h-11 rounded-full px-6 text-sm",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
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
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
