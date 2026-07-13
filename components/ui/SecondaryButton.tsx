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
    'inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border-2 border-[#2920a5] px-[23px] py-1.5 text-base font-bold leading-[1.5] text-[#2920a5] shadow-[4px_8px_24px_0px_rgba(0,0,0,0.08)] transition-colors hover:bg-[#f4f3ff] disabled:cursor-not-allowed disabled:opacity-50';

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