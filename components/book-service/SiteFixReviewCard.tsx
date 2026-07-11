'use client';

import { SiteFixSkuIcon } from '@/lib/book-service/site-fix-icons';
import { formatSiteFixPrice } from '@/lib/book-service/format-price';
import { SITE_FIX_FEATURES } from '@/lib/book-service/site-fix-features';
import { SITE_FIX_SKUS, type SiteFixSKU } from '@/lib/book-service/skus';
import { ratch } from '@/lib/fonts/ratch';

export type SiteFixReviewCardProps = {
  sku: SiteFixSKU;
};

export function SiteFixReviewCard({ sku }: SiteFixReviewCardProps) {
  const meta = SITE_FIX_SKUS[sku];
  const priceAmount = formatSiteFixPrice(sku);
  const features = SITE_FIX_FEATURES[sku];

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border-[3px] border-[#e5e7eb] bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SiteFixSkuIcon sku={sku} />
          <p
            className={`${ratch.className} text-xl font-bold leading-[1.2] tracking-[-0.2px] text-[#2920a5]`}
          >
            {meta.displayName}
          </p>
        </div>
        {priceAmount ? (
          <p
            className={`${ratch.className} text-[32px] font-bold leading-[1.2] tracking-[-0.32px] text-[#030712]`}
          >
            {priceAmount}
          </p>
        ) : (
          <p className="text-sm leading-[1.5] text-[#52525b]">Bundle pricing</p>
        )}
      </div>

      <p className="text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-[#030712]">
        What we&apos;ll be fixing
      </p>

      {features.map((feature) => (
        <div
          key={feature}
          className="flex items-start justify-between gap-4 text-sm leading-[1.5] tracking-[-0.14px]"
        >
          <p className="font-normal text-[#52525b]">{feature}</p>
          <p className="shrink-0 font-semibold text-[#030712]">Included</p>
        </div>
      ))}

      <div className="h-px w-full bg-[#e5e7eb]" aria-hidden />

      <p className="text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-[#030712]">
        Price Summary
      </p>

      <div className="flex items-start justify-between gap-4 text-sm leading-[1.5] tracking-[-0.14px]">
        <p className="font-normal text-[#52525b]">Total (one-time)</p>
        <p className="font-semibold text-[#030712]">
          {priceAmount ?? 'Bundle pricing'}
        </p>
      </div>

      <p className="text-xs leading-[1.5] tracking-[-0.12px] text-[#030712]">
        Delivered within 48 hours of checkout — no action needed from you
      </p>
    </div>
  );
}
