'use client';

import React, { forwardRef } from 'react';

export interface UiverseSearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  onSubmit?: (e?: React.FormEvent) => void;
  containerClassName?: string;
  compact?: boolean;
}

export const UiverseSearchBar = forwardRef<HTMLInputElement, UiverseSearchBarProps>(
  (
    {
      value = '',
      onChange,
      onClear,
      onSubmit,
      placeholder = 'Search...',
      className = '',
      containerClassName = '',
      compact = false,
      onKeyDown,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSubmit) {
        e.preventDefault();
        onSubmit(e);
      }
      if (onKeyDown) {
        onKeyDown(e);
      }
    };

    const hasValue = Boolean(value && String(value).length > 0);

    return (
      <div className={`uiverse-search-group ${containerClassName}`}>
        {/* Alexruix Uiverse.io Search Icon */}
        <svg className="uiverse-search-icon" aria-hidden="true" viewBox="0 0 24 24">
          <g>
            <path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z" />
          </g>
        </svg>

        <input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`uiverse-search-input ${compact ? 'compact' : ''} ${className}`}
          {...props}
        />

        {hasValue && onClear && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="uiverse-search-clear"
            title="Clear search"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

UiverseSearchBar.displayName = 'UiverseSearchBar';

export default UiverseSearchBar;
