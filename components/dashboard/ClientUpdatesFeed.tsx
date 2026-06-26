'use client';

import { useEffect, useState } from 'react';
import type { FixUpdate, FixUpdatePillar } from '@/lib/types/fix-update';

type Props = {
  userId: string;
};

const sectionHeadingClass =
  'text-xl font-semibold leading-[1.2] tracking-[-0.2px] text-gray-950 md:text-[22px] md:tracking-[-0.22px] lg:text-2xl lg:tracking-[-0.24px]';

const PILLAR_LABELS: Record<FixUpdatePillar, string> = {
  speed: 'Speed',
  security: 'Security',
  seo: 'SEO & AI Visibility',
  general: 'General',
};

const VALID_PILLARS: FixUpdatePillar[] = ['speed', 'security', 'seo', 'general'];

type FirestoreTimestamp = {
  toDate?: () => Date;
};

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

function parsePillar(value: unknown): FixUpdatePillar {
  if (typeof value === 'string' && VALID_PILLARS.includes(value as FixUpdatePillar)) {
    return value as FixUpdatePillar;
  }

  return 'general';
}

function mapDocToFixUpdate(
  id: string,
  data: Record<string, unknown>
): FixUpdate | null {
  const createdAt = toDateOrNull(data.createdAt);
  const message = typeof data.message === 'string' ? data.message.trim() : '';

  if (createdAt == null || message.length === 0) {
    return null;
  }

  if (data.visibility != null && data.visibility !== 'client') {
    return null;
  }

  return {
    id,
    createdAt,
    pillar: parsePillar(data.pillar),
    message,
    visibility: 'client',
    pinned: data.pinned === true,
  };
}

function sortUpdates(updates: FixUpdate[]): FixUpdate[] {
  return [...updates].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }

    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

function formatUpdateTimestamp(date: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfUpdateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfUpdateDay.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (dayDiff === 0) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    }

    const hours = Math.floor(minutes / 60);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  if (dayDiff === 1) {
    return 'Yesterday';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}),
  }).format(date);
}

export function ClientUpdatesFeed({ userId }: Props) {
  const [updates, setUpdates] = useState<FixUpdate[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || userId.length === 0) return;

    const { getFirestore, collection, query, orderBy, onSnapshot } = require('firebase/firestore');
    const db = getFirestore();
    const updatesQuery = query(
      collection(db, 'users', userId, 'fixUpdates'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      updatesQuery,
      (snapshot: {
        docs: Array<{ id: string; data: () => Record<string, unknown> }>;
      }) => {
        const mapped = snapshot.docs
          .map((docSnap) => mapDocToFixUpdate(docSnap.id, docSnap.data()))
          .filter((update): update is FixUpdate => update != null);

        setUpdates(sortUpdates(mapped));
      },
      (error: Error) => {
        console.error('[ClientUpdatesFeed] listener error:', error);
        setUpdates([]);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return (
    <section className="flex flex-col gap-4">
      <h2 className={sectionHeadingClass}>Updates</h2>

      {updates.length === 0 ? (
        <p className="text-sm italic text-gray-500">
          We&apos;ll post updates here as we make progress.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {updates.map((update) => (
            <li
              key={update.id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  {PILLAR_LABELS[update.pillar]}
                </span>
                <time
                  dateTime={update.createdAt.toISOString()}
                  className="text-xs text-gray-500"
                >
                  {formatUpdateTimestamp(update.createdAt)}
                </time>
              </div>
              <p className="mt-2 text-sm text-gray-800">{update.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
