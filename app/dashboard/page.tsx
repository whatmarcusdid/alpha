'use client';

import { useEffect, useState } from 'react';
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

function mapFirestoreSessionToFixSession(data: FirestoreData): FixSession {
  const fixProgress =
    data.fixProgress && typeof data.fixProgress === 'object'
      ? (data.fixProgress as Record<string, unknown>)
      : {};

  return {
    orderId: typeof data.orderId === 'string' ? data.orderId : null,
    deliveryStatus: data.deliveryStatus === 'delivered' ? 'delivered' : 'in_progress',
    estimatedCompletionAt: toDateOrNull(data.estimatedCompletionAt),
    reportUrl: typeof data.reportUrl === 'string' ? data.reportUrl : null,
    googleReviewUrl: typeof data.googleReviewUrl === 'string' ? data.googleReviewUrl : null,
    fixProgress: {
      speed: mapPillarProgress(fixProgress.speed),
      security: mapPillarProgress(fixProgress.security),
      seo: mapPillarProgress(fixProgress.seo),
    },
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [fixSession, setFixSession] = useState<FixSession | null>(null);
  const [userData, setUserData] = useState<{ firstName: string; businessName: string } | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

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

    const { getFirestore, doc, getDoc } = require('firebase/firestore');
    const db = getFirestore();

    getDoc(doc(db, 'users', uid))
      .then((snapshot: { exists: () => boolean; data: () => FirestoreData | undefined }) => {
        if (!snapshot.exists()) {
          setUserData({ firstName: 'there', businessName: '' });
          return;
        }

        const data = snapshot.data() ?? {};
        const company = data.company as { legalName?: string } | undefined;

        setUserData({
          firstName:
            typeof data.fullName === 'string'
              ? data.fullName.split(' ')[0]
              : 'there',
          businessName: company?.legalName ?? '',
        });
      })
      .catch((error: Error) => {
        console.error('[Dashboard] user fetch error:', error);
        setUserData({ firstName: 'there', businessName: '' });
      });
  }, [authReady, uid]);

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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const firstName = userData?.firstName ?? 'there';
  const businessName = userData?.businessName ?? '';

  return (
    <main className="min-h-[calc(100vh-120px)] rounded-t-2xl bg-white p-5 pb-24 md:p-6 lg:p-6 lg:pb-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[381px_1fr_381px]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-base leading-[1.5] text-zinc-600 lg:text-lg">{formattedDate}</p>
            <h1 className="text-[28px] font-semibold leading-[1.2] tracking-[-0.28px] text-gray-950 md:text-[30px] md:tracking-[-0.3px] lg:text-[32px] lg:tracking-[-0.32px]">
              {greeting} {firstName}
            </h1>
          </div>
          <SupportContactModule />
        </div>

        <div className="flex flex-col gap-4">
          {fixSession && (
            <>
              <h2 className="text-xl font-semibold leading-[1.2] tracking-[-0.2px] text-gray-950 md:text-[22px] md:tracking-[-0.22px] lg:text-2xl lg:tracking-[-0.24px]">
                Active site fixes
              </h2>
              <ActiveSiteFixesCard
                session={fixSession}
                businessName={businessName}
                onViewDetails={() => setModalOpen(true)}
              />
            </>
          )}
        </div>

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
        />
      )}
    </main>
  );
}
