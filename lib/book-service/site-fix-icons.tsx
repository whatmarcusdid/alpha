'use client';

import Image from 'next/image';
import { Package } from 'lucide-react';

import type { SiteFixSKU } from '@/lib/book-service/skus';

const SKU_ICON_SRC: Record<
  Exclude<SiteFixSKU, 'full_bundle'>,
  string
> = {
  seo_ai_visibility_fix: '/brand/site-fix/seo-ai-visibility-fix.png',
  speed_fix: '/brand/site-fix/speed-fix.png',
  security_fix: '/brand/site-fix/security-fix.png',
};

const SKU_ICON_ALT: Record<SiteFixSKU, string> = {
  seo_ai_visibility_fix: 'SEO and AI Visibility Fix',
  speed_fix: 'Speed Fix',
  security_fix: 'Security Fix',
  full_bundle: 'Full Bundle',
};

export function SiteFixSkuIcon({ sku }: { sku: SiteFixSKU }) {
  // TODO: replace with real Full Bundle icon asset before this SKU is
  // ever shown in the UI (currently filtered out via getDisplaySkus())
  if (sku === 'full_bundle') {
    return (
      <div
        className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#a1a1aa] bg-[#f4f4f5]"
        aria-hidden
      >
        <Package className="size-6 text-[#71717a]" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div
      className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg"
      aria-hidden
    >
      <Image
        src={SKU_ICON_SRC[sku]}
        alt={SKU_ICON_ALT[sku]}
        width={48}
        height={48}
        className="size-12 shrink-0 object-contain"
      />
    </div>
  );
}
