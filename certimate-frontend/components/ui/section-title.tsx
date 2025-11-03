import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionTitleProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  description?: string;
  align?: "left" | "center" | "right";
  variant?: "default" | "primary" | "accent";
  size?: "sm" | "md" | "lg";
}

const SectionTitle = React.forwardRef<HTMLDivElement, SectionTitleProps>(
  (
    {
      title,
      subtitle,
      description,
      align = "center",
      variant = "default",
      size = "md",
      className,
      ...props
    },
    ref
  ) => {
    const alignClasses = {
      left: "text-left items-start",
      center: "text-center items-center",
      right: "text-right items-end",
    };

    const sizeClasses = {
      sm: {
        title: "text-2xl md:text-3xl font-bold",
        subtitle: "text-sm font-medium",
        description: "text-sm",
      },
      md: {
        title: "text-3xl md:text-4xl font-bold",
        subtitle: "text-base font-medium",
        description: "text-base",
      },
      lg: {
        title: "text-4xl md:text-5xl font-bold",
        subtitle: "text-lg font-medium",
        description: "text-lg",
      },
    };

    const variantClasses = {
      default: "",
      primary: "text-primary",
      accent: "text-accent",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-3 mb-8",
          alignClasses[align],
          className
        )}
        {...props}
      >
        {subtitle && (
          <p
            className={cn(
              "uppercase tracking-wider font-semibold",
              sizeClasses[size].subtitle,
              variant === "primary" && "text-primary",
              variant === "accent" && "text-accent",
              variant === "default" && "text-muted-foreground"
            )}
          >
            {subtitle}
          </p>
        )}
        <h2
          className={cn(
            "tracking-tight",
            sizeClasses[size].title,
            variantClasses[variant]
          )}
        >
          {title}
        </h2>
        {description && (
          <p
            className={cn(
              "text-muted-foreground max-w-2xl",
              sizeClasses[size].description,
              align === "center" && "mx-auto",
              align === "left" && "mr-auto",
              align === "right" && "ml-auto"
            )}
          >
            {description}
          </p>
        )}
      </div>
    );
  }
);

SectionTitle.displayName = "SectionTitle";

export { SectionTitle };

