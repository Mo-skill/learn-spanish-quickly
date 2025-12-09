import * as React from "react";
import { cn } from "../../lib/utils";

interface StatBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    icon?: React.ReactNode;
    label: string;
    value: string | number;
    variant?: "default" | "outline" | "ghost";
}

const StatBadge = React.forwardRef<HTMLDivElement, StatBadgeProps>(
    ({ className, icon, label, value, variant = "default", ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "flex flex-col items-center justify-center rounded-xl p-3 text-center transition-colors",
                    {
                        "bg-card border shadow-sm": variant === "default",
                        "border border-input bg-transparent": variant === "outline",
                        "bg-secondary/50": variant === "ghost",
                    },
                    className
                )}
                {...props}
            >
                <div className="mb-1 text-muted-foreground">{icon}</div>
                <div className="text-xl font-bold tracking-tight">{value}</div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {label}
                </div>
            </div>
        );
    }
);
StatBadge.displayName = "StatBadge";

export { StatBadge };
