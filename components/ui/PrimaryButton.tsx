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
    'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

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