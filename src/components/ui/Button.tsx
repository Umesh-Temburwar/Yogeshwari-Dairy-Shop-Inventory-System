import React, { forwardRef, ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon' | 'checkout';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 select-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:opacity-50 disabled:pointer-events-none active:scale-[.98] font-sans';

    const variantStyles: Record<ButtonVariant, string> = {
      primary: 'rounded-xl bg-accent text-accent-fg font-semibold hover:opacity-90 shadow-card',
      secondary: 'rounded-xl bg-surface text-ink font-medium shadow-card hover:bg-surface-2 border border-line/40',
      ghost: 'rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink font-medium',
      danger: 'rounded-xl bg-danger/10 text-danger font-semibold hover:bg-danger/15',
      icon: 'grid place-items-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink p-0',
      checkout: 'w-full rounded-2xl bg-accent text-accent-fg font-semibold tracking-tight shadow-card hover:opacity-90 text-[15px]',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: variant === 'icon' ? 'h-8 w-8 text-xs' : 'h-8 px-2.5 text-xs rounded-lg',
      md: variant === 'icon' ? 'h-9 w-9 text-sm' : 'h-10 px-4 text-sm',
      lg: variant === 'icon' ? 'h-11 w-11 text-base' : 'h-12 px-5 text-base',
    };

    const effectiveSize = variant === 'checkout' ? 'h-12' : sizeStyles[size];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${effectiveSize} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
