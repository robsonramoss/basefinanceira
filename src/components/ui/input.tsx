import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startIcon, endIcon, ...props }, ref) => {
    return (
      <div className={cn(
        "relative flex w-full items-center rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus-within:border-[#22C55E] focus-within:ring-2 focus-within:ring-[#22C55E]/20 transition-all min-h-[48px]",
        className
      )}>
        {startIcon && (
          <div className="pl-3 md:pl-4 flex items-center justify-center text-[var(--text-tertiary)]">
            {startIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex w-full flex-1 bg-transparent py-3 md:py-3 pl-3 pr-3 md:pr-4 text-base md:text-sm text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] focus:outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50",
            !startIcon && "pl-3 md:pl-4"
          )}
          ref={ref}
          {...props}
        />
        {endIcon && (
          <div className="pr-3 md:pr-4 flex items-center justify-center text-[var(--text-tertiary)]">
            {endIcon}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
