'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { TertiaryButton } from '@/components/ui/TertiaryButton';
import { getUserMetrics } from '@/lib/firestore';
import { RecentReportsCard } from '@/components/dashboard/RecentReportsCard';
import { getUserSupportTickets } from '@/lib/firestore/supportTickets';
import { getMeetings } from '@/lib/firestore/meetings';
import { SupportTicket } from '@/types/supportTicket';
import { Meeting } from '@/types/user';
import { UpcomingMeetingCard } from '@/components/dashboard/UpcomingMeetingCard';
import { NoMeetingsCard } from '@/components/dashboard/NoMeetingsCard';

// Add a top-level log in the component:
console.log("Dashboard loaded - testing Cursor!");

function getMetricColor(metricType: string, value: number): string {
  switch (metricType) {
    case 'traffic':
      if (value >= 1000) return '#22C55E';
      if (value >= 500) return '#EAB308';
      return '#EF4444';
    case 'speed':
      if (value < 2) return '#22C55E';
      if (value <= 3) return '#EAB308';
      return '#EF4444';
    case 'support':
      if (value > 6) return '#22C55E';
      if (value >= 3) return '#EAB308';
      return '#EF4444';
    case 'maintenance':
      if (value > 6) return '#22C55E';
      if (value >= 3) return '#EAB308';
      return '#EF4444';
    default:
      return '#6F797A';
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [metrics, setMetrics] = useState([
    { type: 'traffic', value: 0, label: 'Website Traffic This Month' },
    { type: 'speed', value: 0, label: 'Average Site Speed In Seconds' },
    { type: 'support', value: 0, label: 'Support Hours Remaining' },
    { type: 'maintenance', value: 0, label: 'Maintenance Hours Remaining' }
  ]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/signin');
        return;
      } else {
        const email = user.email || 'user@example.com';
        const name = email.split('@')[0];
        setUserName(name.charAt(0).toUpperCase() + name.slice(1));
        
        const [userMetrics, ticketsResult, meetingsResult] = await Promise.all([
          getUserMetrics(user.uid),
          getUserSupportTickets(user.uid, { status: 'open' }),
          getMeetings(user.uid)
        ]);

        setMetrics([
          { type: 'traffic', value: userMetrics.websiteTraffic, label: 'Website Traffic This Month' },
          { type: 'speed', value: userMetrics.averageSiteSpeed, label: 'Average Site Speed In Seconds' },
          { type: 'support', value: userMetrics.supportHoursRemaining, label: 'Support Hours Remaining' },
          { type: 'maintenance', value: userMetrics.maintenanceHoursRemaining, label: 'Maintenance Hours Remaining' }
        ]);
        
        if (ticketsResult.tickets) {
          setSupportTickets(ticketsResult.tickets);
        }

        if (meetingsResult.meetings) {
            const now = new Date();
            const futureMeetings = meetingsResult.meetings
                .filter(m => (m.date as any).toDate() > now)
                .sort((a, b) => (a.date as any).toDate().getTime() - (b.date as any).toDate().getTime());
            setUpcomingMeetings(futureMeetings);
        }

        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F6F1]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b4a41] mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <main className="bg-transparent max-w-[1440px] mx-auto py-8 pb-24 lg:pb-32">
      <div className="bg-white rounded-lg p-8 min-h-[calc(100vh-theme(spacing.32))]">
        
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-lg font-bold leading-tight tracking-tight text-[#545552] mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>{dateStr}</p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#232521]">
              {greeting} {userName}
            </h1>
          </div>
          <SecondaryButton>
            View Site
          </SecondaryButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => {
            const borderColor = getMetricColor(metric.type, metric.value);
            return (
              <div 
                key={index}
                className="bg-white rounded-lg p-6 border border-[#6F797A]/40"
                style={{ borderTopWidth: '4px', borderTopColor: borderColor }}
              >
                <p className="text-5xl font-extrabold leading-tight tracking-tight text-[#232521] mb-2">{metric.value}</p>
                <p className="text-[13px] font-medium leading-tight tracking-tight text-gray-600">{metric.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            <div className="w-full rounded bg-[#FAF9F5] border border-[#6F797A]/40 p-4 flex items-start justify-between gap-6">

              <div className="flex-1 space-y-3">
                <span className="inline-flex items-center justify-center gap-2.5 px-2 py-1 rounded-full bg-[#1b4a41] text-white text-sm font-medium">
                  Support
                </span>
                
                {supportTickets.length > 0 ? (
                  <h3 className="text-[15px] font-bold leading-relaxed tracking-tight text-[#232521]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    You have {supportTickets.length} open support ticket(s)
                  </h3>
                ) : (
                  <h3 className="text-[15px] font-bold leading-relaxed tracking-tight text-[#232521]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Your Support Team is Standing By
                  </h3>
                )}
                
                <p className="text-[13px] font-medium leading-tight tracking-tight text-gray-700">
                  {supportTickets.length > 0 ? (
                    <Link href="/dashboard/support" className="text-[#1b4a41] hover:text-[#0f3830] transition-colors">
                      View your tickets in the Support Hub
                    </Link>
                  ) : (
                    'Fast, reliable help when you need it—just like having a web guy who actually shows up.'
                  )}
                </p>
              </div>
              
              <div className="flex-shrink-0">
                <TertiaryButton href="/dashboard/support">
                  Contact Support
                </TertiaryButton>
              </div>
              
            </div>

            <RecentReportsCard />
          </div>

          <div className="lg:col-span-1">
            <div className="space-y-4">
              <h2 className="text-lg font-bold leading-tight tracking-tight text-[#232521]" style={{ fontFamily: 'Manrope, sans-serif' }}>Upcoming Meetings</h2>
              
              {upcomingMeetings.length > 0 ? (
                <div className="space-y-4">
                  {upcomingMeetings.map(meeting => (
                    <UpcomingMeetingCard key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              ) : (
                <NoMeetingsCard />
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
