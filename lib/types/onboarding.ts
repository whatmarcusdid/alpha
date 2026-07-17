export type AccessItemStatus = 'provided' | 'confirmed' | 'needed' | 'not_needed' | null;

/** Per-session checklist field statuses (preview fixtures / legacy Firestore shape). */
export type OnboardingData = {
  siteUrl: AccessItemStatus;
  hostingAccess: AccessItemStatus;
  cmsAccess: AccessItemStatus;
  dnsAccess: AccessItemStatus;
  analyticsAccess: AccessItemStatus;
};
