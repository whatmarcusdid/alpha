'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { FixSession, PillarStatus } from '@/components/dashboard/ActiveSiteFixesCard';
import type { SiteFixEntitlement } from '@/lib/types/client-context';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  session: FixSession;
  businessName: string;
  packageLabel: string | null;
  entitlements: SiteFixEntitlement[];
};

const PILLAR_ORDER = [
  { key: 'speed' as const, label: 'Speed', entitlement: 'speed' as const },
  { key: 'security' as const, label: 'Security', entitlement: 'security' as const },
  { key: 'seo' as const, label: 'SEO & AI Visibility', entitlement: 'seo_ai_visibility' as const },
];

const BADGE_STYLES: Record<PillarStatus, { className: string; label: string }> = {
  done: { className: 'bg-green-100 text-green-700', label: 'Done' },
  in_progress: { className: 'bg-amber-100 text-amber-700', label: 'In Progress' },
  queued: { className: 'bg-gray-100 text-gray-600', label: 'Queued' },
  awaiting_access: { className: 'bg-gray-100 text-gray-600', label: 'Awaiting Access' },
};

function getMostRecentUpdatedAt(session: FixSession): Date | null {
  const dates = PILLAR_ORDER.map(({ key }) => session.fixProgress[key].updatedAt).filter(
    (date): date is Date => date != null
  );

  if (dates.length === 0) return null;

  return dates.reduce((latest, current) => (current > latest ? current : latest));
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

function PillarIcon({ status }: { status: PillarStatus }) {
  if (status === 'done') {
    return <CheckCircleIcon className="h-6 w-6 text-green-600 shrink-0" aria-hidden="true" />;
  }

  if (status === 'in_progress') {
    return (
      <ClockIcon
        className="h-6 w-6 text-amber-500 shrink-0 animate-spin"
        aria-hidden="true"
      />
    );
  }

  return <ClockIcon className="h-6 w-6 text-gray-400 shrink-0" aria-hidden="true" />;
}

function getVisiblePillars(entitlements: SiteFixEntitlement[]) {
  if (entitlements.length === 0) {
    return PILLAR_ORDER;
  }

  return PILLAR_ORDER.filter(({ entitlement }) => entitlements.includes(entitlement));
}

export function SiteFixDetailModal({
  isOpen,
  onClose,
  session,
  businessName,
  packageLabel,
  entitlements,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateReduceMotion = () => setReduceMotion(mediaQuery.matches);

    updateReduceMotion();
    mediaQuery.addEventListener('change', updateReduceMotion);

    return () => mediaQuery.removeEventListener('change', updateReduceMotion);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false);
      return;
    }

    if (reduceMotion) {
      setIsVisible(true);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, reduceMotion]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleFocusTrap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusableElements = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement | undefined;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement | undefined;

      if (!firstElement || !lastElement) return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        }
      } else if (document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleFocusTrap);
      panelRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleFocusTrap);
    };
  }, [isOpen, onClose]);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startY = touchStartYRef.current;
    const endY = event.changedTouches[0]?.clientY;

    touchStartYRef.current = null;

    if (startY == null || endY == null) return;

    if (endY - startY > 80) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const lastUpdated = getMostRecentUpdatedAt(session);
  const visiblePillars = getVisiblePillars(entitlements);

  const backdropClassName = reduceMotion
    ? 'opacity-100'
    : `transition-opacity duration-300 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`;

  const sheetMotionClassName = reduceMotion
    ? 'translate-y-0'
    : `transition-transform duration-300 ease-out ${isVisible ? 'translate-y-0' : 'translate-y-full'}`;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`fixed inset-0 bg-black/50 lg:bg-black/25 ${backdropClassName}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-fix-detail-title"
        tabIndex={-1}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`fixed bottom-0 left-0 right-0 z-10 flex max-h-[90vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-8px_20px_rgba(85,85,85,0.05)] ${sheetMotionClassName}`}
      >
        <div className="flex shrink-0 justify-center pt-3 md:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b-2 border-gray-200 px-6 py-4">
          <h2
            id="site-fix-detail-title"
            className="text-xl font-semibold leading-[1.2] tracking-[-0.2px] text-gray-950 md:text-[22px] md:tracking-[-0.22px] lg:text-2xl lg:tracking-[-0.24px]"
          >
            Site Fix details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-gray-950 transition-colors hover:bg-gray-100"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-6 lg:flex lg:justify-center lg:pt-6">
            <div className="w-full lg:max-w-[900px]">
              <div className="space-y-1 text-sm text-gray-600">
                <p className="font-medium text-[#232521]">
                  {businessName.trim() || 'Your business'}
                </p>
                {packageLabel != null && <p>{packageLabel}</p>}
                {session.orderId != null && <p>Order #{session.orderId}</p>}
                {lastUpdated != null && (
                  <p>Last updated {formatTimestamp(lastUpdated)}</p>
                )}
              </div>

              <div className="mt-6">
                {visiblePillars.map(({ key, label }) => {
                  const pillar = session.fixProgress[key];
                  const badge = BADGE_STYLES[pillar.status];

                  return (
                    <div key={key} className="mb-3 rounded-lg border border-gray-200 p-4">
                      <h3 className="font-medium text-gray-900">{label}</h3>

                      <div className="mt-2 flex items-center gap-2">
                        <PillarIcon status={pillar.status} />
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-gray-700">
                        {pillar.description ?? (
                          <span className="italic text-gray-500">
                            Work on this fix is underway. We&apos;ll update this section as progress is made.
                          </span>
                        )}
                      </p>

                      {pillar.updatedAt != null && (
                        <p className="mt-2 text-xs text-gray-500">
                          Updated {formatRelativeTime(pillar.updatedAt)}
                        </p>
                      )}

                      {pillar.status === 'done' && pillar.completedAt != null && (
                        <p className="mt-1 text-xs text-gray-500">
                          Completed {formatRelativeTime(pillar.completedAt)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[40px] rounded-full border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
