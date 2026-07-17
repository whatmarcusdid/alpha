'use client';

import { Inter } from 'next/font/google';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z, type ZodIssue } from 'zod';

import { BookServiceHeader } from '@/lib/book-service/BookServiceHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ratch } from '@/lib/fonts/ratch';
import { trackGamePlanCallLandingViewed } from '@/lib/analytics';
import { saveBookingIntake } from '@/lib/booking';
import { addProspectToNotion } from '@/lib/notion';
import { useAuth } from '@/contexts/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

const bookingIntakeSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  businessName: z.string().min(1, 'Business name is required'),
  email: z.string().email('Please enter a valid email address'),
  websiteUrl: z.string().min(1, 'Website URL is required'),
});

type BookingIntakeData = z.infer<typeof bookingIntakeSchema>;

const LABEL_CLASS =
  'text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-[#030712]';

const FIELD_CLASS =
  'min-h-[48px] w-full rounded-md border border-[#d1d5db] bg-white px-4 py-3 text-sm leading-[1.5] tracking-[-0.14px] text-[#030712] shadow-none transition-colors placeholder:text-[#52525b] focus:border-[#2920a5] focus:outline-none focus:ring-2 focus:ring-[#2920a5]/20';

function BookCallLoadingFallback() {
  return (
    <div className={`${inter.className} flex min-h-screen flex-col bg-[#f3f4f6]`}>
      <BookServiceHeader variant="transparent" />
      <main className="flex flex-1 items-center justify-center px-4 pb-8">
        <div className="flex w-full max-w-[700px] flex-col items-center rounded-t-2xl bg-white p-6">
          <div className="size-8 animate-spin rounded-full border-2 border-[#2920a5] border-t-transparent" />
        </div>
      </main>
    </div>
  );
}

function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-1">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm leading-[1.5] text-[#e7000b]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function BookCallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState<Partial<BookingIntakeData>>({
    firstName: '',
    lastName: '',
    businessName: '',
    email: '',
    websiteUrl: '',
  });
  const [errors, setErrors] = useState<ZodIssue[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const hasTrackedLandingRef = useRef(false);
  useEffect(() => {
    if (authLoading || hasTrackedLandingRef.current) return;
    hasTrackedLandingRef.current = true;
    const leadSource = searchParams?.get('source') || 'direct';
    const bookingFlowType = user ? 'logged_in_dashboard' : 'anonymous_site';
    trackGamePlanCallLandingViewed({
      lead_source: leadSource,
      booking_flow_type: bookingFlowType,
    });
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('booking_flow_type', bookingFlowType);
      sessionStorage.setItem('lead_source', leadSource);
    }
  }, [searchParams, user, authLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const processedData = {
      ...formData,
      websiteUrl: formData.websiteUrl?.startsWith('http')
        ? formData.websiteUrl
        : `https://${formData.websiteUrl}`,
    };

    const result = bookingIntakeSchema.safeParse(processedData);

    if (!result.success) {
      setErrors(result.error.issues);
      setIsLoading(false);
      return;
    }

    setErrors([]);

    try {
      const docId = await saveBookingIntake(result.data);
      sessionStorage.setItem('bookingIntakeId', docId);

      const notionResult = await addProspectToNotion(result.data);
      if (notionResult.success) {
        console.log('✅ Added to Notion Sales Pipeline');
      } else if (notionResult.error) {
        console.warn('⚠️ Notion sync skipped:', notionResult.error);
      }

      router.push('/book-call/schedule');
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('There was an error submitting your information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = bookingIntakeSchema.safeParse({
    ...formData,
    websiteUrl: formData.websiteUrl?.startsWith('http')
      ? formData.websiteUrl
      : `https://${formData.websiteUrl}`,
  }).success;

  const getError = (field: keyof BookingIntakeData) =>
    errors.find((issue) => issue.path[0] === field)?.message;

  return (
    <div className={`${inter.className} flex min-h-screen flex-col bg-[#f3f4f6]`}>
      <BookServiceHeader variant="transparent" />

      <main className="flex flex-1 flex-col items-center px-4 pt-8 pb-8">
        <div className="flex w-full max-w-[700px] flex-1 flex-col rounded-t-2xl bg-white p-6">
          <form
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col justify-between gap-6"
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h1
                  className={`${ratch.className} text-2xl font-bold leading-[1.2] tracking-[-0.24px] text-[#030712]`}
                >
                  Tell us a little about your business
                </h1>
                <p className="text-base leading-[1.35] text-[#030712]">
                  Help us make your Website Game Plan Call worth your time. This
                  takes 2–3 minutes. Your answers let us tailor the plan to your
                  goals.
                </p>
              </div>

              <FormField
                id="firstName"
                label="Business Owner First Name"
                error={getError('firstName')}
              >
                <input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Mike"
                  className={FIELD_CLASS}
                />
              </FormField>

              <FormField
                id="lastName"
                label="Business Owner Last Name"
                error={getError('lastName')}
              >
                <input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Johnson"
                  className={FIELD_CLASS}
                />
              </FormField>

              <FormField
                id="businessName"
                label="Business name"
                error={getError('businessName')}
              >
                <input
                  id="businessName"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  placeholder="All Star Plumbing DMV"
                  className={FIELD_CLASS}
                />
              </FormField>

              <FormField
                id="email"
                label="Business email"
                error={getError('email')}
              >
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="mike@allstarplumbingdmv.com"
                  className={FIELD_CLASS}
                />
              </FormField>

              <FormField
                id="websiteUrl"
                label="Business Website URL"
                error={getError('websiteUrl')}
              >
                <input
                  id="websiteUrl"
                  name="websiteUrl"
                  value={formData.websiteUrl}
                  onChange={handleInputChange}
                  placeholder="www.allstarplumbingdmv.com"
                  className={FIELD_CLASS}
                />
              </FormField>
            </div>

            <div className="flex flex-col items-center gap-6 pt-2">
              <PrimaryButton
                type="submit"
                disabled={!isFormValid || isLoading}
                className="min-w-[80px] disabled:bg-[#d1d5db] disabled:text-[#52525b] disabled:shadow-none"
              >
                {isLoading ? 'Saving...' : 'Continue To Scheduling'}
              </PrimaryButton>

              <p className="text-center text-xs leading-[1.5] tracking-[-0.12px] text-[#52525b]">
                We keep this simple and confidential. We&apos;ll never share your
                information, and we won&apos;t touch your website without
                permission.
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function BookCallPage() {
  return (
    <Suspense fallback={<BookCallLoadingFallback />}>
      <BookCallContent />
    </Suspense>
  );
}
