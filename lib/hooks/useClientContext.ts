'use client';

import { useEffect, useState } from 'react';
import { expandEntitlements, SITE_FIX_SKUS, type SiteFixSKU } from '@/lib/book-service/skus';
import type { ClientContext, SiteFixEntitlement } from '@/lib/types/client-context';

type ClientContextStatus = 'loading' | 'found' | 'not_linked' | 'error';

type UseClientContextReturn = {
  context: ClientContext | null;
  status: ClientContextStatus;
};

const VALID_ENTITLEMENTS: SiteFixEntitlement[] = ['speed', 'security', 'seo_ai_visibility'];

const VALID_SKUS: SiteFixSKU[] = [
  'speed_fix',
  'security_fix',
  'seo_ai_visibility_fix',
  'full_bundle',
];

function isSiteFixSKU(value: unknown): value is SiteFixSKU {
  return typeof value === 'string' && VALID_SKUS.includes(value as SiteFixSKU);
}

function parseEntitlementsFromSiteFix(siteFix: Record<string, unknown>): SiteFixEntitlement[] {
  const sku = siteFix.sku;
  if (isSiteFixSKU(sku)) {
    return expandEntitlements(sku);
  }

  if (!Array.isArray(siteFix.entitlements)) {
    return [];
  }

  return siteFix.entitlements.filter(
    (value): value is SiteFixEntitlement =>
      typeof value === 'string' && VALID_ENTITLEMENTS.includes(value as SiteFixEntitlement)
  );
}

function parsePackageLabel(siteFix: Record<string, unknown>): string | null {
  const sku = siteFix.sku;
  if (!isSiteFixSKU(sku)) {
    return null;
  }

  return SITE_FIX_SKUS[sku].displayName;
}

function parseLinkedFixSessionId(siteFix: Record<string, unknown>): string | null {
  const sessionId = siteFix.activeFixSessionId;
  return typeof sessionId === 'string' && sessionId.length > 0 ? sessionId : null;
}

function mapUserDocToClientContext(
  userId: string,
  data: Record<string, unknown>
): ClientContext {
  const company =
    data.company && typeof data.company === 'object'
      ? (data.company as Record<string, unknown>)
      : {};

  const siteFix =
    data.siteFix && typeof data.siteFix === 'object'
      ? (data.siteFix as Record<string, unknown>)
      : null;

  const businessName =
    typeof company.legalName === 'string' ? company.legalName : '';

  const websiteUrl =
    typeof company.websiteUrl === 'string' && company.websiteUrl.length > 0
      ? company.websiteUrl
      : null;

  return {
    userId,
    fullName: typeof data.fullName === 'string' ? data.fullName : '',
    businessName,
    websiteUrl,
    email: typeof data.email === 'string' ? data.email : '',
    entitlements: siteFix ? parseEntitlementsFromSiteFix(siteFix) : [],
    packageLabel: siteFix ? parsePackageLabel(siteFix) : null,
    linkedFixSessionId: siteFix ? parseLinkedFixSessionId(siteFix) : null,
  };
}

export function useClientContext(): UseClientContextReturn {
  const [context, setContext] = useState<ClientContext | null>(null);
  const [status, setStatus] = useState<ClientContextStatus>('loading');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let unsubscribeAuth: (() => void) | undefined;
    let unsubscribeSnapshot: (() => void) | undefined;

    const { getAuth, onAuthStateChanged } = require('firebase/auth');
    const { getFirestore, doc, onSnapshot } = require('firebase/firestore');

    const auth = getAuth();

    unsubscribeAuth = onAuthStateChanged(auth, (user: { uid: string } | null) => {
      unsubscribeSnapshot?.();
      unsubscribeSnapshot = undefined;

      if (!user?.uid) {
        setContext(null);
        setStatus('not_linked');
        return;
      }

      setStatus('loading');

      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);

      unsubscribeSnapshot = onSnapshot(
        userRef,
        (snapshot: { exists: () => boolean; data: () => Record<string, unknown> | undefined }) => {
          if (!snapshot.exists()) {
            setContext(null);
            setStatus('not_linked');
            return;
          }

          const data = snapshot.data();
          if (!data || data.siteFix == null) {
            setContext(null);
            setStatus('not_linked');
            return;
          }

          setContext(mapUserDocToClientContext(user.uid, data));
          setStatus('found');
        },
        () => {
          setContext(null);
          setStatus('error');
        }
      );
    });

    return () => {
      unsubscribeSnapshot?.();
      unsubscribeAuth?.();
    };
  }, []);

  return { context, status };
}
