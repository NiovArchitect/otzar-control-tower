import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Behance brand buttons — floating 3D light shadows, soft curves, enterprise sizing.
 * Default = solid brand purple CTA that lifts off the semi-gradient field.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-[transform,box-shadow,background-color,filter,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "otzar-cta-fill border-0 text-primary-foreground",
        destructive:
          "rounded-full bg-destructive text-destructive-foreground shadow-[0_8px_20px_-6px_rgba(220,38,38,0.4)] hover:bg-destructive/90",
        outline:
          "otzar-cta-ghost rounded-full border border-[#1e1b4b]/12 bg-white/95 text-[#1e1b4b] hover:border-[#B124E8]/35 hover:text-[#B124E8]",
        secondary:
          "rounded-full bg-[#E5E7EC] text-[#1e1b4b] shadow-[0_4px_14px_-6px_rgba(30,27,75,0.12)] hover:bg-[#dcdfe8]",
        ghost:
          "rounded-full text-[#1e1b4b] hover:bg-[#B124E8]/10 hover:text-[#B124E8]",
        link: "text-[#B124E8] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 rounded-full px-6 py-2.5",
        sm: "h-9 rounded-full px-4 text-xs",
        lg: "h-12 rounded-full px-8 text-base",
        icon: "h-11 w-11 rounded-full",
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
