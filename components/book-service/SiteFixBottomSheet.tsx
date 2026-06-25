'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Check, X } from 'lucide-react';

import {
  ALL_SITE_FIX_SKUS,
  SITE_FIX_SKUS,
  type SiteFixSKU,
} from '@/lib/book-service/skus';
import { SITE_FIX_FEATURES } from '@/lib/book-service/site-fix-features';

const SKU_DESCRIPTIONS: Record<SiteFixSKU, string> = {
  speed_fix:
    'We resolve every speed issue found in your audit — slow load times, render-blocking resources, and Core Web Vitals failures. Done within 48 hours.',
  security_fix:
    'We harden your site against the security issues flagged in your audit — SSL, plugin vulnerabilities, and exposure risks. Done within 48 hours.',
  seo_ai_visibility_fix:
    'We fix the SEO and AI visibility gaps from your audit — structured data, meta signals, and crawlability. Done within 48 hours.',
  full_bundle:
    'We tackle every issue across speed, security, and SEO & AI visibility found in your audit. All three fixes delivered within 48 hours.',
};

const SKU_FEATURES = SITE_FIX_FEATURES;

const ANIMATION_MS = 300;
const DRAG_DISMISS_THRESHOLD = 80;

interface BottomSheetShellProps {
  isActive: boolean;
  onClose: () => void;
  canClose?: boolean;
  ariaLabelledBy?: string;
  children: (requestClose: () => void) => ReactNode;
}

