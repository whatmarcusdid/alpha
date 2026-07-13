import Link from 'next/link';

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  target?: string;
  rel?: string;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function PrimaryButton({
  children,
  onClick,
  href,
  target,
  rel,
  disabled = false,
  className = '',
  type = 'button',
}: PrimaryButtonProps) {
  const baseStyles =
    'inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[#2920a5] px-6 py-2 text-base font-bold leading-[1.5] text-white shadow-[4px_8px_12px_rgba(0,0,0,0.08)] transition-colors hover:bg-[#211880] disabled:cursor-not-allowed disabled:opacity-50';

  const combinedStyles = `${baseStyles} ${className}`;

  // If href is provided, render as Link
  if (href && !disabled) {
    return (
      <Link href={href} className={combinedStyles} target={target} rel={rel}>
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