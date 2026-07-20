import { Suspense } from 'react';

import { ReviewPageClient } from './ReviewPageClient';

type PageProps = {
  params: Promise<{ sku: string }>;
};

function ReviewPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-[#52525b]">Loading review…</p>
    </div>
  );
}

export default async function BookServiceSelectSkuPage({ params }: PageProps) {
  const { sku } = await params;

  return (
    <Suspense fallback={<ReviewPageFallback />}>
      <ReviewPageClient skuParam={sku} />
    </Suspense>
  );
}