function BottomSheetShell({
  isActive,
  onClose,
  canClose = true,
  ariaLabelledBy,
  children,
}: BottomSheetShellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);
  const dragStartY = useRef<number | null>(null);

  const beginClose = useCallback(() => {
    if (!canClose) return;

    setIsOpen(false);
    setDragDelta(0);
    dragStartY.current = null;
    window.setTimeout(() => {
      onClose();
    }, ANIMATION_MS);
  }, [canClose, onClose]);

  useEffect(() => {
    if (!isActive) return;

    setIsOpen(false);
    setDragDelta(0);
    const frame = requestAnimationFrame(() => {
      setIsOpen(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    document.body.classList.add('overflow-hidden');

    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && canClose) {
        beginClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, canClose, beginClose]);

  const handleTouchStart = (event: React.TouchEvent) => {
    dragStartY.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (dragStartY.current === null) return;

    const currentY = event.touches[0]?.clientY ?? dragStartY.current;
    const delta = Math.max(0, currentY - dragStartY.current);
    setDragDelta(delta);
  };

  const handleTouchEnd = () => {
    if (dragDelta > DRAG_DISMISS_THRESHOLD) {
      beginClose();
      return;
    }

    setDragDelta(0);
    dragStartY.current = null;
  };

  if (!isActive) return null;

  const sheetTransform = isOpen
    ? `translateY(${dragDelta}px)`
    : 'translateY(100%)';

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/25"
        onClick={canClose ? beginClose : undefined}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        className="fixed bottom-0 left-0 right-0 z-50 flex h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-4px_32px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-out"
        style={{ transform: sheetTransform }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex shrink-0 justify-center pb-1 pt-0">
          <div className="h-1 w-10 rounded-full bg-gray-300" aria-hidden />
        </div>

        {children(beginClose)}
      </div>
    </>
  );
}

function formatPriceAmount(sku: SiteFixSKU): string | null {
  const price = SITE_FIX_SKUS[sku].price;
  if (price === null) return null;
  return `$${price.toLocaleString('en-US')}`;
}

function PricingCard({
  sku,
  onSelect,
}: {
  sku: SiteFixSKU;
  onSelect: (sku: SiteFixSKU) => void;
}) {
  const meta = SITE_FIX_SKUS[sku];
  const priceAmount = formatPriceAmount(sku);
  const features = SKU_FEATURES[sku];

  return (
    <article className="flex min-h-[520px] w-full max-w-[284px] flex-col gap-6 rounded-lg border-[3px] border-[#e5e7eb] bg-white p-6">
      <div className="flex flex-1 flex-col items-center gap-8">
        <div className="flex w-full flex-col items-center gap-3">
          <h3 className="w-full text-center text-xl leading-[1.2] tracking-[-0.2px] text-[#172554]">
            {meta.displayName}
          </h3>
          {priceAmount ? (
            <div className="flex items-end justify-center gap-1">
              <span className="text-[44px] leading-[1.2] tracking-[-0.44px] text-[#232521]">
                {priceAmount}
              </span>
              <span className="pb-1.5 text-xl leading-[1.2] tracking-[-0.2px] text-[#030712]">
                total
              </span>
            </div>
          ) : (
            <p className="text-sm leading-[1.5] tracking-[-0.14px] text-[#52525b]">
              Bundle pricing
            </p>
          )}
        </div>

        <ul className="flex w-full flex-1 flex-col gap-4">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-4">
              <Check
                className="mt-0.5 size-6 shrink-0 text-[#1d4ed8]"
                strokeWidth={2.5}
                aria-hidden
              />
              <span className="text-lg leading-[1.5] text-[#232521]">
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => onSelect(sku)}
        className="min-h-[40px] w-full rounded-lg border-[3px] border-[#1d4ed8] px-6 py-[10px] text-base font-semibold uppercase leading-[1.5] text-[#1d4ed8] transition-colors hover:bg-[#eff6ff]"
      >
        Select
      </button>
    </article>
  );
}

export interface SiteFixPackagesSheetProps {
  skus: SiteFixSKU[];
  isActive: boolean;
  onClose: () => void;
  onSelectSku: (sku: SiteFixSKU) => void;
}

export function SiteFixPackagesSheet({
  skus,
  isActive,
  onClose,
  onSelectSku,
}: SiteFixPackagesSheetProps) {
  return (
    <BottomSheetShell
      isActive={isActive}
      onClose={onClose}
      ariaLabelledBy="site-fix-packages-title"
    >
      {(requestClose) => (
        <>
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2
              id="site-fix-packages-title"
              className="text-2xl leading-[1.2] tracking-[-0.24px] text-[#030712]"
            >
              Site Fix packages
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={requestClose}
              className="flex size-11 min-h-[44px] min-w-[44px] items-center justify-center text-[#030712] transition-colors hover:bg-[#f3f4f6]"
            >
              <X className="size-6" strokeWidth={1.5} aria-hidden />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col items-center justify-start gap-6 overflow-y-auto px-6 py-6">
            <div className="flex w-full flex-col gap-1">
              <h3 className="text-2xl leading-[1.2] tracking-[-0.24px] text-[#030712]">
                Choose your fixes
              </h3>
              <p className="text-sm leading-[1.5] tracking-[-0.14px] text-[#52525b]">
                Based on your audit results — pick the fix that applies to your
                site.
              </p>
            </div>

            <div className="flex w-full max-w-[900px] flex-row flex-wrap items-start justify-start gap-6 text-left">
              {skus.map((sku) => (
                <PricingCard key={sku} sku={sku} onSelect={onSelectSku} />
              ))}
            </div>
          </div>
        </>
      )}
    </BottomSheetShell>
  );
}

export interface SiteFixBottomSheetProps {
  sku: SiteFixSKU | null;
  skus?: SiteFixSKU[];
  open?: boolean;
  onClose: () => void;
  onConfirm: (sku: SiteFixSKU) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function SiteFixBottomSheet({
  sku,
  skus,
  open,
  onClose,
  onConfirm,
  isLoading,
  error,
}: SiteFixBottomSheetProps) {
  const [internalSku, setInternalSku] = useState<SiteFixSKU | null>(null);

  const isSheetOpen = open !== undefined ? open : sku !== null;
  const displaySku = sku ?? internalSku;
  const showCardList =
    isSheetOpen && displaySku === null && skus !== undefined;
  const cardSkus =
    skus !== undefined
      ? skus.length > 0
        ? skus
        : ALL_SITE_FIX_SKUS
      : [];

  const handleSheetClose = useCallback(() => {
    setInternalSku(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isSheetOpen) {
      setInternalSku(null);
    }
  }, [isSheetOpen]);

  const meta = displaySku ? SITE_FIX_SKUS[displaySku] : null;
  const isBundle = displaySku === 'full_bundle';
  const priceAmount = displaySku ? formatPriceAmount(displaySku) : null;
  const showBackButton = sku === null && internalSku !== null;

  if (showCardList) {
    return (
      <BottomSheetShell
        isActive={isSheetOpen}
        onClose={handleSheetClose}
        ariaLabelledBy="site-fix-packages-title"
      >
        {(requestClose) => (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2
                id="site-fix-packages-title"
                className="text-2xl leading-[1.2] tracking-[-0.24px] text-[#030712]"
              >
                Site Fix packages
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={requestClose}
                className="flex size-11 min-h-[44px] min-w-[44px] items-center justify-center text-[#030712] transition-colors hover:bg-[#f3f4f6]"
              >
                <X className="size-6" strokeWidth={1.5} aria-hidden />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col items-center justify-start gap-6 overflow-y-auto px-6 py-6">
              <div className="flex w-full flex-col gap-1">
                <h3 className="text-2xl leading-[1.2] tracking-[-0.24px] text-[#030712]">
                  Choose your fixes
                </h3>
                <p className="text-sm leading-[1.5] tracking-[-0.14px] text-[#52525b]">
                  Based on your audit results — pick the fix that applies to your
                  site.
                </p>
              </div>

              <div className="flex w-full max-w-[900px] flex-row flex-wrap items-start justify-start gap-6 text-left">
                {cardSkus.map((cardSku) => (
                  <PricingCard
                    key={cardSku}
                    sku={cardSku}
                    onSelect={setInternalSku}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </BottomSheetShell>
    );
  }

  return (
    <BottomSheetShell
      isActive={isSheetOpen && displaySku !== null}
      onClose={handleSheetClose}
      canClose={!isLoading}
      ariaLabelledBy="site-fix-sheet-title"
    >
      {(requestClose) => (
        <>
          {meta && displaySku && (
            <>
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {showBackButton && (
                    <button
                      type="button"
                      aria-label="Back to packages"
                      disabled={isLoading}
                      onClick={() => setInternalSku(null)}
                      className="flex min-h-[44px] w-fit items-center text-sm font-semibold text-[#1d4ed8] transition-colors hover:text-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Back
                    </button>
                  )}
                  <div className="flex flex-col gap-1">
                    <h2
                      id="site-fix-sheet-title"
                      className="text-2xl leading-[1.2] tracking-[-0.24px] text-[#030712]"
                    >
                      {meta.displayName}
                    </h2>
                    {isBundle || !priceAmount ? (
                      <p className="text-sm leading-[1.5] tracking-[-0.14px] text-[#52525b]">
                        Bundle pricing
                      </p>
                    ) : (
                      <div className="flex items-end gap-1">
                        <span className="text-[44px] leading-[1.2] tracking-[-0.44px] text-[#232521]">
                          {priceAmount}
                        </span>
                        <span className="pb-1.5 text-xl leading-[1.2] tracking-[-0.2px] text-[#030712]">
                          total
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Close"
                  disabled={isLoading}
                  onClick={requestClose}
                  className="flex size-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-[#030712] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="size-6" strokeWidth={1.5} aria-hidden />
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
                <p className="text-lg leading-[1.5] text-[#52525b]">
                  {SKU_DESCRIPTIONS[displaySku]}
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => onConfirm(displaySku)}
                    className="flex min-h-[48px] w-full items-center justify-center rounded-lg bg-[#1d4ed8] px-6 py-[10px] text-base font-semibold uppercase leading-[1.5] text-white transition-colors hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? 'Processing…' : 'Proceed to Payment'}
                  </button>

                  {error !== null && (
                    <div className="flex flex-col gap-2" role="alert">
                      <p className="text-sm font-semibold leading-[1.5] text-[#e7000b]">
                        {error}
                      </p>
                      <p className="text-sm leading-[1.5] tracking-[-0.14px] text-[#52525b]">
                        Need help? Email{' '}
                        <a
                          href="mailto:support@tradesitegenie.com"
                          className="underline"
                        >
                          support@tradesitegenie.com
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </BottomSheetShell>
  );
}
