'use client';

import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { TertiaryButton } from '@/components/ui/TertiaryButton';
import { Input } from '@/components/ui/input';
import { NotificationToast } from '@/components/ui/NotificationToast';
import ManageSubscriptionModal from '@/components/manage/ManageSubscriptionModal';
import { UpcomingMeetingCard } from '@/components/dashboard/UpcomingMeetingCard';
import { NoMeetingsCard } from '@/components/dashboard/NoMeetingsCard';
import { RecentReportsCard } from '@/components/dashboard/RecentReportsCard';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';


export default function DesignSystemPage() {
  // State for interactive demos
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Mock data for UpcomingMeetingCard
  const mockMeeting = {
    title: "Q1 Website Review",
    date: new Timestamp(1768536000, 0), // Jan 15, 2026, 2:00 PM
    meetingUrl: "#"
  };

  return (
    <div className="min-h-screen bg-[#F7F6F1]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-4xl font-bold text-[#232521]">TradeSiteGenie Design System</h1>
          <p className="text-gray-600 mt-2">Component library and style guide</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        
        {/* COLORS SECTION */}
        <section>
          <h2 className="text-3xl font-bold text-[#232521] mb-6">Color System</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Primary Green', hex: '#1B4332', var: 'primary' },
              { name: 'Secondary Teal', hex: '#1B4A41', var: 'secondary' },
              { name: 'Accent Green', hex: '#9be382', var: 'accent' },
              { name: 'Background', hex: '#F7F6F1', var: 'background' },
              { name: 'Cream', hex: '#FAF9F5', var: 'cream' },
              { name: 'Border', hex: '#6F797A', var: 'border' },
              { name: 'Text', hex: '#232521', var: 'text' },
              { name: 'White', hex: '#FFFFFF', var: 'white' },
            ].map((color) => (
              <div key={color.var} className="bg-white rounded-lg p-4 border border-gray-200">
                <div 
                  className="w-full h-24 rounded-md mb-3" 
                  style={{ backgroundColor: color.hex }}
                />
                <p className="font-semibold text-[#232521] text-sm">{color.name}</p>
                <p className="text-gray-600 text-xs font-mono mt-1">{color.hex}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TYPOGRAPHY SECTION */}
        <section>
          <h2 className="text-3xl font-bold text-[#232521] mb-6">Typography</h2>
          <div className="bg-white rounded-lg p-8 border border-gray-200 space-y-6">
            <div>
              <h1 className="text-5xl font-bold text-[#232521]">Heading 1 - 48px Bold</h1>
              <code className="text-xs text-gray-500 block mt-2">text-5xl font-bold</code>
            </div>
            <div>
              <h2 className="text-4xl font-bold text-[#232521]">Heading 2 - 36px Bold</h2>
              <code className="text-xs text-gray-500 block mt-2">text-4xl font-bold</code>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-[#232521]">Heading 3 - 24px Semibold</h3>
              <code className="text-xs text-gray-500 block mt-2">text-2xl font-semibold</code>
            </div>
            <div>
              <p className="text-lg text-gray-700">Body Large - 18px Regular - Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
              <code className="text-xs text-gray-500 block mt-2">text-lg text-gray-700</code>
            </div>
            <div>
              <p className="text-base text-gray-900">Body - 16px Regular - Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
              <code className="text-xs text-gray-500 block mt-2">text-base text-gray-900</code>
            </div>
            <div>
              <p className="text-sm text-gray-600">Small Text - 14px Regular - Lorem ipsum dolor sit amet.</p>
              <code className="text-xs text-gray-500 block mt-2">text-sm text-gray-600</code>
            </div>
          </div>
        </section>

        {/* BUTTONS SECTION */}
        <section>
          <h2 className="text-3xl font-bold text-[#232521] mb-6">Buttons</h2>
          
          <div className="space-y-8">
            {/* Primary Button */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Primary Button</h3>
              <p className="text-gray-600 mb-6">Use for primary actions like "Save", "Submit", "Sign In"</p>
              <div className="flex flex-wrap gap-4 items-center">
                <PrimaryButton onClick={() => alert('Primary clicked!')}>
                  Primary Action
                </PrimaryButton>
                <PrimaryButton disabled>
                  Disabled State
                </PrimaryButton>
                <PrimaryButton href="/dashboard">
                  With Link
                </PrimaryButton>
              </div>
              <div className="mt-6 bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700">
                  {`<PrimaryButton onClick={handleClick}>Primary Action</PrimaryButton>`}
                </code>
              </div>
            </div>

            {/* Secondary Button */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Secondary Button</h3>
              <p className="text-gray-600 mb-6">Use for secondary actions like "Edit", "View Details"</p>
              <div className="flex flex-wrap gap-4 items-center">
                <SecondaryButton onClick={() => alert('Secondary clicked!')}>
                  Secondary Action
                </SecondaryButton>
                <SecondaryButton disabled>
                  Disabled State
                </SecondaryButton>
                <SecondaryButton href="/settings">
                  With Link
                </SecondaryButton>
              </div>
              <div className="mt-6 bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700">
                  {`<SecondaryButton onClick={handleClick}>Secondary Action</SecondaryButton>`}
                </code>
              </div>
            </div>

            {/* Tertiary Button */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Tertiary Button</h3>
              <p className="text-gray-600 mb-6">Use for tertiary actions or list items with navigation</p>
              <div className="flex flex-wrap gap-4 items-center">
                <TertiaryButton onClick={() => alert('Tertiary clicked!')}>
                  Tertiary Action
                </TertiaryButton>
                <TertiaryButton disabled>
                  Disabled State
                </TertiaryButton>
                <TertiaryButton href="https://tradesitegenie.com" target="_blank">
                  External Link
                </TertiaryButton>
              </div>
              <div className="mt-6 bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700">
                  {`<TertiaryButton onClick={handleClick}>Tertiary Action</TertiaryButton>`}
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* FORM ELEMENTS SECTION */}
        <section>
          <h2 className="text-3xl font-bold text-[#232521] mb-6">Form Elements</h2>
          
          <div className="bg-white rounded-lg p-8 border border-gray-200 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-[#232521] mb-4">Text Input</h3>
              <p className="text-gray-600 mb-4">Standard input with min-h-[40px]</p>
              <Input 
                type="text" 
                placeholder="Enter text here..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <div className="mt-4 bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700">
                  {`<Input type="text" placeholder="Enter text here..." />`}
                </code>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#232521] mb-4">Input States</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default</label>
                  <Input type="text" placeholder="Default state" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Disabled</label>
                  <Input type="text" placeholder="Disabled state" disabled />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">With Value</label>
                  <Input type="text" value="Filled input" readOnly />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#232521] mb-4">Input Types</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <Input type="email" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Number</label>
                  <Input type="number" placeholder="123" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tel</label>
                  <Input type="tel" placeholder="(555) 555-5555" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* NOTIFICATIONS SECTION */}
        <section>
          <h2 className="text-3xl font-bold text-[#232521] mb-6">Notifications</h2>
          
          <div className="bg-white rounded-lg p-8 border border-gray-200">
            <h3 className="text-xl font-semibold text-[#232521] mb-4">Toast Notifications</h3>
            <p className="text-gray-600 mb-6">Auto-dismissing notifications that appear in the top-right corner</p>
            
            <div className="flex gap-4">
              <PrimaryButton onClick={() => setShowSuccessToast(true)}>
                Show Success Toast
              </PrimaryButton>
              <SecondaryButton onClick={() => setShowErrorToast(true)}>
                Show Error Toast
              </SecondaryButton>
            </div>

            <div className="mt-6 space-y-4">
              <div className="bg-gray-50 rounded p-4">
                <p className="text-sm font-semibold text-[#232521] mb-2">Success Toast</p>
                <code className="text-xs text-gray-700 block whitespace-pre">
                  {`<NotificationToast
  show={true}
  type="success"
  message="Changes saved successfully"
  subtitle="Your profile has been updated"
  onDismiss={() => setShow(false)}
/>`}
                </code>
              </div>
              <div className="bg-gray-50 rounded p-4">
                <p className="text-sm font-semibold text-[#232521] mb-2">Error Toast</p>
                <code className="text-xs text-gray-700 block whitespace-pre">
                  {`<NotificationToast
  show={true}
  type="error"
  message="Error saving changes"
  subtitle="Please try again"
  onDismiss={() => setShow(false)}
/>`}
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* MODALS SECTION */}
        <section>
          <h2 className="text-3xl font-bold text-[#232521] mb-6">Manage</h2>
          
          <div className="bg-white rounded-lg p-8 border border-gray-200">
            <h3 className="text-xl font-semibold text-[#232521] mb-4">Manage Subscription Modal</h3>
            <p className="text-gray-600 mb-6">Standard modal with backdrop, focus trap, and ESC key support</p>
            
            <PrimaryButton onClick={() => setShowModal(true)}>
              Open Modal Demo
            </PrimaryButton>

            <div className="mt-6 bg-gray-50 rounded p-4">
              <code className="text-xs text-gray-700 block whitespace-pre">
                {`<ManageSubscriptionModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onCancelClick={handleCancel}
  currentPaymentMethod="•••• 4242"
/>`}
              </code>
            </div>
          </div>
        </section>
        
        {/* DASHBOARD COMPONENTS SECTION */}
        <section>
          <h2 className="text-3xl font-bold text-[#232521] mb-6">Dashboard Components</h2>
          
          <div className="space-y-8">
            {/* UpcomingMeetingCard */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Upcoming Meeting Card</h3>
              <p className="text-gray-600 mb-6">Used for displaying scheduled meetings with calendar icon, date, time, and action button</p>
              
              <div className="mb-6">
                <UpcomingMeetingCard meeting={mockMeeting} />
              </div>
              
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 whitespace-pre">
                  {`import { UpcomingMeetingCard } from '@/components/dashboard/UpcomingMeetingCard';
import { Timestamp } from 'firebase/firestore';

interface Meeting {
  title: string;
  date: Timestamp;
  meetingUrl: string;
}

const mockMeeting: Meeting = {
  title: "Q1 Website Review",
  date: new Timestamp(1768536000, 0), // Jan 15, 2026, 2:00 PM
  meetingUrl: "#"
};

<UpcomingMeetingCard meeting={mockMeeting} />`}
                </code>
              </div>
            </div>

            {/* NoMeetingsCard */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">No Meetings Card</h3>
              <p className="text-gray-600 mb-6">Empty state shown when no meetings are scheduled</p>
              
              <div className="mb-6">
                <NoMeetingsCard />
              </div>

              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 whitespace-pre">
                  {`import { NoMeetingsCard } from '@/components/dashboard/NoMeetingsCard';

<NoMeetingsCard />`}
                </code>
              </div>
            </div>

            {/* RecentReportsCard */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Recent Reports Card</h3>
              <p className="text-gray-600 mb-6">Displays recent reports from Firestore - fetches real user data on mount. Shows loading state, empty state, or list of downloadable reports.</p>
              
              <div className="mb-6">
                <RecentReportsCard />
              </div>

              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 whitespace-pre">
                  {`import { RecentReportsCard } from '@/components/dashboard/RecentReportsCard';

// Fetches data from Firestore on mount
<RecentReportsCard />`}
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* AUTH COMPONENTS SECTION */}
        <section>
          <h2 className="text-3xl font-bold text-[#232521] mb-6">Auth Components</h2>
          <p className="text-gray-600 mb-6">Authentication forms with Firebase integration, SSO support, and comprehensive error handling</p>
          
          <div className="space-y-8">
            {/* SignInForm */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Sign In Form</h3>
              <p className="text-gray-600 mb-6">Complete sign-in form with email/password fields, SSO buttons (Google, Apple), and forgot password link. Includes form validation, loading states, and error handling.</p>
              
              {/* Visual Demo */}
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-4 font-semibold">Preview:</p>
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="text-center">
                    <h4 className="text-2xl font-bold text-[#232521]">Sign in to your account</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Email address</div>
                    <div className="w-full h-10 bg-white border border-gray-300 rounded-md px-3 flex items-center text-sm text-gray-400">name@example.com</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Password</span>
                      <span className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer">Forgot password?</span>
                    </div>
                    <div className="w-full h-10 bg-white border border-gray-300 rounded-md px-3 flex items-center text-sm text-gray-400">••••••••</div>
                  </div>
                  <div className="w-full h-10 bg-[#9be382] rounded-full flex items-center justify-center text-[#232521] font-semibold text-sm">Sign in</div>
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[#FAF9F5] px-2 text-gray-500">Or continue with</span>
                    </div>
                  </div>
                  <div className="w-full h-11 bg-white border border-gray-400 rounded-full flex items-center justify-center text-sm font-medium text-gray-700">
                    <div className="w-5 h-5 bg-gray-300 rounded-full mr-2"></div>
                    Sign in with Google
                  </div>
                  <div className="w-full h-11 bg-black rounded-full flex items-center justify-center text-sm font-medium text-white">
                    <div className="w-5 h-5 bg-gray-700 rounded-full mr-2"></div>
                    Sign in with Apple
                  </div>
                </div>
              </div>
              
              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Email and password inputs with validation</li>
                  <li>Forgot password link</li>
                  <li>Google and Apple SSO integration</li>
                  <li>Loading states and error handling</li>
                  <li>Redirects to /dashboard on success</li>
                </ul>
              </div>
              
              {/* Code Example */}
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
        {`import { SignInForm } from '@/components/auth/SignInForm';

        // Usage in your page
        <SignInForm />`}
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* SPACING & LAYOUT SECTION */}
        <section>
          <h2 className="text-3xl font-bold text-[#232521] mb-6">Spacing & Layout</h2>
          
          <div className="bg-white rounded-lg p-8 border border-gray-200">
            <h3 className="text-xl font-semibold text-[#232521] mb-4">Standard Spacing Scale</h3>
            <div className="space-y-4">
              {[
                { size: '4px', class: 'gap-1', px: '1' },
                { size: '8px', class: 'gap-2', px: '2' },
                { size: '12px', class: 'gap-3', px: '3' },
                { size: '16px', class: 'gap-4', px: '4' },
                { size: '24px', class: 'gap-6', px: '6' },
                { size: '32px', class: 'gap-8', px: '8' },
                { size: '48px', class: 'gap-12', px: '12' },
              ].map((space) => (
                <div key={space.size} className="flex items-center gap-4">
                  <div className="w-32">
                    <code className="text-sm">{space.size}</code>
                  </div>
                  <div className="flex-1 bg-gray-100 h-px relative">
                    <div 
                      className="absolute top-0 left-0 h-full bg-[#9be382]" 
                      style={{ width: space.size }}
                    />
                  </div>
                  <code className="text-xs text-gray-600 w-24">{space.class}</code>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Component Heights</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <code className="text-sm w-32">min-h-[40px]</code>
                  <div className="flex-1 bg-gray-100 rounded" style={{ height: '40px' }}>
                    <div className="h-full bg-[#1B4A41] rounded" style={{ width: '200px' }} />
                  </div>
                  <span className="text-xs text-gray-600">Standard input/button height</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* USAGE GUIDELINES */}
        <section>
          <h2 className="text-3xl font-bold text-[#232521] mb-6">Usage Guidelines</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-[#232521] mb-4">✅ Do's</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>Use PrimaryButton for main actions (Save, Submit)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>Maintain min-h-[40px] for all form inputs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>Use NotificationToast for user feedback</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>Keep consistent spacing with Tailwind scale</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>Use TSG color palette for brand consistency</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-[#232521] mb-4">❌ Don'ts</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">•</span>
                  <span>Don't use multiple primary buttons in one section</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">•</span>
                  <span>Don't create custom button styles outside the system</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">•</span>
                  <span>Don't use colors outside the TSG palette</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">•</span>
                  <span>Don't forget disabled states for buttons</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">•</span>
                  <span>Don't use inconsistent spacing values</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

      </main>

      {/* Toast Notifications */}
      <NotificationToast
        show={showSuccessToast}
        type="success"
        message="Changes saved successfully"
        subtitle="Your profile has been updated"
        onDismiss={() => setShowSuccessToast(false)}
      />

      <NotificationToast
        show={showErrorToast}
        type="error"
        message="Error saving changes"
        subtitle="Please try again or contact support"
        onDismiss={() => setShowErrorToast(false)}
      />

      {/* Modal Demo */}
      <ManageSubscriptionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCancelClick={() => {
          setShowModal(false);
          alert('Cancel clicked - would open cancellation flow');
        }}
        currentPaymentMethod="•••• 4242"
      />
    </div>
  );
}
