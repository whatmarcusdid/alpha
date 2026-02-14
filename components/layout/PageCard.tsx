interface PageCardProps {
  children: React.ReactNode;
  className?: string;
}

export function PageCard({ children, className = '' }: PageCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-[inset_0_0_0_1px_rgb(229,231,235)] p-8 min-h-[calc(100vh-theme(spacing.32))] h-fit mx-auto max-w-[1440px] ${className}`}>
      {children}
    </div>
  );
}
