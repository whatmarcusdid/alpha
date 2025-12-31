import React from 'react';

interface TertiaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export function TertiaryButton({ 
  children, 
  className = '', 
  ...props 
}: TertiaryButtonProps) {
  return (
    <button
      className={`
        flex
        justify-center
        items-center
        gap-2.5
        text-[#1B4A41]
        font-medium
        hover:opacity-70
        transition-opacity
        disabled:opacity-50
        disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
