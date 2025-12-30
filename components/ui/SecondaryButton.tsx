import Link from 'next/link';

interface SecondaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function SecondaryButton({
  children,
  onClick,
  href,
  disabled = false,
  className = '',
  type = 'button',
}: SecondaryButtonProps) {
  const baseStyles = 
    'inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border-2 border-[#1B4A41] bg-white text-[#1B4A41] font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const combinedStyles = `${baseStyles} ${className}`;

  // If href is provided, render as Link
  if (href && !disabled) {
    return (
      <Link href={href} className={combinedStyles}>
        {children}
      </Link>
    );
  }

  // Otherwise render as button
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={combinedStyles}
    >
      {children}
    </button>
  );
}