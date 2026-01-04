'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PRICING, PricingTier, BillingCycle, getRenewalDate } from '@/lib/stripe';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Header } from '@/components/layout/Header';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const tier = (searchParams?.get('tier') as PricingTier) || 'essential';
  const amount = searchParams?.get('amount') || '0';
  const billingCycle = (searchParams?.get('billingCycle') as BillingCycle) || 'annual';
  const paymentIntent = searchParams?.get('payment_intent');
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [orderDetails, setOrderDetails] = useState({
    orderId: '',
    date: '',
  });

  const planData = PRICING[tier];

  useEffect(() => {
    // Simulate verification delay
    setTimeout(() => {
      setOrderDetails({
        orderId: `#BC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        date: new Date().toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        }),
      });
      setIsVerifying(false);
    }, 1500);
  }, []);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#F7F6F1] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#9be382] mx-auto mb-4"></div>
          <p className="text-lg text-[#232521] font-semibold">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F1]">
      <Header />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          
          <h1 className="text-3xl font-bold text-[#232521] mb-2 text-left">
            That's it—your site's in good hands now!
          </h1>
          <p className="text-gray-600 mb-4 text-left">
            Welcome to TradeSiteGenie. We'll handle the tech stuff while you focus on running your business.
          </p>

          <p className="text-sm text-gray-600 mb-8 text-left">
            A receipt and your onboarding link has been to: marcus@allstarplumbingdmv.com
          </p>

          {/* Order Summary */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-[#232521] mb-4">Order Summary</h2>
            
            <ul className="space-y-2 text-sm mb-4">
              <li>Plan: GenieMaintenance - {planData.name} Plan</li>
              <li>Duration: 1 Year</li>
              <li>Support Hours: 4 hours/year</li>
              <li>Maintenance Hours: 8 hours/year</li>
              <li className="mt-4 font-semibold">Features Included:</li>
              <li className="ml-4">Ongoing Security Monitoring & Backups</li>
              <li className="ml-4">Monthly Traffic Analytics Reports</li>
              <li className="ml-4">Monthly Performance Checkups</li>
              <li className="ml-4">Monthly Plugin & Theme Updates</li>
            </ul>
            
            <p className="text-sm font-semibold mb-1">Total Paid Today: ${parseFloat(amount).toFixed(2)}</p>
            <p className="text-sm">Order ID: {orderDetails.orderId}</p>
            <p className="text-sm">Date: {orderDetails.date}</p>
          </div>

          {/* What Happens Next */}
          <div className="mb-8">
            <h3 className="font-bold text-[#232521] mb-3">What Happens Next</h3>
            <ul className="space-y-2 text-sm text-gray-700 list-disc ml-5">
              <li>Check your inbox for a welcome email with your login link</li>
              <li>Join your scheduled welcome call to review your site and set priorities</li>
              <li>Start requesting support tasks using your included hours anytime through your dashboard</li>
              <li>Expect your first analytics report at the end of the upcoming quarter</li>
              <li>We'll run regular security scans and update your plugins behind the scenes—no action needed</li>
            </ul>
          </div>

          {/* Need Anything? */}
          <div className="mb-8">
            <h3 className="font-bold text-[#232521] mb-2">Need Anything?</h3>
            <p className="text-sm text-gray-600">
              Questions or edits? Reach out anytime at support@tradesitegenie.com
            </p>
          </div>

          <PrimaryButton
            onClick={() => router.push('/checkout/wordpress-credentials')}
            className="w-full"
          >
            Continue
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F6F1] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9be382]"></div>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
