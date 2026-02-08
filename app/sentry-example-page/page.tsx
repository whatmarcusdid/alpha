'use client';

import * as Sentry from '@sentry/nextjs';
import { useState } from 'react';

export default function SentryExamplePage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleClientError = () => {
    setLoading('client-error');
    try {
      throw new Error('🧪 Test client error from TSG Dashboard!');
    } catch (error) {
      Sentry.captureException(error);
      alert('Client error sent to Sentry! Check your Sentry dashboard.');
    } finally {
      setLoading(null);
    }
  };

  const handleServerError = async () => {
    setLoading('server-error');
    try {
      const response = await fetch('/api/test-sentry-error');
      const data = await response.json();
      alert(data.message || 'Server error triggered! Check your Sentry dashboard.');
    } catch (error) {
      alert('Server error sent to Sentry! Check your Sentry dashboard.');
    } finally {
      setLoading(null);
    }
  };

  const handleSendMessage = () => {
    setLoading('message');
    Sentry.captureMessage('🧪 Test message from TSG Dashboard', {
      level: 'info',
      tags: {
        testType: 'message',
        environment: process.env.NODE_ENV,
        source: 'sentry-example-page',
      },
      extra: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      },
    });
    alert('Test message sent to Sentry! Check your Sentry dashboard.');
    setLoading(null);
  };

  const handlePerformanceTracking = async () => {
    setLoading('performance');
    
    // Start a performance span
    const span = Sentry.startSpan(
      {
        name: '🧪 TSG Dashboard Performance Test',
        op: 'test.performance',
      },
      async () => {
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        // Add breadcrumb
        Sentry.addBreadcrumb({
          category: 'test',
          message: 'Performance test completed',
          level: 'info',
        });
        
        return 'Performance test completed';
      }
    );

    await span;
    alert('Performance tracking sent to Sentry! Check your Sentry dashboard.');
    setLoading(null);
  };

  return (
    <div className="min-h-screen bg-[#F7F6F1] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#232521] mb-4">
            🛠️ Sentry Integration Test
          </h1>
          <p className="text-lg text-[#232521]/70">
            Test Sentry error tracking and performance monitoring for TradeSiteGenie Dashboard
          </p>
        </div>

        {/* Instructions Section */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-[#232521] mb-4">
            📋 Testing Instructions
          </h2>
          
          <div className="space-y-4 text-[#232521]">
            <div>
              <h3 className="font-semibold text-lg mb-2">How to Test:</h3>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Click each button below to trigger different Sentry events</li>
                <li>Wait a few seconds for the events to be sent</li>
                <li>
                  Open your Sentry dashboard:{' '}
                  <a 
                    href="https://tradesitegenie.sentry.io" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#1B4A41] hover:text-[#9be382] underline font-medium"
                  >
                    https://tradesitegenie.sentry.io
                  </a>
                </li>
                <li>Navigate to <strong>Issues</strong> to see errors</li>
                <li>Navigate to <strong>Performance</strong> to see performance tracking</li>
              </ol>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-lg mb-2">What to Expect:</h3>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Client Error:</strong> Shows up in Issues with browser context</li>
                <li><strong>Server Error:</strong> Shows up in Issues with server context</li>
                <li><strong>Test Message:</strong> Appears in Issues as an Info-level message with custom tags</li>
                <li><strong>Performance Tracking:</strong> Shows up in Performance tab with timing data</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Note:</strong> If you don't see events immediately, wait 30-60 seconds. 
                Sentry may batch events for efficiency.
              </p>
            </div>
          </div>
        </div>

        {/* Test Buttons Section */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-[#232521] mb-6">
            🧪 Test Actions
          </h2>
          
          <div className="space-y-6">
            {/* Test Client Error */}
            <div>
              <button
                onClick={handleClientError}
                disabled={loading === 'client-error'}
                className="w-full rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
              >
                {loading === 'client-error' ? 'Sending...' : 'Test Client Error'}
              </button>
              <p className="text-sm text-gray-500 mt-2 ml-4">
                Throws a client-side JavaScript error and captures it with Sentry
              </p>
            </div>

            {/* Test Server Error */}
            <div>
              <button
                onClick={handleServerError}
                disabled={loading === 'server-error'}
                className="w-full rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
              >
                {loading === 'server-error' ? 'Sending...' : 'Test Server Error'}
              </button>
              <p className="text-sm text-gray-500 mt-2 ml-4">
                Calls an API route that throws a server-side error
              </p>
            </div>

            {/* Send Test Message */}
            <div>
              <button
                onClick={handleSendMessage}
                disabled={loading === 'message'}
                className="w-full rounded-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
              >
                {loading === 'message' ? 'Sending...' : 'Send Test Message'}
              </button>
              <p className="text-sm text-gray-500 mt-2 ml-4">
                Sends an info-level message with custom tags and context
              </p>
            </div>

            {/* Test Performance Tracking */}
            <div>
              <button
                onClick={handlePerformanceTracking}
                disabled={loading === 'performance'}
                className="w-full rounded-full bg-[#1B4A41] hover:bg-[#1B4332] text-white font-semibold py-3 px-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
              >
                {loading === 'performance' ? 'Tracking...' : 'Test Performance Tracking'}
              </button>
              <p className="text-sm text-gray-500 mt-2 ml-4">
                Creates a performance span with a 1-second simulated operation
              </p>
            </div>
          </div>
        </div>

        {/* Success Indicator */}
        <div className="mt-8 bg-[#9be382]/10 border border-[#9be382] rounded-2xl p-6 text-center">
          <p className="text-[#232521] font-medium">
            ✅ Sentry is configured and ready to capture events
          </p>
          <p className="text-sm text-[#232521]/70 mt-2">
            All test buttons will send data to your Sentry project: <strong>javascript-nextjs</strong>
          </p>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <a 
            href="/dashboard"
            className="text-[#1B4A41] hover:text-[#9be382] font-medium underline"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
