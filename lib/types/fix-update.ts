export type FixUpdatePillar = 'speed' | 'security' | 'seo' | 'general';

export type FixUpdate = {
  id: string;
  createdAt: Date;
  pillar: FixUpdatePillar;
  message: string;
  visibility: 'client';
  pinned: boolean;
};
