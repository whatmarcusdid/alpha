'use client';

import { Check } from 'lucide-react';

import { formatSiteFixPrice } from '@/lib/book-service/format-price';
import { SiteFixSkuIcon } from '@/lib/book-service/site-fix-icons';
import { SITE_FIX_FEATURES } from '@/lib/book-service/site-fix-features';
import { SITE_FIX_SKUS, type SiteFixSKU } from '@/lib/book-service/skus';
import { ratch } from '@/lib/fonts/ratch';

export type SiteFixPricingCardProps = {
  sku: SiteFixSKU;
  onSelect: (sku: SiteFixSKU) => void;
};

export function SiteFixPricingCard({ sku, onSelect }: SiteFixPricingCardProps) {
  const meta = SITE_FIX_SKUS[sku];
  const priceAmount = formatSiteFixPrice(sku);
  const features = SITE_FIX_FEATURES[sku];

  return (
    <article className="flex min-h-[520px] w-[284px] shrink-0 flex-col gap-6 rounded-lg border-[3px] border-[#e5e7eb] bg-white p-6">
      <div className="flex flex-1 flex-col items-center gap-8">
        <div className="flex w-full flex-col items-center gap-3">
          <SiteFixSkuIcon sku={sku} />
          <h3
            className={`${ratch.className} w-full text-center text-xl font-bold leading-[1.2] tracking-[-0.2px] text-[#2920a5]`}
          >
            {meta.displayName}
          </h3>
          {priceAmount ? (
            <div className="flex items-end justify-center gap-1">
              <span
                className={`${ratch.className} text-[44px] font-bold leading-[1.2] tracking-[-0.44px] text-[#030712]`}
              >
                {priceAmount}
              </span>
              <span
                className={`${ratch.className} pb-1.5 text-xl font-bold leading-[1.2] tracking-[-0.2px] text-[#030712]`}
              >
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
                className="mt-0.5 size-6 shrink-0 text-[#2920a5]"
                strokeWidth={2.5}
                aria-hidden
              />
              <span className="text-lg leading-[1.5] text-[#030712]">
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => onSelect(sku)}
        className="min-h-[40px] w-full rounded-lg border-[3px] border-[#2920a5] px-6 py-[10px] text-base font-semibold uppercase leading-[1.5] text-[#2920a5] transition-colors hover:bg-[#f4f3ff]"
      >
        Select
      </button>
    </article>
  );
}
