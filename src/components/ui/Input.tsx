import React, { forwardRef, InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, leftIcon, rightIcon, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-ink-3">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            disabled={disabled}
            className={`h-10 w-full rounded-xl bg-surface px-3 text-sm text-ink placeholder:text-ink-3 shadow-card border border-line/50 focus:outline-none focus:ring-2 focus:ring-ink/15 transition-all disabled:opacity-50 disabled:bg-surface-2 ${
              leftIcon ? 'pl-9' : ''
            } ${rightIcon ? 'pr-9' : ''} ${
              error ? 'border-danger focus:ring-danger/20' : ''
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center text-ink-3">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-danger font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
