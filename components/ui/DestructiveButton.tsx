import React from 'react';

interface DestructiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export function DestructiveButton({ 
  children, 
  className = '', 
  ...props 
}: DestructiveButtonProps) {
  return (
    <button
      className={`
        flex
        px-4
        py-1.5
        justify-center
        items-center
        gap-2
        rounded-full
        border-2
        border-[#E7000B]
        text-[#E7000B]
        font-semibold
        hover:bg-red-50
        transition-colors
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
