'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PRICING, PricingTier, BillingCycle, getRenewalDate } from '@/lib/stripe';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const tier = (searchParams.get('tier') as PricingTier) || 'essential';
  const amount = searchParams.get('amount') || '0';
  const billingCycle = (searchParams.get('billingCycle') as BillingCycle) || 'annual';
  const paymentIntent = searchParams.get('payment_intent');
  
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
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🧞</span>
            <span className="text-xl font-bold text-[#232521]">TRADESITEGENIE</span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-[#232521] mb-2">
            That's it—your site's in good hands now!
          </h1>
          <p className="text-gray-600 mb-8">
            Welcome to TradeSiteGenie. We'll handle the tech stuff while you focus on running your business.
          </p>

          <p className="text-sm text-gray-600 mb-8">
            A receipt and your onboarding link has been to: <span className="font-semibold">marcus@allstarplumbingdmv.com</span>
          </p>

          {/* Order Summary */}
          <div className="bg-[#F7F6F1] rounded-lg p-6 mb-8 text-left">
            <h2 className="text-xl font-bold text-[#232521] mb-4">Order Summary</h2>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Plan:</span>
                <span className="font-semibold text-[#232521]">
                  Genie Maintenance - {planData.name} Plan
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-semibold text-[#232521]">1 Year</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Support Hours:</span>
                <span className="font-semibold text-[#232521]">{planData.features[1]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Maintenance Hours:</span>
                <span className="font-semibold text-[#232521]">{planData.features[2]}</span>
              </div>
            </div>

            <div className="border-t border-gray-300 my-4"></div>

            <h3 className="font-semibold text-[#232521] mb-2">Features Included:</h3>
            <ul className="space-y-1 text-sm">
              {planData.deliverables.map((deliverable, index) => (
                <li key={index} className="flex items-center text-gray-600">
                  <span className="mr-2">•</span>
                  {deliverable}
                </li>
              ))}
            </ul>

            <div className="border-t border-gray-300 my-4"></div>

            <div className="flex justify-between text-lg font-bold">
              <span className="text-[#232521]">Total Paid Today:</span>
              <span className="text-[#232521]">${parseFloat(amount).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-mono text-[#232521]">{orderDetails.orderId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Date:</span>
              <span className="text-[#232521]">{orderDetails.date}</span>
            </div>
          </div>

          {/* What Happens Next */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-bold text-[#232521] mb-3">What Happens Next</h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Check your inbox for a welcome email with your login link</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Join your scheduled welcome call to review your site and set priorities</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Start requesting support tasks using your included hours anytime through your dashboard</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Expect your first analytics report at the end of the upcoming quarter</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>We'll run regular security scans and update your plugins behind the scenes—no action needed</span>
              </li>
            </ul>
          </div>

          {/* Need Anything Section */}
          <div className="border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-600">
              Questions or edits? Reach out anytime at <a href="mailto:support@tradesitegenie.com" className="text-[#9be382] hover:underline font-semibold">support@tradesitegenie.com</a>
            </p>
          </div>

          <button
            onClick={() => router.push('/checkout/wordpress-credentials')}
            className="mt-8 w-full px-6 py-4 rounded-full bg-[#9be382] hover:bg-[#8dd370] text-[#232521] font-semibold text-lg transition-colors"
          >
            Continue
          </button>
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
