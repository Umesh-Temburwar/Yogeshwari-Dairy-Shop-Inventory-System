import React, { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({ className = '', hoverEffect = false, children, ...props }) => {
  return (
    <div
      className={`rounded-2xl bg-surface shadow-card p-4 sm:p-5 border border-line/40 transition-all duration-150 ${
        hoverEffect ? 'hover:shadow-pop active:scale-[.99]' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => {
  return (
    <div className={`flex items-center justify-between pb-3 border-b border-line/40 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardContent: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => {
  return (
    <div className={`pt-3 ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
