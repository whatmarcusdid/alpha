import React from 'react';
import Link from 'next/link';

interface TertiaryButtonProps {
  children: React.ReactNode;
  className?: string;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function TertiaryButton({ 
  children, 
  className = '', 
  href,
  target,
  rel,
  onClick,
  disabled = false,
  type = 'button',
}: TertiaryButtonProps) {
  
  const baseStyles = "text-[#1B4A41] hover:text-[#0f3830] font-semibold transition-colors block text-left";
  const allClassNames = `${baseStyles} ${className}`.trim();

  // External link (has target="_blank" or starts with http)
  if (href && (target === '_blank' || href.startsWith('http'))) {
    return (
      <a 
        href={href}
        target={target}
        rel={rel}
        className={allClassNames}
      >
        {children}
      </a>
    );
  }

  // Internal Next.js link
  if (href) {
    return (
      <Link href={href} className={allClassNames}>
        {children}
      </Link>
    );
  }

  // Button
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={allClassNames}
    >
      {children}
    </button>
  );
}
