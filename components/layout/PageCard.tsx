interface PageCardProps {
  children: React.ReactNode;
  className?: string;
}

export function PageCard({ children, className = '' }: PageCardProps) {
  return (
    <div className={`bg-white rounded-lg p-6 min-h-[calc(100vh-theme(spacing.32))] h-fit mx-auto w-full ${className}`}>
      {children}
    </div>
  );
}
