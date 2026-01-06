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
import PlanSelectionModal from '@/components/upgrade/PlanSelectionModal';
import UpgradeConfirmation from '@/components/upgrade/UpgradeConfirmation';
import { Meeting } from '@/types/user';

// Define Tier type for upgrade flow
type Tier = 'essential' | 'advanced' | 'premium';

export default function DesignSystemPage() {
  // State for interactive demos
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [isManageSubscriptionOpen, setIsManageSubscriptionOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // State for auth component modals
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  // State for upgrade flow modals
  const [isPlanSelectionOpen, setIsPlanSelectionOpen] = useState(false);
  const [isUpgradeConfirmationOpen, setIsUpgradeConfirmationOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [currentUserTier] = useState<Tier>('essential');

  // Mock data for UpcomingMeetingCard
  const mockMeeting: Meeting = {
    id: "mock-meeting-1",
    title: "Strategy Planning Session",
    date: Timestamp.now(),
    meetingUrl: "https://meet.google.com/abc-defg-hij",
    type: "strategy-session",
    status: "scheduled"
  };

  return (
    <div className="min-h-screen bg-[#F7F6F1]">
      {/* Header */}
      <header className="bg-transparent border-b border-gray-200">
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

        {/* UI COMPONENTS SECTION */}
        <section>
          <h2 className="text-3xl font-bold text-[#232521] mb-6">UI Components</h2>
          <p className="text-gray-600 mb-6">Core UI components including buttons, alerts, icons, and utility components</p>
          
          <div className="space-y-8">
            {/* shadcn Button */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Button (shadcn/ui)</h3>
              <p className="text-gray-600 mb-6">Versatile button component with multiple variants and sizes. Built with Radix UI and class-variance-authority.</p>
              
              <div className="space-y-6">
                {/* Variants */}
                <div>
                  <p className="text-sm font-semibold text-[#232521] mb-3">Variants:</p>
                  <div className="flex flex-wrap gap-3">
                    <button className="inline-flex items-center justify-center h-10 px-4 py-2 bg-[#1B4A41] text-white rounded-md text-sm font-medium hover:bg-[#1B4A41]/90">
                      Default
                    </button>
                    <button className="inline-flex items-center justify-center h-10 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-600/90">
                      Destructive
                    </button>
                    <button className="inline-flex items-center justify-center h-10 px-4 py-2 border border-gray-300 bg-white rounded-md text-sm font-medium hover:bg-gray-50">
                      Outline
                    </button>
                    <button className="inline-flex items-center justify-center h-10 px-4 py-2 bg-gray-200 text-gray-900 rounded-md text-sm font-medium hover:bg-gray-300">
                      Secondary
                    </button>
                    <button className="inline-flex items-center justify-center h-10 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100">
                      Ghost
                    </button>
                    <button className="inline-flex items-center justify-center h-10 px-4 py-2 text-[#1B4A41] text-sm font-medium underline underline-offset-4 hover:no-underline">
                      Link
                    </button>
                  </div>
                </div>
                
                {/* Sizes */}
                <div>
                  <p className="text-sm font-semibold text-[#232521] mb-3">Sizes:</p>
                  <div className="flex flex-wrap gap-3 items-center">
                    <button className="inline-flex items-center justify-center h-9 px-3 bg-[#1B4A41] text-white rounded-md text-sm font-medium">
                      Small
                    </button>
                    <button className="inline-flex items-center justify-center h-10 px-4 py-2 bg-[#1B4A41] text-white rounded-md text-sm font-medium">
                      Default
                    </button>
                    <button className="inline-flex items-center justify-center h-11 px-8 bg-[#1B4A41] text-white rounded-md text-sm font-medium">
                      Large
                    </button>
                    <button className="inline-flex items-center justify-center h-10 w-10 bg-[#1B4A41] text-white rounded-md text-sm font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { Button } from '@/components/ui/button';

// Variants
<Button variant="default">Default</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">
  <ArrowRight className="h-4 w-4" />
</Button>`}
                </code>
              </div>
            </div>

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

            {/* DestructiveButton */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Destructive Button</h3>
              <p className="text-gray-600 mb-6">Use for destructive actions like "Delete", "Cancel Subscription"</p>
              <div className="flex flex-wrap gap-4 items-center">
                <button className="px-6 py-2 border-2 border-[#E7000B] text-[#E7000B] rounded-full font-semibold hover:bg-red-50">
                  Delete Account
                </button>
                <button className="px-6 py-2 border-2 border-[#E7000B] text-[#E7000B] rounded-full font-semibold opacity-50 cursor-not-allowed">
                  Disabled State
                </button>
              </div>
              <div className="mt-6 bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { DestructiveButton } from '@/components/ui/DestructiveButton';

<DestructiveButton onClick={handleDelete}>
  Delete Account
</DestructiveButton>`}
                </code>
              </div>
            </div>

            {/* Alert */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Alert</h3>
              <p className="text-gray-600 mb-6">Displays important messages with title and description. Supports default and destructive variants.</p>
              
              <div className="space-y-4 mb-6">
                <div className="border rounded-lg p-4 bg-white">
                  <h4 className="font-medium mb-1">Default Alert</h4>
                  <p className="text-sm text-gray-600">This is a standard informational alert message.</p>
                </div>
                <div className="border border-red-500/50 rounded-lg p-4 bg-white">
                  <h4 className="font-medium mb-1 text-red-600">Destructive Alert</h4>
                  <p className="text-sm text-red-600">This is a destructive alert for errors or warnings.</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

<Alert>
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    You can add components to your app using the cli.
  </AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Your session has expired.
  </AlertDescription>
</Alert>`}
                </code>
              </div>
            </div>

            {/* Icons */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Icons</h3>
              <p className="text-gray-600 mb-6">Social sign-in icons for Google and Apple authentication.</p>
              
              <div className="flex gap-6 items-center mb-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-8 h-8">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium">GoogleIcon</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 41.5 51" className="w-6 h-6" fill="currentColor">
                      <path d="M40.2,17.4c-3.4,2.1-5.5,5.7-5.5,9.7c0,4.5,2.7,8.6,6.8,10.3c-0.8,2.6-2,5-3.5,7.2c-2.2,3.1-4.5,6.3-7.9,6.3 s-4.4-2-8.4-2c-3.9,0-5.3,2.1-8.5,2.1s-5.4-2.9-7.9-6.5C2,39.5,0.1,33.7,0,27.6c0-9.9,6.4-15.2,12.8-15.2c3.4,0,6.2,2.2,8.3,2.2 c2,0,5.2-2.3,9-2.3C34.1,12.2,37.9,14.1,40.2,17.4z M28.3,8.1C30,6.1,30.9,3.6,31,1c0-0.3,0-0.7-0.1-1c-2.9,0.3-5.6,1.7-7.5,3.9 c-1.7,1.9-2.7,4.3-2.8,6.9c0,0.3,0,0.6,0.1,0.9c0.2,0,0.5,0.1,0.7,0.1C24.1,11.6,26.6,10.2,28.3,8.1z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium">AppleIcon</span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { GoogleIcon, AppleIcon } from '@/components/ui/icons';

<GoogleIcon className="w-5 h-5" />
<AppleIcon className="w-5 h-5" />`}
                </code>
              </div>
            </div>

            {/* Separator */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Separator</h3>
              <p className="text-gray-600 mb-6">Visual divider for separating content sections. Supports horizontal and vertical orientations.</p>
              
              <div className="space-y-6 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Horizontal</p>
                  <div className="space-y-2">
                    <p className="text-sm">Content above</p>
                    <div className="h-px bg-gray-200 w-full"></div>
                    <p className="text-sm">Content below</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Vertical</p>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">Left content</span>
                    <div className="h-8 w-px bg-gray-200"></div>
                    <span className="text-sm">Right content</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { Separator } from '@/components/ui/separator';

<Separator />
<Separator orientation="vertical" />`}
                </code>
              </div>
            </div>

            {/* Logo */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">TSG Logo</h3>
              <p className="text-gray-600 mb-6">Official TradeSiteGenie logo component with link to home page.</p>
              
              <div className="flex justify-center mb-6 p-6 bg-[#FAF9F5] rounded-lg">
                <svg className="h-7 w-auto" viewBox="0 0 487 58" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clipPath="url(#clip0)">
                    <path d="M51.6953 14.9896H8V7.99841H51.6953V14.9896Z" fill="#4E0009"/>
                    <path d="M8 8H51.6948H8ZM54.802 46.8399C54.802 50.272 52.0198 53.0542 48.5877 53.0542H11.1072C7.67508 53.0542 4.89281 50.272 4.89281 46.8399H11.1072H48.5877H54.802Z" fill="#4E0009"/>
                  </g>
                  <path d="M88.7872 10.0974V19.5355H81.7087V47.8497L69.6489 47.7973V19.5355H62.5703V10.0974H88.7872Z" fill="#4E0009"/>
                </svg>
              </div>
              
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { TSGLogo } from '@/components/ui/logo';

<TSGLogo />`}
                </code>
              </div>
            </div>

            {/* BookingCard */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Booking Card</h3>
              <p className="text-gray-600 mb-6">Container card for booking flows with shadow and max-width constraints.</p>
              
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg">
                <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
                  <h4 className="text-lg font-bold text-[#232521] mb-2">Booking Card Content</h4>
                  <p className="text-gray-600 text-sm">This card wraps booking forms and content with consistent styling.</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { BookingCard } from '@/components/ui/booking-card';

<BookingCard>
  <h1>Service Booking</h1>
  <form>{/* Booking form fields */}</form>
</BookingCard>`}
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

            <div>
              <h3 className="text-lg font-semibold text-[#232521] mb-4">Checkbox</h3>
              <p className="text-gray-600 mb-4">Checkbox component with checked indicator using Radix UI</p>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 rounded-sm border border-gray-400 flex items-center justify-center bg-white"></div>
                  <label className="text-sm font-medium text-gray-700">Unchecked state</label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 rounded-sm border border-[#1B4A41] bg-[#1B4A41] flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <label className="text-sm font-medium text-gray-700">Checked state</label>
                </div>
                
                <div className="flex items-center space-x-2 opacity-50">
                  <div className="h-4 w-4 rounded-sm border border-gray-400 flex items-center justify-center bg-gray-100 cursor-not-allowed"></div>
                  <label className="text-sm font-medium text-gray-700">Disabled state</label>
                </div>
              </div>
              
              <div className="mt-4 bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { Checkbox } from '@/components/ui/checkbox';

<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <label htmlFor="terms">Accept terms and conditions</label>
</div>`}
                </code>
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
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600 font-semibold">Preview:</p>
                  <SecondaryButton onClick={() => setShowSignInModal(true)}>
                    View Full Component
                  </SecondaryButton>
                </div>
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

            {/* SignUpForm */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Sign Up Form</h3>
              <p className="text-gray-600 mb-6">Account creation form with full name, email, and password fields. Includes SSO options and Firestore user document creation.</p>
              
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600 font-semibold">Preview:</p>
                  <SecondaryButton onClick={() => setShowSignUpModal(true)}>
                    View Full Component
                  </SecondaryButton>
                </div>
                
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="text-center space-y-2">
                    <h4 className="text-2xl font-bold text-[#232521]">Create New Account</h4>
                    <p className="text-sm text-gray-600">Create your account to unlock access to your dashboard.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Full Name</div>
                    <div className="w-full h-10 bg-white border border-gray-300 rounded-md px-3 flex items-center text-sm text-gray-400">Enter your full name</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Email</div>
                    <div className="w-full h-10 bg-white border border-gray-300 rounded-md px-3 flex items-center text-sm text-gray-400">Enter your email</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Password</div>
                    <div className="w-full h-10 bg-white border border-gray-300 rounded-md px-3 flex items-center text-sm text-gray-400">Enter your password</div>
                  </div>
                  <div className="w-full h-10 bg-[#9be382] rounded-full flex items-center justify-center text-[#232521] font-semibold text-sm">Create New Account</div>
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#FAF9F5] px-2 text-gray-500">Or</span></div>
                  </div>
                  <div className="w-full h-11 bg-white border border-gray-400 rounded-full flex items-center justify-center text-sm font-medium text-gray-700">
                    <div className="w-5 h-5 bg-gray-300 rounded-full mr-2"></div>Continue with Google
                  </div>
                  <div className="w-full h-11 bg-black rounded-full flex items-center justify-center text-sm font-medium text-white">
                    <div className="w-5 h-5 bg-gray-700 rounded-full mr-2"></div>Continue with Apple
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Full name, email, and password inputs</li>
                  <li>Google and Apple SSO integration</li>
                  <li>Creates Firestore user document on signup</li>
                  <li>Initializes default subscription and stats</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { SignUpForm } from '@/components/auth/SignUpForm';

<SignUpForm />`}
                </code>
              </div>
            </div>

            {/* ForgotPasswordForm */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Forgot Password Form</h3>
              <p className="text-gray-600 mb-6">Password reset form with email input and Firebase password reset email integration.</p>
              
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600 font-semibold">Preview:</p>
                  <SecondaryButton onClick={() => setShowForgotPasswordModal(true)}>
                    View Full Component
                  </SecondaryButton>
                </div>
                
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="text-center space-y-2">
                    <h4 className="text-2xl font-bold text-[#232521]">Reset your password</h4>
                    <p className="text-sm text-gray-600">Enter your email address and we'll send you a reset link.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Email Address</div>
                    <div className="w-full h-10 bg-white border border-gray-300 rounded-md px-3 flex items-center text-sm text-gray-400">name@example.com</div>
                  </div>
                  <div className="w-full h-10 bg-[#9be382] rounded-full flex items-center justify-center text-[#232521] font-semibold text-sm">Send reset link</div>
                  <div className="w-full h-10 bg-white border border-gray-400 rounded-full flex items-center justify-center text-[#232521] font-semibold text-sm">Back to sign in</div>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Email input with Zod schema validation</li>
                  <li>Firebase password reset email integration</li>
                  <li>Success/error alert messages</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

<ForgotPasswordForm />`}
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* CHECKOUT COMPONENTS SECTION */}
        <section>
          <h2 className="text-3xl font-bold text-[#232521] mb-6">Checkout Components</h2>
          <p className="text-gray-600 mb-6">Payment and checkout flow components with Stripe integration</p>
          
          <div className="space-y-8">
            {/* SelectedProductCard */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Selected Product Card</h3>
              <p className="text-gray-600 mb-6">Displays the selected Genie Maintenance plan with remove option. Used at the top of the checkout page to show what the customer is purchasing.</p>
              
              {/* Visual Demo */}
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-4 font-semibold">Preview:</p>
                <div className="max-w-2xl mx-auto">
                  <div className="rounded-lg border-2 border-[#1B4A41] p-4 flex items-center justify-between bg-white">
                    <div>
                      <h4 className="font-semibold text-[#232521]">Genie Maintenance - Monthly Plan</h4>
                    </div>
                    <button className="text-gray-600 hover:text-gray-800">
                      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="23" viewBox="0 0 17 23" fill="none" className="w-5 h-5">
                        <path d="M14.7 2.6625H11.8125V2.025C11.8125 0.9 10.9125 0 9.7875 0H6.9C5.775 0 4.875 0.9 4.875 2.025V2.6625H1.9875C0.9 2.6625 0 3.5625 0 4.65V5.775C0 6.6 0.4875 7.275 1.2 7.575L1.8 20.55C1.875 21.7875 2.85 22.725 4.0875 22.725H12.525C13.7625 22.725 14.775 21.75 14.8125 20.55L15.4875 7.5375C16.2 7.2375 16.6875 6.525 16.6875 5.7375V4.6125C16.6875 3.5625 15.7875 2.6625 14.7 2.6625Z" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Plan name display with TSG branding</li>
                  <li>Remove button with trash icon</li>
                  <li>Border styling in TSG secondary color (#1B4A41)</li>
                  <li>Optional onRemove callback</li>
                  <li>Defaults to routing back to /pricing</li>
                </ul>
              </div>
              
              {/* Code Example */}
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { SelectedProductCard } from '@/components/checkout/SelectedProductCard';

// Usage
<SelectedProductCard 
  planName="Monthly"
  onRemove={() => console.log('Plan removed')}
/>`}
                </code>
              </div>
            </div>

            {/* CheckoutForm */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Checkout Form</h3>
              <p className="text-gray-600 mb-6">Complete Stripe payment form with billing information and payment method. Integrates with Stripe Elements for secure payment processing.</p>
              
              {/* Visual Demo */}
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-4 font-semibold">Preview:</p>
                <div className="space-y-6 max-w-2xl mx-auto">
                  {/* Billing Information Section */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-bold text-[#232521] mb-4">Billing Information</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Name on card</div>
                        <div className="w-full h-10 bg-white border border-gray-300 rounded-lg px-3 flex items-center text-sm text-gray-400">Marcus Johnson</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Address</div>
                        <div className="w-full h-10 bg-white border border-gray-300 rounded-lg px-3 flex items-center text-sm text-gray-400">8049 Old Alexandria Ferry Rd</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Address 2 (Optional)</div>
                        <div className="w-full h-10 bg-white border border-gray-300 rounded-lg"></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">City</div>
                          <div className="w-full h-10 bg-white border border-gray-300 rounded-lg px-3 flex items-center text-sm text-gray-400">Clinton</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">State</div>
                          <div className="w-full h-10 bg-white border border-gray-300 rounded-lg px-3 flex items-center text-sm text-gray-400">Maryland</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Zip Code</div>
                          <div className="w-full h-10 bg-white border border-gray-300 rounded-lg px-3 flex items-center text-sm text-gray-400">20735</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Method Section */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-bold text-[#232521] mb-4">Payment Method</h4>
                    <div className="bg-gray-100 rounded-lg h-24 flex items-center justify-center text-sm text-gray-500">
                      Stripe Payment Element
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Complete billing information collection</li>
                  <li>Stripe Elements PaymentElement integration</li>
                  <li>Form validation (required fields, zip format)</li>
                  <li>US state dropdown selection</li>
                  <li>Loading states during payment processing</li>
                  <li>Redirects to confirmation page on success</li>
                </ul>
              </div>
              
              {/* Code Example */}
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import CheckoutForm from '@/components/checkout/CheckoutForm';
import { Elements } from '@stripe/react-stripe-js';

// Usage (requires Stripe provider)
<Elements stripe={stripePromise} options={options}>
  <CheckoutForm 
    amount={6900}
    tier="monthly"
    billingCycle="monthly"
  />
</Elements>`}
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* LAYOUT COMPONENTS SECTION */}
        <section>
          <h2 className="text-3xl font-bold text-[#232521] mb-6">Layout Components</h2>
          <p className="text-gray-600 mb-6">Structural components for page layouts and navigation</p>
          
          <div className="space-y-8">
            {/* PageCard */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Page Card</h3>
              <p className="text-gray-600 mb-6">Main content container with consistent padding, border, and max-width. Used to wrap page content throughout the dashboard.</p>
              
              {/* Visual Demo */}
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-4 font-semibold">Preview:</p>
                <div className="bg-[#F7F6F1] p-4 rounded-lg">
                  <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-[1440px] mx-auto">
                    <h4 className="text-xl font-bold text-[#232521] mb-2">Page Content Goes Here</h4>
                    <p className="text-gray-600">This is the main content area with consistent spacing and styling.</p>
                  </div>
                </div>
              </div>
              
              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>White background with rounded corners</li>
                  <li>Gray border for subtle definition</li>
                  <li>8px (p-8) consistent padding</li>
                  <li>Max-width of 1440px, centered</li>
                  <li>Min-height to fill viewport minus header</li>
                  <li>Optional className prop for customization</li>
                </ul>
              </div>
              
              {/* Code Example */}
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { PageCard } from '@/components/layout/PageCard';

// Usage
<PageCard>
  <h1>Dashboard Home</h1>
  <p>Your content here</p>
</PageCard>

// With custom className
<PageCard className="max-w-4xl">
  <h1>Narrow Content</h1>
</PageCard>`}
                </code>
              </div>
            </div>

            {/* Header */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Header</h3>
              <p className="text-gray-600 mb-6">Simple header component with TSG logo and bottom border. Used on authentication and standalone pages.</p>
              
              {/* Visual Demo */}
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-4 font-semibold">Preview:</p>
                <div className="bg-white border-b border-gray-300">
                  <div className="flex items-center px-6 py-5">
                    <div className="w-32 h-8 bg-[#1B4A41] rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">TSG LOGO</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>TSGLogo component centered left</li>
                  <li>Bottom border with opacity</li>
                  <li>Responsive padding (px-6 on mobile, px-10 on desktop)</li>
                  <li>Full width layout</li>
                  <li>Used on auth pages, booking flows</li>
                </ul>
              </div>
              
              {/* Code Example */}
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { Header } from '@/components/layout/Header';

// Usage
<div>
  <Header />
  <main>
    {/* Your page content */}
  </main>
</div>`}
                </code>
              </div>
            </div>

            {/* BookingLayout */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Booking Layout</h3>
              <p className="text-gray-600 mb-6">Full-page layout wrapper for booking flows and public-facing pages. Includes header with logo and centered content area.</p>
              
              {/* Visual Demo */}
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-4 font-semibold">Preview:</p>
                <div className="bg-stone-50 rounded-lg overflow-hidden">
                  {/* Header */}
                  <div className="border-b border-stone-300 bg-white">
                    <div className="px-6 py-3">
                      <div className="w-24 h-6 bg-[#1B4A41] rounded"></div>
                    </div>
                  </div>
                  {/* Content */}
                  <div className="flex flex-col items-center gap-8 p-8">
                    <div className="w-full max-w-2xl bg-white rounded-lg border border-gray-200 p-6">
                      <div className="text-center text-sm text-gray-600">Centered content area</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Stone-50 background (different from dashboard)</li>
                  <li>Header with TSGLogo and bottom border</li>
                  <li>Centered content area with gap-20 spacing</li>
                  <li>Large horizontal padding (px-[140px])</li>
                  <li>Vertical padding (pt-20, pb-28)</li>
                  <li>Children prop for flexible content</li>
                </ul>
              </div>
              
              {/* Code Example */}
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { BookingLayout } from '@/components/layout/booking-layout';

// Usage
export default function BookingPage() {
  return (
    <BookingLayout>
      <h1>Book a Service</h1>
      <form>{/* Booking form */}</form>
    </BookingLayout>
  );
}`}
                </code>
              </div>
            </div>

            {/* DashboardNav */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Dashboard Nav</h3>
              <p className="text-gray-600 mb-6">Comprehensive navigation component with desktop top bar and mobile bottom navigation. Includes user dropdown, settings access, and responsive layout.</p>
              
              {/* Visual Demo */}
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-4 font-semibold">Preview (Desktop):</p>
                {/* Desktop Nav */}
                <div className="bg-white rounded-lg border border-gray-200 mb-4">
                  <div className="flex items-center justify-between px-4 h-16">
                    <div className="w-24 h-6 bg-[#1B4A41] rounded"></div>
                    <div className="flex items-center gap-1">
                      {['Home', 'Company', 'Sites', 'Reports', 'Support', 'Transactions'].map((item) => (
                        <div key={item} className="flex flex-col items-center justify-center min-w-[112px] min-h-[71px] rounded-lg hover:bg-gray-100">
                          <div className="w-5 h-5 bg-gray-400 rounded mb-1"></div>
                          <span className="text-xs text-gray-600">{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-[#1B4A41] rounded-full"></div>
                      <div className="w-8 h-8 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-4 font-semibold mt-6">Preview (Mobile):</p>
                {/* Mobile Nav */}
                <div className="max-w-md mx-auto">
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex justify-center gap-3">
                    {['Home', 'Company', 'Sites', 'Reports', 'More'].map((item) => (
                      <div key={item} className="flex flex-col items-center p-4 rounded-lg">
                        <div className="w-6 h-6 bg-gray-400 rounded mb-1"></div>
                        <span className="text-xs text-gray-600">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Responsive: desktop top bar, mobile bottom nav</li>
                  <li>Main nav items: Home, Company, Sites, Reports</li>
                  <li>"More" menu with Support and Transactions</li>
                  <li>User dropdown with profile link and sign out</li>
                  <li>Settings icon button</li>
                  <li>Active state highlighting with TSG colors</li>
                  <li>Hover/active states with beige background</li>
                  <li>Sign out functionality integrated</li>
                  <li>Mobile: fixed bottom positioning</li>
                </ul>
              </div>
              
              {/* Code Example */}
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { DashboardNav } from '@/components/layout/DashboardNav';

// Usage in dashboard layout
export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F7F6F1]">
      <DashboardNav />
      <main className="pb-24 lg:pb-0">
        {children}
      </main>
    </div>
  );
}`}
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* MANAGE SUBSCRIPTION COMPONENTS SECTION */}
        <section>
          <h2 className="text-3xl font-bold text-[#232521] mb-6">Manage Subscription</h2>
          <p className="text-gray-600 mb-6">Complete subscription management flow including cancellation with reason collection and downsell offer</p>
          
          <div className="space-y-8">
            {/* ManageSubscriptionModal */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Manage Subscription Modal</h3>
              <p className="text-gray-600 mb-6">Main subscription management modal showing current plan, payment method, and options to upgrade or cancel.</p>
              
              {/* Visual Demo */}
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-4 font-semibold">Interactive Demo:</p>
                <div className="flex justify-center">
                  <PrimaryButton onClick={() => setIsManageSubscriptionOpen(true)}>
                    Open Manage Subscription Modal
                  </PrimaryButton>
                </div>
              </div>
              
              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Displays current plan tier and billing cycle</li>
                  <li>Shows current payment method</li>
                  <li>"Update payment method" button</li>
                  <li>"Cancel subscription" button (opens CancelConfirmModal)</li>
                  <li>ESC key and backdrop click to close</li>
                  <li>Body scroll lock when open</li>
                </ul>
              </div>
              
              {/* Code Example */}
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import ManageSubscriptionModal from '@/components/manage/ManageSubscriptionModal';

// Usage
<ManageSubscriptionModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onCancelClick={() => {
    setIsOpen(false);
    setShowCancelModal(true);
  }}
  onUpdatePaymentClick={async () => {
    // Handle payment update
  }}
  currentPaymentMethod="Visa •••• 4242"
/>`}
                </code>
              </div>
            </div>

            {/* CancelConfirmModal */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Cancel Confirmation Modal</h3>
              <p className="text-gray-600 mb-6">First step in cancellation flow. Collects user's reason for canceling with radio button selection.</p>
              
              {/* Visual Demo */}
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-4 font-semibold">Preview:</p>
                <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg border border-gray-200">
                  {/* Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <h4 className="text-xl font-bold text-[#232521]">Are you sure you want to cancel?</h4>
                      <button className="text-gray-500 hover:text-gray-800">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                    <p className="text-gray-600 mt-3 text-sm">We'd hate to see you go. Care to share why you're canceling?</p>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6 space-y-2">
                    {['Too expensive for my budget', "I'm not seeing enough value", 'I no longer need website maintenance', "I'm switching to another provider"].map((reason, idx) => (
                      <div key={idx} className="flex items-center p-3 bg-white border border-gray-200 rounded">
                        <div className="w-4 h-4 rounded-full border-2 border-gray-400 mr-3"></div>
                        <span className="text-sm font-medium text-gray-700">{reason}</span>
                      </div>
                    ))}
                    <div className="text-center text-xs text-gray-500 py-2">+ 4 more reasons...</div>
                  </div>
                  
                  {/* Footer */}
                  <div className="p-6 border-t border-gray-200 flex gap-4">
                    <button className="flex-1 px-6 py-2 border-2 border-[#1B4A41] text-[#1B4A41] rounded-full font-semibold text-sm">
                      Keep subscription
                    </button>
                    <button className="flex-1 px-6 py-2 bg-red-600 text-white rounded-full font-semibold text-sm opacity-50">
                      Continue with cancellation
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>8 cancellation reason options with radio selection</li>
                  <li>Selected state with light green background (#F0F5F0)</li>
                  <li>Continue button disabled until reason selected</li>
                  <li>"Keep subscription" and "Continue with cancellation" actions</li>
                  <li>ESC key and backdrop click to close</li>
                  <li>Resets selection when closed</li>
                  <li>Passes selected reason to parent via onContinue callback</li>
                </ul>
              </div>
              
              {/* Code Example */}
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import CancelConfirmModal from '@/components/manage/CancelConfirmModal';

// Usage
<CancelConfirmModal
  isOpen={showCancelModal}
  onClose={() => setShowCancelModal(false)}
  onKeepSubscription={() => {
    setShowCancelModal(false);
    // Keep subscription logic
  }}
  onContinue={(reason) => {
    console.log('Cancellation reason:', reason);
    setShowCancelModal(false);
    setShowDownsellModal(true);
  }}
/>`}
                </code>
              </div>
            </div>

            {/* SafetyNetDownsellModal */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Safety Net Downsell Modal</h3>
              <p className="text-gray-600 mb-6">Second step in cancellation flow. Offers reduced-price "Safety Net Plan" ($299/year) before full cancellation.</p>
              
              {/* Visual Demo */}
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-4 font-semibold">Preview:</p>
                <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg border border-gray-200">
                  {/* Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <h4 className="text-xl font-bold text-[#232521]">Before you cancel... want a lighter plan?</h4>
                      <button className="text-gray-500 hover:text-gray-800">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                    <p className="text-gray-600 mt-2 text-sm">Keep the essentials that prevent 'site down' disasters, without paying for full maintenance.</p>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6 space-y-6">
                    {/* Offer Banner */}
                    <div className="bg-[#F7F6F1] rounded-lg p-4 text-center">
                      <h5 className="text-lg font-bold text-[#232521]">Switch to the Safety Net Plan for $299/year</h5>
                    </div>
                    
                    <p className="text-sm font-semibold text-gray-700">Renew on Jan 6, 2027 at $299, instead of $679</p>
                    
                    {/* Feature Comparison */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h6 className="font-semibold text-base mb-3 flex items-center text-green-700">
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                          You'll still get
                        </h6>
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex items-start">
                            <svg className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                            Daily cloud backups (50-day retention)
                          </li>
                          <li className="flex items-start">
                            <svg className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                            Security monitoring with alerts
                          </li>
                          <li className="flex items-start">
                            <svg className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                            Emergency restore coverage
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h6 className="font-semibold text-base mb-3 flex items-center text-red-700">
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/></svg>
                          You won't get
                        </h6>
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex items-start">
                            <svg className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/></svg>
                            Monthly WordPress updates
                          </li>
                          <li className="flex items-start">
                            <svg className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/></svg>
                            Included support hours
                          </li>
                          <li className="flex items-start">
                            <svg className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/></svg>
                            Monthly analytics reports
                          </li>
                        </ul>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-600 leading-relaxed">
                      By canceling, you'll lose backup retention, security monitoring, and emergency restore coverage.
                    </p>
                  </div>
                  
                  {/* Footer */}
                  <div className="p-6 border-t border-gray-200 flex gap-4">
                    <button className="flex-1 px-6 py-2 border-2 border-[#1B4A41] text-[#1B4A41] rounded-full font-semibold text-sm">
                      Claim Offer and Switch
                    </button>
                    <button className="flex-1 px-6 py-2 bg-red-600 text-white rounded-full font-semibold text-sm">
                      Cancel My Subscription
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>$299/year Safety Net Plan downsell offer</li>
                  <li>Side-by-side feature comparison (included vs removed)</li>
                  <li>Check icons (green) for included features</li>
                  <li>X icons (red) for removed features</li>
                  <li>Renewal date and price comparison display</li>
                  <li>Two CTAs: "Claim Offer" or "Cancel Subscription"</li>
                  <li>Warning about losing coverage after cancellation</li>
                  <li>ESC key and backdrop click to close</li>
                </ul>
              </div>
              
              {/* Code Example */}
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import SafetyNetDownsellModal from '@/components/manage/SafetyNetDownsellModal';

// Usage
<SafetyNetDownsellModal
  isOpen={showDownsellModal}
  onClose={() => setShowDownsellModal(false)}
  onClaimOffer={() => {
    // Switch to Safety Net Plan
    console.log('Switching to Safety Net Plan');
  }}
  onCancelSubscription={() => {
    // Proceed with full cancellation
    console.log('Canceling subscription');
  }}
  currentPrice="$679/year"
  renewalDate="Jan 6, 2027"
/>`}
                </code>
              </div>
            </div>

            {/* Flow Diagram */}
            <div className="bg-[#F7F6F1] rounded-lg p-8 border border-gray-200">
              <h3 className="text-lg font-semibold text-[#232521] mb-4">Complete Cancellation Flow</h3>
              <div className="flex items-center justify-center gap-8 max-w-4xl mx-auto flex-wrap">
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#1B4A41] rounded-full flex items-center justify-center text-white font-bold text-xl mb-2 mx-auto">1</div>
                  <p className="text-sm font-medium text-[#232521]">Manage Subscription</p>
                  <p className="text-xs text-gray-600">User clicks "Cancel"</p>
                </div>
                <div className="text-2xl text-gray-400">→</div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#1B4A41] rounded-full flex items-center justify-center text-white font-bold text-xl mb-2 mx-auto">2</div>
                  <p className="text-sm font-medium text-[#232521]">Cancel Confirm</p>
                  <p className="text-xs text-gray-600">Select reason</p>
                </div>
                <div className="text-2xl text-gray-400">→</div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#1B4A41] rounded-full flex items-center justify-center text-white font-bold text-xl mb-2 mx-auto">3</div>
                  <p className="text-sm font-medium text-[#232521]">Safety Net Offer</p>
                  <p className="text-xs text-gray-600">$299 downsell</p>
                </div>
                <div className="text-2xl text-gray-400">→</div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#9be382] rounded-full flex items-center justify-center text-[#232521] font-bold text-2xl mb-2 mx-auto">✓</div>
                  <p className="text-sm font-medium text-[#232521]">Complete</p>
                  <p className="text-xs text-gray-600">Kept or canceled</p>
                </div>
              </div>
              <div className="mt-6 text-center text-xs text-gray-600">
                <p><strong>Note:</strong> Users can exit at any step by clicking "Keep subscription" or the X button</p>
              </div>
            </div>
          </div>
        </section>

        {/* UPGRADE FLOW MODALS SECTION */}
        <section>
          <h2 className="text-3xl font-bold text-[#232521] mb-6">Upgrade Flow Modals</h2>
          <p className="text-gray-600 mb-6">Interactive modals for upgrading subscription plans with plan selection and confirmation flow</p>
          
          <div className="bg-white rounded-lg p-8 border border-gray-200">
            <h3 className="text-xl font-semibold text-[#232521] mb-4">Upgrade Flow Demo</h3>
            <p className="text-gray-600 mb-6">Test the complete upgrade flow from plan selection to confirmation.</p>
            
            {/* Current Plan Display */}
            <div className="mb-6 p-4 bg-[#F7F6F1] rounded-lg">
              <p className="text-sm font-semibold text-[#232521] mb-2">Current Plan:</p>
              <p className="text-lg font-bold text-[#1B4A41] capitalize">{currentUserTier}</p>
            </div>
            
            {/* Demo Button */}
            <div className="flex justify-center">
              <PrimaryButton onClick={() => setIsPlanSelectionOpen(true)}>
                Open Plan Selection
              </PrimaryButton>
            </div>
            
            {/* Key Features */}
            <div className="mt-6">
              <p className="text-sm font-semibold text-[#232521] mb-2">Flow Steps:</p>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>User clicks "Open Plan Selection" to view available plans</li>
                <li>PlanSelectionModal displays Essential, Advanced, and Premium options</li>
                <li>User selects a plan (higher tier than current)</li>
                <li>UpgradeConfirmation modal shows upgrade details and pricing</li>
                <li>User confirms upgrade and payment is processed</li>
              </ol>
            </div>
            
            {/* Code Example */}
            <div className="mt-6 bg-gray-50 rounded p-4">
              <code className="text-xs text-gray-700 block whitespace-pre">
{`// Import components
import PlanSelectionModal from '@/components/upgrade/PlanSelectionModal';
import UpgradeConfirmation from '@/components/upgrade/UpgradeConfirmation';

// State management
const [isPlanSelectionOpen, setIsPlanSelectionOpen] = useState(false);
const [isUpgradeConfirmationOpen, setIsUpgradeConfirmationOpen] = useState(false);
const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
const [currentUserTier] = useState<Tier>('essential');

// Usage
<PlanSelectionModal
  isOpen={isPlanSelectionOpen}
  onClose={() => setIsPlanSelectionOpen(false)}
  currentTier={currentUserTier}
  onSelectPlan={(tier) => {
    setSelectedTier(tier);
    setIsPlanSelectionOpen(false);
    setIsUpgradeConfirmationOpen(true);
  }}
/>

<UpgradeConfirmation
  isOpen={isUpgradeConfirmationOpen}
  onClose={() => setIsUpgradeConfirmationOpen(false)}
  currentTier={currentUserTier}
  newTier={selectedTier || 'advanced'}
  userId="test-user-123"
  onSuccess={() => {
    console.log('Upgrade successful!');
    setIsUpgradeConfirmationOpen(false);
  }}
  onError={(error) => {
    console.error('Upgrade failed:', error);
  }}
/>`}
              </code>
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
        isOpen={isManageSubscriptionOpen}
        onClose={() => setIsManageSubscriptionOpen(false)}
        onCancelClick={() => {
          console.log('Cancel subscription clicked');
        }}
        onUpdatePaymentClick={async () => {
          console.log('Update payment clicked');
        }}
        currentPaymentMethod="Visa •••• 4242"
      />

      {/* Auth Component Modals */}
      {showSignInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowSignInModal(false)}>
          <div className="relative bg-[#FAF9F5] rounded-lg p-8 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowSignInModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 z-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <SignInForm />
          </div>
        </div>
      )}

      {showSignUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowSignUpModal(false)}>
          <div className="relative bg-[#FAF9F5] rounded-lg p-8 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowSignUpModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 z-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <SignUpForm />
          </div>
        </div>
      )}

      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowForgotPasswordModal(false)}>
          <div className="relative bg-[#FAF9F5] rounded-lg p-8 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowForgotPasswordModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 z-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <ForgotPasswordForm />
          </div>
        </div>
      )}

      {/* Upgrade Flow Modals */}
      <PlanSelectionModal
        isOpen={isPlanSelectionOpen}
        onClose={() => setIsPlanSelectionOpen(false)}
        currentTier={currentUserTier}
        onSelectPlan={(tier) => {
          console.log('Plan selected:', tier);
          setSelectedTier(tier);
          setIsPlanSelectionOpen(false);
          setIsUpgradeConfirmationOpen(true);
        }}
      />

      {selectedTier && (
        <UpgradeConfirmation
          isOpen={isUpgradeConfirmationOpen}
          onClose={() => setIsUpgradeConfirmationOpen(false)}
          currentTier={currentUserTier}
          newTier={selectedTier}
          userId="test-user-123"
          onSuccess={() => {
            console.log('Upgrade successful!');
            setIsUpgradeConfirmationOpen(false);
            setSelectedTier(null);
          }}
          onError={(errorMessage) => {
            console.error('Upgrade failed:', errorMessage);
          }}
        />
      )}
    </div>
  );
}
