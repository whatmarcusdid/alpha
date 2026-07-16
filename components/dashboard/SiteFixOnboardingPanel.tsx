'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { SiteFixUserNamespace } from '@/lib/book-service/createUser';
import { getEntitlementDisplayName } from '@/lib/book-service/entitlement-labels';
import { ONBOARDING_STATUS } from '@/lib/book-service/onboarding-constants';
import type { SiteFixEntitlement } from '@/lib/book-service/skus';
import { SUPPORT_EMAIL } from '@/lib/config';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/firebase';

type SiteFixPanelState = {
  orderId: string;
  onboardingStatus: string;
  purchasedPackages: SiteFixEntitlement[];
};

export function SiteFixOnboardingPanel() {
  const [panel, setPanel] = useState<SiteFixPanelState | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || !db) return;

    const { doc, onSnapshot } = require('firebase/firestore');
    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot: { data: () => Record<string, unknown> | undefined }) => {
        const siteFix = snapshot.data()?.siteFix as SiteFixUserNamespace | undefined;
        if (!siteFix?.orderId) {
          setPanel(null);
          return;
        }

        setPanel({
          orderId: siteFix.orderId,
          onboardingStatus: siteFix.onboardingStatus,
          purchasedPackages: siteFix.purchasedPackages ?? [],
        });
      },
      (err: Error) => {
        console.error('[SiteFixOnboardingPanel] snapshot error:', err);
        setPanel(null);
      }
    );

    return () => unsubscribe();
  }, []);

  if (!panel) return null;

  const packageLabels = panel.purchasedPackages
    .map((pkg) => getEntitlementDisplayName(pkg))
    .join(', ');

  if (panel.onboardingStatus === ONBOARDING_STATUS.DELIVERY_READY) {
    return (
      <div className="mb-8 rounded-lg border border-[#2563EB]/30 bg-[#EFF6FF] p-6">
        <h2 className="text-xl font-bold text-[#0F172A]">✓ You&apos;re all set</h2>
        <p className="mt-3 text-base text-gray-700">
          We&apos;ve received everything we need. Your Site Fix is in the queue and
          we&apos;ll begin within 48 hours.
        </p>
        {packageLabels ? (
          <p className="mt-4 text-sm text-gray-600">
            <span className="font-semibold text-[#0F172A]">Purchased:</span>{' '}
            {packageLabels}
          </p>
        ) : null}
      </div>
    );
  }

  if (panel.onboardingStatus === 'awaiting_account') {
    return (
      <div className="mb-8 rounded-lg border border-gray-200 bg-[#FAF9F5] p-6">
        <p className="text-base text-gray-700">
          Contact support to complete your setup.
        </p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-2 inline-block text-[#2563EB] underline"
        >
          {SUPPORT_EMAIL}
        </a>
      </div>
    );
  }

  if (panel.onboardingStatus !== ONBOARDING_STATUS.AWAITING_ACCESS) {
    return null;
  }

  return (
    <div className="mb-8 rounded-lg border border-[#2563EB]/30 bg-[#EFF6FF] p-6">
      <h2 className="text-xl font-bold text-[#0F172A]">
        One more step before we can start
      </h2>
      <p className="mt-3 text-base text-gray-700">
        We need access to your website to begin your Site Fix.
      </p>
      <Link
        href={`/book-service/access?orderId=${encodeURIComponent(panel.orderId)}`}
        className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-lg bg-[#2563EB] px-6 py-3 text-base font-semibold text-white hover:bg-[#1D4ED8]"
      >
        Provide Website Access
      </Link>
      {packageLabels ? (
        <p className="mt-4 text-sm text-gray-600">
          <span className="font-semibold text-[#0F172A]">Purchased:</span>{' '}
          {packageLabels}
        </p>
      ) : null}
    </div>
  );
}
