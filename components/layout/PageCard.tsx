interface PageCardProps {
  children: React.ReactNode;
  className?: string;
}

export function PageCard({ children, className = '' }: PageCardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-8 min-h-[calc(100vh-theme(spacing.32))] mx-auto max-w-[1440px] ${className}`}>
      {children}
    </div>
  );
}
