import type { Timestamp } from 'firebase-admin/firestore';

export type FixUpdatePillar = 'speed' | 'security' | 'seo' | 'general';

export type FixUpdate = {
  id: string;
  createdAt: Date;
  pillar: FixUpdatePillar;
  message: string;
  visibility: 'client';
  pinned: boolean;
};

/** Firestore document at users/{uid}/fixUpdates/{updateId} */
export type FixUpdateDoc = {
  message: string;
  createdAt: Timestamp;
  pillar: FixUpdatePillar;
  visibility: 'client';
  pinned: boolean;
};

export type RecentFixUpdate = {
  id: string;
  message: string;
  createdAt: string | null;
  pillar: FixUpdatePillar;
  visibility: 'client';
  pinned: boolean;
};
