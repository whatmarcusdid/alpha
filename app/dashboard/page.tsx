'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ActiveSiteFixesCard,
  type FixSession,
  type PillarProgress,
  type PillarStatus,
} from '@/components/dashboard/ActiveSiteFixesCard';
import { SiteFixDetailModal } from '@/components/dashboard/SiteFixDetailModal';
import { RightColumnSidebar } from '@/components/dashboard/RightColumnSidebar';
import { SupportContactModule } from '@/components/dashboard/SupportContactModule';
import { AccessRequestCard } from '@/components/dashboard/AccessRequestCard';
import { ClientUpdatesFeed } from '@/components/dashboard/ClientUpdatesFeed';
import { DeliverablesModule } from '@/components/dashboard/DeliverablesModule';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { DashboardErrorBoundary } from '@/components/dashboard/DashboardErrorBoundary';
import { useClientContext } from '@/lib/hooks/useClientContext';
import { SUPPORT_EMAIL } from '@/lib/config';
import { formatDashboardGreeting } from '@/lib/dashboard/greeting';

type FirestoreTimestamp = {
  toDate?: () => Date;
};

type FirestoreData = Record<string, unknown>;

function toDateOrNull(value: unknown): Date | null {
  if (
    value != null &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as FirestoreTimestamp).toDate === 'function'
  ) {
    return (value as FirestoreTimestamp).toDate!();
  }

  return null;
}

function mapPillarProgress(data: unknown): PillarProgress {
  const pillar = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const status = pillar.status as PillarStatus;
  const validStatuses: PillarStatus[] = ['queued', 'in_progress', 'done', 'awaiting_access'];

  return {
    status: validStatuses.includes(status) ? status : 'queued',
    description: typeof pillar.description === 'string' ? pillar.description : null,
    updatedAt: toDateOrNull(pillar.updatedAt),
    completedAt: toDateOrNull(pillar.completedAt),
  };
}

function parseFixSessionAccessStatus(value: unknown): FixSession['accessStatus'] {
  if (value === 'needed' || value === 'received') {
    return value;
  }

  return null;
}

function mapFirestoreSessionToFixSession(data: FirestoreData): FixSession {
  const fixProgress =
    data.fixProgress && typeof data.fixProgress === 'object'
      ? (data.fixProgress as Record<string, unknown>)
      : {};

  return {
    orderId: typeof data.orderId === 'string' ? data.orderId : null,
    accessStatus: parseFixSessionAccessStatus(data.accessStatus),
    deliveryStatus:
      data.deliveryStatus === 'delivered'
        ? 'delivered'
        : data.deliveryStatus === 'in_progress'
          ? 'in_progress'
          : null,
    estimatedCompletionAt: toDateOrNull(data.estimatedCompletionAt),
    reportUrl: typeof data.reportUrl === 'string' ? data.reportUrl : null,
    loomUrl: typeof data.loomUrl === 'string' ? data.loomUrl : null,
    googleReviewUrl: typeof data.googleReviewUrl === 'string' ? data.googleReviewUrl : null,
    onboarding: null,
    fixProgress: {
      speed: mapPillarProgress(fixProgress.speed),
      security: mapPillarProgress(fixProgress.security),
      seo: mapPillarProgress(fixProgress.seo),
    },
  };
}

const supportMailto = `mailto:${SUPPORT_EMAIL}`;

