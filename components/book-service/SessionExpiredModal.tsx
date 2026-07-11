'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function SessionExpiredModal() {
  const router = useRouter();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        className="w-full max-w-md rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-lg"
      >
        <h2
          id="session-expired-title"
          className="text-2xl font-bold leading-[1.2] tracking-[-0.24px] text-[#030712]"
        >
          Session expired
        </h2>
        <p className="mt-3 text-base leading-[1.5] text-[#52525b]">
          Your audit session has expired. Return to your audit results to
          continue choosing a Site Fix package.
        </p>
        <button
          type="button"
          onClick={() => router.push('/audit')}
          className="mt-6 min-h-[48px] w-full rounded-lg bg-[#2920a5] px-6 py-3 text-base font-semibold leading-[1.5] text-white transition-colors hover:bg-[#211880]"
        >
          Back to audit results
        </button>
      </div>
    </div>
  );
}
