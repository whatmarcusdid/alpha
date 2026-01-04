import { Timestamp } from 'firebase/firestore';

export interface Meeting {
  id: string;
  title: string;
  date: Timestamp;
  type: 'quarterly-review' | 'onboarding' | 'support-call' | 'strategy-session';
  duration?: number;  // minutes
  meetingUrl?: string;  // Zoom/Google Meet/Calendly link
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  calendarEventId?: string;  // If synced with Google Calendar
}

export interface User {
  // Auth
  authProvider: string;
  email: string;
  fullName: string;
  stripeCustomerId: string;
  onboardingComplete: boolean;
  
  // Business
  businessName: string;
  plan: string;
  status: string;
  
  // Personal
  phone: string;
  role: string;
  
  // Nested Objects
  company: {
    legalName: string;
    address: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    businessService: string;
    numEmployees: string;
    yearFounded: string;
    serviceArea: string;
    websiteUrl: string;
    lastUpdated: string;
  };
  
  subscription: {
    tier: string;
    status: string;
    billingFrequency: string;
    startDate: Timestamp;
    endDate: Timestamp;
    cancelAtPeriodEnd: boolean;
    stripeSubscriptionId: string;
    stripeProductId: string;
    stripePriceId: string;
  };
  
  planLimits: {
    supportHoursTotal: number;
    maintenanceHoursTotal: number;
  };
  
  metrics: {
    websiteTraffic: number;
    siteSpeedSeconds: number;
    supportHoursRemaining: number;
    maintenanceHoursRemaining: number;
  };
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;

  upcomingMeetings?: Meeting[];
}