function DashboardPageContent() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [fixSession, setFixSession] = useState<FixSession | null>(null);
  const [userData, setUserData] = useState<{
    businessName: string;
    inviteStatus: string | null;
    siteFix: Record<string, unknown> | null;
  } | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const inviteAcceptedMarkedRef = useRef<boolean>(false);
  const { context: clientContext, status: clientContextStatus } = useClientContext();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const { getAuth, onAuthStateChanged } = require('firebase/auth');
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user: { uid: string } | null) => {
      setUid(user?.uid ?? null);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authReady && !uid) {
      router.push('/signin');
    }
  }, [authReady, uid, router]);

  useEffect(() => {
    if (!authReady || !uid) return;

    const { getFirestore, doc, onSnapshot } = require('firebase/firestore');
    const db = getFirestore();

    const unsubscribe = onSnapshot(
      doc(db, 'users', uid),
      (snapshot: { exists: () => boolean; data: () => FirestoreData | undefined }) => {
        if (!snapshot.exists()) {
          setUserData({
            businessName: '',
            inviteStatus: null,
            siteFix: null,
          });
          return;
        }

        const data = snapshot.data() ?? {};
        const company = data.company as { legalName?: string } | undefined;
        const siteFix =
          data.siteFix && typeof data.siteFix === 'object'
            ? (data.siteFix as Record<string, unknown>)
            : null;

        setUserData({
          businessName: company?.legalName ?? '',
          inviteStatus:
            siteFix != null && typeof siteFix.inviteStatus === 'string'
              ? siteFix.inviteStatus
              : null,
          siteFix,
        });
      },
      (error: Error) => {
        console.error('[Dashboard] user fetch error:', error);
        setUserData({
          businessName: '',
          inviteStatus: null,
          siteFix: null,
        });
      }
    );

    return () => unsubscribe();
  }, [authReady, uid]);

  useEffect(() => {
    if (
      !authReady ||
      !uid ||
      userData?.inviteStatus !== 'sent' ||
      inviteAcceptedMarkedRef.current
    ) {
      return;
    }

    inviteAcceptedMarkedRef.current = true;

    const { getFirestore, doc, updateDoc, serverTimestamp } = require('firebase/firestore');
    const db = getFirestore();

    updateDoc(doc(db, 'users', uid), {
      'siteFix.inviteStatus': 'accepted',
      'siteFix.acceptedAt': serverTimestamp(),
    }).catch((error: Error) => {
      console.error('[Dashboard] failed to mark invite accepted:', error);
    });
  }, [authReady, uid, userData?.inviteStatus]);

  useEffect(() => {
    if (!authReady || !uid) return;

    const { getFirestore, collection, query, orderBy, limit, onSnapshot } = require('firebase/firestore');
    const db = getFirestore();
    const fixSessionsQuery = query(
      collection(db, 'users', uid, 'fixSessions'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      fixSessionsQuery,
      (snapshot: { empty: boolean; docs: Array<{ data: () => FirestoreData }> }) => {
        if (snapshot.empty) {
          setFixSession(null);
          return;
        }

        const docSnap = snapshot.docs[0];
        const mappedFixSession = mapFirestoreSessionToFixSession(docSnap.data());
        setFixSession(mappedFixSession);
      },
      (error: Error) => {
        console.error('[Dashboard] fixSessions listener error:', error);
        setFixSession(null);
      }
    );

    return () => unsubscribe();
  }, [authReady, uid]);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const contactName =
    typeof userData?.siteFix?.contactName === 'string'
      ? userData.siteFix.contactName
      : '';
  const greeting = formatDashboardGreeting(contactName);
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const businessName =
    clientContext?.businessName || userData?.businessName || 'Your business';
  const packageLabel = clientContext?.packageLabel ?? null;
  const entitlements = clientContext?.entitlements ?? [];

  const renderCenterColumn = () => {
    if (clientContextStatus === 'error') {
      return (
        <DashboardEmptyState
          headline="Something went wrong"
          body="We had trouble loading your account details. Try refreshing — if the problem continues, contact support."
          cta={{ label: 'Refresh', href: '/' }}
        />
      );
    }

    if (clientContextStatus === 'not_linked') {
      return (
        <DashboardEmptyState
          headline="We can't find your account"
          body="Your account may not be linked yet. Please contact us and we'll get this sorted right away."
          cta={{ label: 'Contact support', href: supportMailto, variant: 'secondary' }}
        />
      );
    }

    if (fixSession == null) {
      return (
        <DashboardEmptyState
          headline="We're getting your project set up"
          body="Your fix session will appear here shortly. If it's been more than 24 hours, reach out to us."
          cta={{ label: 'Contact support', href: supportMailto, variant: 'secondary' }}
        />
      );
    }

    return (
      <>
        <h2 className="text-xl font-semibold leading-[1.2] tracking-[-0.2px] text-gray-950 md:text-[22px] md:tracking-[-0.22px] lg:text-2xl lg:tracking-[-0.24px]">
          Active site fixes
        </h2>
        {fixSession.accessStatus != null && (
          <AccessRequestCard
            accessStatus={fixSession.accessStatus}
            orderId={fixSession.orderId}
          />
        )}
        {uid != null && <ClientUpdatesFeed userId={uid} />}
        <ActiveSiteFixesCard
          session={fixSession}
          businessName={businessName}
          packageLabel={packageLabel}
          entitlements={entitlements}
          showPackageFallback={false}
          onViewDetails={() => setModalOpen(true)}
        />
        <DeliverablesModule
          reportUrl={fixSession.reportUrl}
          loomUrl={fixSession.loomUrl}
          deliveryStatus={fixSession.deliveryStatus}
        />
      </>
    );
  };

  return (
    <main className="min-h-[calc(100vh-120px)] rounded-t-2xl bg-white p-5 pb-24 shadow-[0_5px_12px_0_rgba(0,0,0,0.10)] md:p-6 lg:p-6 lg:pb-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[381px_1fr_381px]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-base leading-[1.5] text-zinc-600 lg:text-lg">{formattedDate}</p>
            <h1 className="text-[28px] font-semibold leading-[1.2] tracking-[-0.28px] text-gray-950 md:text-[30px] md:tracking-[-0.3px] lg:text-[32px] lg:tracking-[-0.32px]">
              {greeting}
            </h1>
          </div>
          <SupportContactModule />
        </div>

        <div className="flex flex-col gap-4">{renderCenterColumn()}</div>

        <div>
          <RightColumnSidebar
            deliveryStatus={fixSession?.deliveryStatus ?? null}
            googleReviewUrl={fixSession?.googleReviewUrl ?? null}
            userId={uid ?? ''}
          />
        </div>
      </div>

      {fixSession && (
        <SiteFixDetailModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          session={fixSession}
          businessName={businessName}
          packageLabel={packageLabel}
          entitlements={entitlements}
        />
      )}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <DashboardErrorBoundary>
      <DashboardPageContent />
    </DashboardErrorBoundary>
  );
}
