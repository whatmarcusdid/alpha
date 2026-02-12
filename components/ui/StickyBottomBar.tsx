interface StickyBottomBarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Fixed bottom bar for form edit modes.
 * Use with Cancel and Save buttons. Add pb-24 (or similar) to parent
 * to prevent content from being hidden behind the bar.
 */
export function StickyBottomBar({ children, className = '' }: StickyBottomBarProps) {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-4 ${className}`}
    >
      {children}
    </div>
  );
}
