'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

type Props = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function AdminDrawer({ isOpen, title, onClose, children }: Props) {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      return;
    }

    const timer = window.setTimeout(() => setIsVisible(false), 300);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen && !isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close drawer"
        className={`absolute inset-0 bg-black transition-opacity duration-300 ease-out ${
          isOpen ? 'opacity-40' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`relative flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold leading-[1.2] text-gray-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </aside>
    </div>
  );
}
