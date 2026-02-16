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
  const sessionId = searchParams?.get('session_id');
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [orderDetails, setOrderDetails] = useState({
    orderId: '',
    date: '',
    amount: '0',
    customerEmail: '',
  });

  const planData = PRICING[tier];
  
  // Calculate hours based on tier
  const tierHours = {
    essential: { support: 4, maintenance: 8 },
    advanced: { support: 6, maintenance: 12 },
    premium: { support: 8, maintenance: 16 },
    'safety-net': { support: 2, maintenance: 0 },
  };
  
  const hours = tierHours[tier] || tierHours.essential;

  useEffect(() => {
    const fetchSessionDetails = async () => {
      console.log('fetchSessionDetails called');
      console.log('sessionId:', sessionId);
      console.log('amount from URL:', amount);
      
      if (!sessionId) {
        console.log('No sessionId, using fallback');
        // No session ID, use fallback values
        setOrderDetails({
          orderId: `#TSG-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
          date: new Date().toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          amount: amount,
          customerEmail: '',
        });
        setIsVerifying(false);
        return;
      }

      try {
        console.log('Fetching session details from API...');
        const response = await fetch('/api/stripe/get-session-amount', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        
        console.log('API response status:', response.status);
        console.log('API response ok:', response.ok);
        
        const data = await response.json();
        console.log('API response data:', data);
        
        if (data.success) {
          console.log('Setting order details from API');
          console.log('amountTotal from API:', data.amountTotal);
          console.log('customerEmail from API:', data.customerEmail);
          
          setOrderDetails({
            orderId: `#TSG-${sessionId.slice(-8).toUpperCase()}`,
            date: new Date().toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            }),
            amount: data.amountTotal ? (data.amountTotal / 100).toFixed(2) : amount,
            customerEmail: data.customerEmail || '',
          });
          console.log('Order details set successfully');
        } else {
          console.log('API returned success: false', data.error);
          // API failed, use fallback values
          setOrderDetails({
            orderId: `#TSG-${sessionId.slice(-8).toUpperCase()}`,
            date: new Date().toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            }),
            amount: amount,
            customerEmail: '',
          });
          console.log('Using fallback values due to API error');
        }
      } catch (error) {
        console.error('Error fetching session details:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        // Use fallback values on error
        setOrderDetails({
          orderId: `#TSG-${sessionId ? sessionId.slice(-8).toUpperCase() : Math.random().toString(36).substr(2, 8).toUpperCase()}`,
          date: new Date().toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          amount: amount,
          customerEmail: '',
        });
        console.log('Using fallback values due to catch error');
      } finally {
        console.log('fetchSessionDetails completed, setting isVerifying to false');
        setIsVerifying(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId, amount]);

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

          {orderDetails.customerEmail && (
            <p className="text-sm text-gray-600 mb-8 text-left">
              A receipt and your onboarding link has been sent to: {orderDetails.customerEmail}
            </p>
          )}

          {/* Order Summary */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-[#232521] mb-4">Order Summary</h2>
            
            <ul className="space-y-2 text-sm mb-4">
              <li>Plan: GenieMaintenance - {planData.name} Plan</li>
              <li>Duration: 1 Year</li>
              <li>Support Hours: {hours.support} hours/year</li>
              <li>Maintenance Hours: {hours.maintenance} hours/year</li>
            </ul>
            
            <p className="text-sm font-semibold mb-1">Total Paid Today: ${parseFloat(orderDetails.amount).toFixed(2)}</p>
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
            onClick={() => router.push(`/signup?tier=${tier}&amount=${amount}&billingCycle=${billingCycle}&session_id=${sessionId}`)}
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
