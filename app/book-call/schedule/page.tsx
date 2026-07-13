'use client';

import { Inter } from 'next/font/google';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { BookServiceHeader } from '@/lib/book-service/BookServiceHeader';
import { ratch } from '@/lib/fonts/ratch';
import { getBookingIntake } from '@/lib/booking';
import { trackGamePlanCallScheduleSubmitted } from '@/lib/analytics';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

const CALENDAR_SCHEDULING_URL =
  'https://calendar.google.com/calendar/appointments/schedules/AcZssZ1OeIYKWEZawHk8YC_p5MGYl9tg4vYbDjCrfEcsWZe96yRROfzeoFK2R0gm9-cmA_KnoWibRspw';

type BookingIntakeData = {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  websiteUrl: string;
};

const OUTLINE_BUTTON_CLASS =
  'flex min-h-[40px] min-w-[225px] items-center justify-center rounded-lg border-2 border-[#2920a5] px-6 py-2 text-base font-bold leading-[1.5] text-[#2920a5] shadow-[4px_8px_24px_0px_rgba(0,0,0,0.08)] transition-colors hover:bg-[#f4f3ff]';

const PRIMARY_BUTTON_CLASS =
  'flex min-h-[40px] min-w-[225px] items-center justify-center rounded-lg bg-[#2920a5] px-6 py-2 text-base font-bold leading-[1.5] text-white shadow-[4px_8px_12px_rgba(0,0,0,0.08)] transition-colors hover:bg-[#211880]';

function SchedulePageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.className} flex min-h-screen flex-col bg-[#f3f4f6]`}>
      <BookServiceHeader variant="transparent" />
      <main className="flex flex-1 flex-col items-center px-4 pt-8 pb-8">
        <div className="flex w-full max-w-[700px] flex-1 flex-col rounded-t-2xl bg-white p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex w-full min-w-0 items-start gap-4">
      <img src={icon} alt="" className="size-6 shrink-0" />
      <p className="min-w-0 flex-1 text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-[#030712]">
        {label}
      </p>
      <p className="min-w-0 flex-1 overflow-hidden break-words text-sm leading-[1.5] tracking-[-0.14px] text-[#232521]">
        {value}
      </p>
    </div>
  );
}

export default function SchedulePage() {
  const router = useRouter();
  const [bookingData, setBookingData] = useState<BookingIntakeData | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBookingData = async () => {
      const bookingIntakeId = sessionStorage.getItem('bookingIntakeId');
      if (!bookingIntakeId) {
        router.push('/book-call');
        return;
      }

      try {
        const data = await getBookingIntake(bookingIntakeId);
        if (data) {
          setBookingData(data as BookingIntakeData);
        } else {
          console.error('No booking data found');
          router.push('/book-call');
        }
      } catch (err) {
        console.error('Error fetching booking data:', err);
        setError('Failed to load booking data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadBookingData();
  }, [router]);

  const handleGoBack = () => {
    router.push('/book-call');
  };

  const handleSelectDayAndTime = () => {
    window.open(CALENDAR_SCHEDULING_URL, '_blank', 'noopener,noreferrer');
  };

  const handleConfirm = () => {
    const leadSource =
      typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('lead_source')
        : null;
    trackGamePlanCallScheduleSubmitted({
      selected_datetime: new Date().toISOString(),
      trade_type: 'not_specified',
      lead_source: leadSource || 'direct',
    });
    router.push('/book-call/confirmation');
  };

  if (loading) {
    return (
      <SchedulePageShell>
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-[#2920a5] border-t-transparent" />
        </div>
      </SchedulePageShell>
    );
  }

  if (error) {
    return (
      <SchedulePageShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
          <p className="text-base leading-[1.5] text-[#e7000b]">{error}</p>
          <button type="button" onClick={handleGoBack} className={OUTLINE_BUTTON_CLASS}>
            Go Back
          </button>
        </div>
      </SchedulePageShell>
    );
  }

  if (!bookingData) {
    return (
      <SchedulePageShell>
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-[#2920a5] border-t-transparent" />
        </div>
      </SchedulePageShell>
    );
  }

  const summaryRows: Array<{ icon: string; label: string; value: string }> = [
    {
      icon: '/icons/BusinessOwnerPerson.svg',
      label: 'Business Owner First Name',
      value: bookingData.firstName,
    },
    {
      icon: '/icons/BusinessOwnerPerson.svg',
      label: 'Business Owner Last Name',
      value: bookingData.lastName,
    },
    {
      icon: '/icons/BusinessName.svg',
      label: 'Business name',
      value: bookingData.businessName,
    },
    {
      icon: '/icons/BusinessEmail.svg',
      label: 'Business email',
      value: bookingData.email,
    },
    {
      icon: '/icons/BusinessWebsiteURL.svg',
      label: 'Business Website URL',
      value: bookingData.websiteUrl,
    },
  ];

  return (
    <SchedulePageShell>
      <div className="flex flex-1 flex-col justify-between gap-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <h2
              className={`${ratch.className} text-2xl font-bold leading-[1.2] tracking-[-0.24px] text-[#232521]`}
            >
              My Company
            </h2>

            <div className="flex flex-col gap-4">
              {summaryRows.map((row) => (
                <SummaryRow
                  key={row.label}
                  icon={row.icon}
                  label={row.label}
                  value={row.value}
                />
              ))}
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-6 sm:max-w-[246px]">
            <h2
              className={`${ratch.className} text-2xl font-bold leading-[1.2] tracking-[-0.24px] text-[#232521]`}
            >
              Schedule your Website Game Plan Call
            </h2>

            <div className="flex flex-col gap-2 text-base leading-[1.35] text-[#232521]">
              <p>
                Pick a time that works. We&apos;ll come prepared. This is a
                15–20 minute call. We&apos;ll walk through:
              </p>

              <ul className="list-disc space-y-0 pl-6">
                <li>what we found in your Speed + Safety audit</li>
                <li>the fastest wins to stabilize and protect your site</li>
                <li>the right plan (if it&apos;s a fit)</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleSelectDayAndTime}
              className={`${OUTLINE_BUTTON_CLASS} w-full`}
            >
              Select Day &amp; Time
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
          <button
            type="button"
            onClick={handleGoBack}
            className={`${OUTLINE_BUTTON_CLASS} w-full sm:w-[225px]`}
          >
            Go Back
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className={`${PRIMARY_BUTTON_CLASS} w-full sm:w-[225px]`}
          >
            Confirm &amp; Schedule
          </button>
        </div>
      </div>
    </SchedulePageShell>
  );
}
