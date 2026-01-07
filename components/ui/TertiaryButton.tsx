'use client';

import Link from 'next/link';
import React from 'react';

interface TertiaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  target?: string;
  rel?: string;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const TertiaryButton = React.forwardRef<HTMLButtonElement, TertiaryButtonProps>(
  ({ 
    children, 
    onClick, 
    href, 
    target,
    rel,
    disabled = false, 
    className = '', 
    type = 'button' 
  }, ref) => {
    const baseStyles = 
      'inline-flex items-center justify-center gap-2 rounded-full text-[#1B4A41] font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

    const combinedStyles = `${baseStyles} ${className}`;

    // If href is provided, render as Link or anchor
    if (href && !disabled) {
      // External link (opens in new tab)
      if (target === '_blank') {
        return (
          <a 
            href={href} 
            target={target}
            rel={rel || 'noopener noreferrer'}
            className={combinedStyles}
          >
            {children}
          </a>
        );
      }
      
      // Internal link (Next.js Link)
      return (
        <Link href={href} className={combinedStyles}>
          {children}
        </Link>
      );
    }

    // Otherwise render as button
    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={combinedStyles}
      >
        {children}
      </button>
    );
  }
);

TertiaryButton.displayName = 'TertiaryButton';
