import * as React from "react";
import { cn } from "../../lib/utils";

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
    value: number;
    max?: number;
    indicatorClassName?: string;
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
    ({ className, value, max = 100, indicatorClassName, ...props }, ref) => {
        const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

        return (
            <div
                ref={ref}
                className={cn(
                    "h-2 w-full overflow-hidden rounded-full bg-secondary",
                    className
                )}
                {...props}
            >
                <div
                    className={cn("h-full bg-primary transition-all duration-500 ease-out", indicatorClassName)}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        );
    }
);
ProgressBar.displayName = "ProgressBar";

export { ProgressBar };
