import React, { forwardRef, InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { Kbd } from './Kbd';

export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  shortcutHint?: string;
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className = '', shortcutHint = '/', value, onClear, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        <Search className="absolute left-3.5 w-4 h-4 text-ink-3 pointer-events-none" />
        <input
          ref={ref}
          value={value}
          type="text"
          className={`h-11 w-full rounded-xl bg-surface pl-10 pr-12 text-sm text-ink placeholder:text-ink-3 shadow-card border border-line/50 focus:outline-none focus:ring-2 focus:ring-ink/15 transition-all ${className}`}
          {...props}
        />
        <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
          {shortcutHint && <Kbd>{shortcutHint}</Kbd>}
        </div>
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
export default SearchInput;
