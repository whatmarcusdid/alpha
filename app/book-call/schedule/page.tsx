'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BookingLayout } from "@/components/layout/booking-layout";
import { BookingCard } from "@/components/ui/booking-card";
import { Button } from "@/components/ui/button";

export default function SchedulePage() {
  const router = useRouter();
  const [bookingData, setBookingData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBookingData = async () => {
      const bookingIntakeId = sessionStorage.getItem("bookingIntakeId");
      if (!bookingIntakeId) {
        router.push("/book-call");
        return;
      }

      // Check if Firestore is initialized (browser-only pattern)
      if (!db) {
        console.error('Firestore not initialized');
        setError('Database not available. Please refresh the page.');
        setLoading(false);
        return;
      }

      try {
        // Fetch directly from Firestore client-side
        // TypeScript: db is guaranteed to be non-null here due to the check above
        const docRef = doc(collection(db!, "bookingIntakes"), bookingIntakeId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setBookingData(docSnap.data());
          setLoading(false);
        } else {
          console.error("No booking data found");
          router.push("/book-call");
        }
      } catch (error) {
        console.error("Error fetching booking data:", error);
        setError('Failed to load booking data. Please try again.');
        setLoading(false);
      }
    };

    loadBookingData();
  }, [router]);

  const handleGoBack = () => {
    router.push("/book-call");
  };

  const handleConfirm = () => {
    // Always allow navigation - assume user has booked
    router.push("/book-call/confirmation");
  };

  if (loading) {
    return (
      <BookingLayout>
        <BookingCard>
          <div className="flex items-center justify-center py-12">
            <p className="text-lg text-gray-600">Loading your booking information...</p>
          </div>
        </BookingCard>
      </BookingLayout>
    );
  }

  if (error) {
    return (
      <BookingLayout>
        <BookingCard>
          <div className="space-y-4 py-12 text-center">
            <p className="text-lg text-red-600">{error}</p>
            <Button
              onClick={handleGoBack}
              className="rounded-[360px] border-2 border-[#1B4A41] bg-white px-6 py-3 text-base font-semibold text-[#1B4A41] transition-all hover:bg-gray-50"
            >
              Go Back
            </Button>
          </div>
        </BookingCard>
      </BookingLayout>
    );
  }

  if (!bookingData) {
    return (
      <BookingLayout>
        <BookingCard>
          <div className="flex items-center justify-center py-12">
            <p className="text-lg text-gray-600">Loading...</p>
          </div>
        </BookingCard>
      </BookingLayout>
    );
  }

  return (
    <BookingLayout>
      <BookingCard>
        <div className="grid w-full grid-cols-1 gap-12 lg:grid-cols-2">
          
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">My Company</h2>
            
            <div className="flex items-center gap-4 self-stretch">
              <img src="/icons/BusinessOwnerFirstName.svg" alt="" className="h-6 w-6 flex-shrink-0" />
              <div className="flex flex-1 items-center gap-4">
                <p className="min-w-[240px] text-sm font-medium text-gray-700">Business Owner First Name</p>
                <p className="text-base text-left text-gray-900">{bookingData.firstName}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 self-stretch">
              <img src="/icons/BusinessOwnerLastName.svg" alt="" className="h-6 w-6 flex-shrink-0" />
              <div className="flex flex-1 items-center gap-4">
                <p className="min-w-[240px] text-sm font-medium text-gray-700">Business Owner Last Name</p>
                <p className="text-base text-left text-gray-900">{bookingData.lastName}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 self-stretch">
              <img src="/icons/BusinessName.svg" alt="" className="h-6 w-6 flex-shrink-0" />
              <div className="flex flex-1 items-center gap-4">
                <p className="min-w-[240px] text-sm font-medium text-gray-700">Business name</p>
                <p className="text-base text-left text-gray-900">{bookingData.businessName}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 self-stretch">
              <img src="/icons/BusinessEmail.svg" alt="" className="h-6 w-6 flex-shrink-0" />
              <div className="flex flex-1 items-center gap-4">
                <p className="min-w-[240px] text-sm font-medium text-gray-700">Business email</p>
                <p className="text-base text-left text-gray-900">{bookingData.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 self-stretch">
              <img src="/icons/BusinessWebsiteURL.svg" alt="" className="h-6 w-6 flex-shrink-0" />
              <div className="flex flex-1 items-center gap-4">
                <p className="min-w-[240px] text-sm font-medium text-gray-700">Business Website URL</p>
                <p className="text-base text-left text-gray-900">{bookingData.websiteUrl}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 self-stretch">
              <img src="/icons/Trade_ServiceType.svg" alt="" className="h-6 w-6 flex-shrink-0" />
              <div className="flex flex-1 items-center gap-4">
                <p className="min-w-[240px] text-sm font-medium text-gray-700">Trade / service type</p>
                <p className="text-base text-left text-gray-900">{bookingData.tradeType}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 self-stretch">
              <img src="/icons/NumberOfEmployees.svg" alt="" className="h-6 w-6 flex-shrink-0" />
              <div className="flex flex-1 items-center gap-4">
                <p className="min-w-[240px] text-sm font-medium text-gray-700">Number of employees</p>
                <p className="text-base text-left text-gray-900">{bookingData.numEmployees}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 self-stretch">
              <img src="/icons/BiggestFrustration.svg" alt="" className="h-6 w-6 flex-shrink-0" />
              <div className="flex flex-1 items-center gap-4">
                <p className="min-w-[240px] text-sm font-medium text-gray-700">Biggest frustration with your website today</p>
                <p className="text-base text-left text-gray-900">{bookingData.biggestFrustration}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Schedule your Website Game Plan Call</h2>
            
            <p className="text-base leading-relaxed text-gray-600">
              Pick a time that works. We'll come prepared. This is a 15–20 minute call. We'll walk through:
            </p>

            <ul className="list-disc space-y-2 pl-5 text-gray-600">
              <li>what we found in your Speed + Safety audit</li>
              <li>the fastest wins to stabilize and protect your site</li>
              <li>the right plan (if it's a fit)</li>
            </ul>

            <iframe
              src="https://calendar.google.com/calendar/appointments/schedules/AcZssZ1OeIYKWEZawHk8YC_p5MGYl9tg4vYbDjCrfEcsWZe96yRROfzeoFK2R0gm9-cmA_KnoWibRspw?gv=true"
              style={{ border: 0 }}
              width="100%"
              height="600"
              frameBorder="0"
              className="rounded-lg"
            ></iframe>
          </div>
        </div>

        <div className="flex w-full flex-col items-center justify-center gap-4 pt-8 sm:flex-row">
          <Button
            onClick={handleGoBack}
            className="min-w-[264px] rounded-[360px] border-2 border-[#1B4A41] bg-white px-6 py-3 text-base font-semibold text-[#1B4A41] transition-all hover:bg-gray-50 active:scale-[0.98]"
          >
            Go Back
          </Button>
          
          <Button
            onClick={handleConfirm}
            className="min-w-[264px] rounded-[360px] px-6 py-3 text-base font-semibold bg-green-500 text-[#1B4A41] shadow-sm hover:bg-green-600 hover:shadow-md active:scale-[0.98] transition-all"
          >
            Confirm & schedule
          </Button>
        </div>
      </BookingCard>
    </BookingLayout>
  );
}

declare global {
  interface Window {
    calendar: {
      schedulingButton: {
        load: (config: {
          url: string;
          color: string;
          label: string;
          target: HTMLElement;
        }) => void;
      };
    };
  }
}
