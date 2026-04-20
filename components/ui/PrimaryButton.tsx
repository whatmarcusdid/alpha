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
    'inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#9be382] hover:bg-[#8dd370] text-[#232521] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

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