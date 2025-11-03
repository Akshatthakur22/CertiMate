import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const brandButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-brand focus-visible:ring-[#4F46E5]",
        secondary: "bg-[#22C55E] text-white hover:bg-[#16A34A] shadow-brand focus-visible:ring-[#22C55E]",
        accent: "bg-[#FACC15] text-[#111827] hover:bg-[#EAB308] shadow-brand focus-visible:ring-[#FACC15]",
        gradient: "gradient-primary text-white hover:opacity-90 shadow-brand-lg focus-visible:ring-[#4F46E5]",
        outline: "border-2 border-[#4F46E5] text-[#4F46E5] hover:bg-[#4F46E5] hover:text-white",
        ghost: "text-[#111827] hover:bg-gray-100",
      },
      size: {
        sm: "h-9 px-4 py-2 text-sm",
        default: "h-11 px-6 py-2.5 text-base",
        lg: "h-13 px-8 py-3 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface BrandButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof brandButtonVariants> {
  asChild?: boolean;
}

const BrandButton = React.forwardRef<HTMLButtonElement, BrandButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(brandButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

BrandButton.displayName = "BrandButton";

export { BrandButton, brandButtonVariants };

