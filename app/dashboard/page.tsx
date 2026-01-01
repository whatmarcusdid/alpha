'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { DashboardNav } from '@/components/layout/DashboardNav';
import { Button } from '@/components/ui/button';
import { getUserMetrics } from '@/lib/firestore';
import { RecentReportsCard } from '@/components/dashboard/RecentReportsCard';

type Meeting = {
  month: string;
  day: string;
  title: string;
  datetime: string;
};

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
  const [upcomingMeeting, setUpcomingMeeting] = useState<Meeting | null>(null);

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
        
        // Fetch user metrics from Firestore
        const userMetrics = await getUserMetrics(user.uid);
        
        // Update metrics state with fetched data
        setMetrics([
          { type: 'traffic', value: userMetrics.websiteTraffic, label: 'Website Traffic This Month' },
          { type: 'speed', value: userMetrics.averageSiteSpeed, label: 'Average Site Speed In Seconds' },
          { type: 'support', value: userMetrics.supportHoursRemaining, label: 'Support Hours Remaining' },
          { type: 'maintenance', value: userMetrics.maintenanceHoursRemaining, label: 'Maintenance Hours Remaining' }
        ]);
        
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

  // Get current date
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-[#F7F6F1] p-4">
      {/* Navigation */}
      <DashboardNav />

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        <div className="bg-white rounded-lg p-8 min-h-[calc(100vh-theme(spacing.32))]">
          
          {/* Header Section */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-sm text-gray-600 mb-1">{dateStr}</p>
              <h1 className="text-4xl font-bold text-[#232521]">
                {greeting} {userName}
              </h1>
            </div>
            <Button 
              variant="outline"
              className="border-2 border-[#1B4A41] text-[#1B4A41] bg-white hover:bg-gray-50 rounded-full px-6"
            >
              View Site
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metrics.map((metric, index) => {
              const borderColor = getMetricColor(metric.type, metric.value);
              return (
                <div 
                  key={index}
                  className="bg-white rounded-lg p-6 border border-[#6F797A]/40"
                  style={{ borderTopWidth: '4px', borderTopColor: borderColor }}
                >
                  <p className="text-4xl font-bold text-[#232521] mb-2">{metric.value}</p>
                  <p className="text-sm text-gray-600">{metric.label}</p>
                </div>
              );
            })}
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="w-full rounded bg-[#FAF9F5] border border-[#6F797A]/40 p-4 flex items-start justify-between gap-6">
  
                {/* Left Column - Badge + Heading + Text stacked */}
                <div className="flex-1 space-y-3">
                  {/* Support Badge */}
                  <span className="inline-flex items-center justify-center gap-2.5 px-2 py-1 rounded-full bg-[#1b4a41] text-white text-sm font-medium">
                    Support
                  </span>
                  
                  {/* Heading */}
                  <h3 className="text-xl font-bold text-[#232521]">
                    Your Support Team is Standing By
                  </h3>
                  
                  {/* Description */}
                  <p className="text-base text-gray-700 leading-relaxed">
                    Fast, reliable help when you need it—just like having a web guy who actually shows up.
                  </p>
                </div>
                
                {/* Right Column - Contact Support Button */}
                <div className="flex-shrink-0">
                  <Link 
                    href="/dashboard/support"
                    className="text-[#1b4a41] text-center text-base font-bold leading-[150%] hover:text-[#0f3830] transition-colors whitespace-nowrap"
                  >
                    Contact Support
                  </Link>
                </div>
                
              </div>

              <RecentReportsCard />
            </div>

            {/* Right Column (1/3 width) */}
            <div className="lg:col-span-1">
              
              {/* Upcoming Meetings Section */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-[#232521]">Upcoming Meetings</h2>
                
                {upcomingMeeting ? (
                  /* Meeting Scheduled State - Card Only */
                  <div className="bg-white rounded-lg p-6 border border-[#6F797A]/40 space-y-4">
                    {/* Calendar Badge */}
                    <div className="inline-flex flex-col items-center bg-white rounded overflow-hidden border border-gray-200 w-32">
                      <div className="bg-[#EF4444] text-white text-center py-2 px-4 w-full font-semibold">
                        {upcomingMeeting.month}
                      </div>
                      <div className="text-5xl font-bold text-[#232521] py-3">
                        {upcomingMeeting.day}
                      </div>
                    </div>
                    
                    {/* Meeting Details */}
                    <div>
                      <h3 className="text-xl font-bold text-[#232521] mb-2">
                        {upcomingMeeting.title}
                      </h3>
                      <p className="text-base text-gray-600 mb-3">
                        {upcomingMeeting.datetime}
                      </p>
                      <Link 
                        href="/dashboard/meetings"
                        className="text-base font-semibold text-[#1b4a41] hover:text-[#0f3830] transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* Empty State - Card Only */
                  <div className="bg-white rounded-lg p-6 border border-[#6F797A]/40">
                    <h3 className="text-xl font-bold text-[#232521] mb-3">
                      No Upcoming Meetings
                    </h3>
                    <p className="text-base text-gray-600 leading-relaxed">
                      No meetings on the calendar right now. We'll reach out when it's time for your next semi-annual website review.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
