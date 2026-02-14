'use client';

import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { 
  Home, 
  Building, 
  MonitorSmartphone, 
  BarChart3, 
  Menu, 
  Settings, 
  ChevronDown 
} from 'lucide-react';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { TertiaryButton } from '@/components/ui/TertiaryButton';
import { Input } from '@/components/ui/input';
import { NotificationToast } from '@/components/ui/NotificationToast';
import ManageSubscriptionModal from '@/components/manage/ManageSubscriptionModal';
// import { UpdatePaymentMethodModal } from '@/components/manage/UpdatePaymentMethodModal'; // Removed - requires Stripe Elements context
import { UpcomingMeetingCard } from '@/components/dashboard/UpcomingMeetingCard';
import { NoMeetingsCard } from '@/components/dashboard/NoMeetingsCard';
import { RecentReportsCard } from '@/components/dashboard/RecentReportsCard';
import { ReportsTable, Report } from '@/components/reports/ReportsTable';
import { TransactionsTable, Transaction } from '@/components/transactions/TransactionsTable';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import PlanSelectionModal from '@/components/upgrade/PlanSelectionModal';
import UpgradeConfirmation from '@/components/upgrade/UpgradeConfirmation';
import { PricingCard } from '@/components/upgrade/PricingCard';
import { TSGLogo } from '@/components/ui/logo';
import { Meeting } from '@/types/user';
import SupportTicketCard from '@/components/support/SupportTicketCard';
import type { SupportTicket } from '@/types/support';
import HorizontalTabs from '@/components/ui/HorizontalTabs';
import PastSupportTicketsTable from '@/components/support/PastSupportTicketsTable';
import { StickyBottomBar } from '@/components/ui/StickyBottomBar';
import { AllPagesOverlay } from '@/components/ui/AllPagesOverlay';

// Define Tier type for upgrade flow
type Tier = 'essential' | 'advanced' | 'premium' | 'safety-net';

export default function DesignSystemPage() {
  // State for interactive demos
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [isManageSubscriptionOpen, setIsManageSubscriptionOpen] = useState(false);
  // const [isUpdatePaymentMethodOpen, setIsUpdatePaymentMethodOpen] = useState(false); // Removed - modal requires Stripe context
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

  // State for Horizontal Tabs demo
  const [activeTab, setActiveTab] = useState('active');

  // State for AllPagesOverlay demo
  const [isAllPagesOverlayOpen, setIsAllPagesOverlayOpen] = useState(false);

  // Mock data for UpcomingMeetingCard
  const mockMeeting: Meeting = {
    id: "mock-meeting-1",
    title: "Strategy Planning Session",
    date: Timestamp.now(),
    meetingUrl: "https://meet.google.com/abc-defg-hij",
    type: "strategy-session",
    status: "scheduled"
  };

  // Mock data for ReportsTable
  const mockReports: Report[] = [
    {
      id: "report-1",
      title: "TSG Performance Report - Jan 2025",
      subtitle: "Performance Checkup",
      createdDate: "01-02-2025",
      updatedDate: "12-25-2025",
      fileUrl: "https://example.com/report-jan-2025.pdf"
    },
    {
      id: "report-2",
      title: "TSG Performance Report - Feb 2025",
      subtitle: "Performance Checkup",
      createdDate: "02-02-2025",
      updatedDate: "12-25-2025",
      fileUrl: "https://example.com/report-feb-2025.pdf"
    },
    {
      id: "report-3",
      title: "TSG Performance Report - Mar 2025",
      subtitle: "Performance Checkup",
      createdDate: "03-02-2025",
      updatedDate: "12-25-2025",
      fileUrl: "https://example.com/report-mar-2025.pdf"
    }
  ];

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [transactionSortOrder, setTransactionSortOrder] = useState<'asc' | 'desc'>('desc');

  // Mock data for TransactionsTable
  const mockTransactions: Transaction[] = [
    {
      id: "txn-1",
      orderId: "#BCC-001205",
      description: "Genie Maintenance - Essential Plan",
      date: "06-01-2025",
      amount: "$209.00",
      status: "completed",
      paymentMethod: "•••• 3245",
      invoiceUrl: "https://example.com/invoice-001205.pdf"
    },
    {
      id: "txn-2",
      orderId: "#BCC-001202",
      description: "Genie Maintenance - Essential Plan",
      date: "05-01-2025",
      amount: "$209.00",
      status: "failed",
      paymentMethod: "•••• 3245",
      invoiceUrl: "https://example.com/invoice-001202.pdf"
    },
    {
      id: "txn-3",
      orderId: "#BCC-001198",
      description: "Genie Maintenance - Essential Plan",
      date: "04-01-2025",
      amount: "$209.00",
      status: "completed",
      paymentMethod: "•••• 3245",
      invoiceUrl: "https://example.com/invoice-001198.pdf"
    }
  ];

  // Mock data for SupportTicketCard
  const mockSupportTickets: SupportTicket[] = [
    {
      ticketId: "#TSG-1046",
      userId: "user-123",
      createdByUserId: "user-123",
      title: "Cannot update billing address",
      description: "I'm trying to update my billing address but the save button is not working.",
      status: "Open",
      priority: "Medium",
      category: "Bug Report",
      channel: "Support Hub",
      assignedAgentName: "Sarah M.",
      createdAt: Timestamp.fromDate(new Date('2026-01-15T10:00:00')),
      lastUpdatedAt: Timestamp.fromDate(new Date(Date.now() - 2 * 60 * 60 * 1000)), // 2 hours ago
    },
    {
      ticketId: "#TSG-1047",
      userId: "user-123",
      createdByUserId: "user-123",
      title: "Need help with SEO optimization",
      description: "Can someone help me optimize my site for search engines?",
      status: "In Progress",
      priority: "High",
      category: "Question",
      channel: "Email",
      assignedAgentName: "Marcus W.",
      createdAt: Timestamp.fromDate(new Date('2026-01-14T14:30:00')),
      lastUpdatedAt: Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 60 * 1000)), // 5 hours ago
    },
    {
      ticketId: "#TSG-1048",
      userId: "user-123",
      createdByUserId: "user-123",
      title: "Request for custom feature",
      description: "Would love to see a booking system integration.",
      status: "Awaiting Customer",
      priority: "Low",
      category: "Feature Request",
      channel: "Support Hub",
      assignedAgentName: "John D.",
      createdAt: Timestamp.fromDate(new Date('2026-01-13T09:00:00')),
      lastUpdatedAt: Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)), // 1 day ago
    },
    {
      ticketId: "#TSG-1049",
      userId: "user-123",
      createdByUserId: "user-123",
      title: "Site is loading slowly",
      description: "My homepage takes over 10 seconds to load.",
      status: "Resolved",
      priority: "Critical",
      category: "Bug Report",
      channel: "Phone",
      assignedAgentName: "Sarah M.",
      createdAt: Timestamp.fromDate(new Date('2026-01-10T11:00:00')),
      lastUpdatedAt: Timestamp.fromDate(new Date('2026-01-12T15:00:00')),
      resolvedAt: Timestamp.fromDate(new Date('2026-01-12T15:00:00')),
    },
    {
      ticketId: "#TSG-1050",
      userId: "user-123",
      createdByUserId: "user-123",
      title: "Form submission issue fixed",
      description: "Contact form wasn't sending emails.",
      status: "Closed",
      priority: "High",
      category: "Bug Report",
      channel: "Support Hub",
      assignedAgentName: "Marcus W.",
      createdAt: Timestamp.fromDate(new Date('2026-01-08T08:00:00')),
      lastUpdatedAt: Timestamp.fromDate(new Date('2026-01-09T16:00:00')),
      closedAt: Timestamp.fromDate(new Date('2026-01-09T16:00:00')),
    },
  ];

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
          <p className="text-gray-600 mb-8">Complete TradeSiteGenie color tokens for consistent branding and UI design</p>
          
          <h3 className="text-2xl font-semibold text-[#232521] mb-6">Component Tokens</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Primary BG */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div 
                className="w-full h-[150px] rounded-lg mb-6" 
                style={{ backgroundColor: '#9BE382' }}
              />
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-[#232521]">Primary BG</h3>
                <p className="text-lg text-[#545552]">#9BE382</p>
                <p className="text-xs text-gray-600">Brand accent color for buttons, CTAs, and highlights</p>
              </div>
            </div>

            {/* Primary Text */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div 
                className="w-full h-[150px] rounded-lg mb-6" 
                style={{ backgroundColor: '#1B4A41' }}
              />
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-[#232521]">Primary Text</h3>
                <p className="text-lg text-[#545552]">#1B4A41</p>
                <p className="text-xs text-gray-600">Main brand color for headings and primary text</p>
              </div>
            </div>

            {/* Secondary Text and Stroke */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div 
                className="w-full h-[150px] rounded-lg mb-6" 
                style={{ backgroundColor: '#1B4A41' }}
              />
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-[#232521]">Secondary Text and Stroke</h3>
                <p className="text-lg text-[#545552]">#1B4A41</p>
                <p className="text-xs text-gray-600">Secondary brand elements and borders</p>
              </div>
            </div>

            {/* Tertiary Text */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div 
                className="w-full h-[150px] rounded-lg mb-6" 
                style={{ backgroundColor: '#1B4A41' }}
              />
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-[#232521]">Tertiary Text</h3>
                <p className="text-lg text-[#545552]">#1B4A41</p>
                <p className="text-xs text-gray-600">Additional text hierarchy level</p>
              </div>
            </div>

            {/* Container Primary Text */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div 
                className="w-full h-[150px] rounded-lg mb-6" 
                style={{ backgroundColor: '#232521' }}
              />
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-[#232521]">Container Primary Text</h3>
                <p className="text-lg text-[#545552]">#232521</p>
                <p className="text-xs text-gray-600">Main text color for body content and paragraphs</p>
              </div>
            </div>

            {/* Container Secondary Text */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div 
                className="w-full h-[150px] rounded-lg mb-6" 
                style={{ backgroundColor: '#545552' }}
              />
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-[#232521]">Container Secondary Text</h3>
                <p className="text-lg text-[#545552]">#545552</p>
                <p className="text-xs text-gray-600">Secondary text and muted content</p>
              </div>
            </div>

            {/* Container Tertiary Text */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div 
                className="w-full h-[150px] rounded-lg mb-6 border border-gray-200" 
                style={{ backgroundColor: '#FFFFFF' }}
              />
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-[#232521]">Container Tertiary Text</h3>
                <p className="text-lg text-[#545552]">#FFFFFF</p>
                <p className="text-xs text-gray-600">White text for dark backgrounds</p>
              </div>
            </div>

            {/* Secondary BG */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div 
                className="w-full h-[150px] rounded-lg mb-6 border border-gray-200" 
                style={{ backgroundColor: '#FFFFFF' }}
              />
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-[#232521]">Secondary BG</h3>
                <p className="text-lg text-[#545552]">#FFFFFF</p>
                <p className="text-xs text-gray-600">White background for cards and containers</p>
              </div>
            </div>

            {/* Input Default */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div 
                className="w-full h-[150px] rounded-lg mb-6 border border-gray-200" 
                style={{ backgroundColor: '#FFFFFF' }}
              />
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-[#232521]">Input Default</h3>
                <p className="text-lg text-[#545552]">#FFFFFF</p>
                <p className="text-xs text-gray-600">Default input field background</p>
              </div>
            </div>

            {/* Input Active */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div 
                className="w-full h-[150px] rounded-lg mb-6" 
                style={{ backgroundColor: '#51A2FF' }}
              />
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-[#232521]">Input Active</h3>
                <p className="text-lg text-[#545552]">#51A2FF</p>
                <p className="text-xs text-gray-600">Active/focused input field state</p>
              </div>
            </div>

            {/* Outline */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div 
                className="w-full h-[150px] rounded-lg mb-6" 
                style={{ backgroundColor: 'rgba(111, 121, 122, 0.4)' }}
              />
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-[#232521]">Outline</h3>
                <p className="text-lg text-[#545552]">#6F797A at 40%</p>
                <p className="text-xs text-gray-600">Border color for inputs, cards, and dividers</p>
              </div>
            </div>

            {/* Shadow */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div 
                className="w-full h-[150px] rounded-lg mb-6" 
                style={{ backgroundColor: 'rgba(35, 37, 33, 0.4)' }}
              />
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-[#232521]">Shadow</h3>
                <p className="text-lg text-[#545552]">#232521 at 40%</p>
                <p className="text-xs text-gray-600">Drop shadow and elevation effects</p>
              </div>
            </div>

            {/* Logo Color */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div 
                className="w-full h-[150px] rounded-lg mb-6" 
                style={{ backgroundColor: '#4E0009' }}
              />
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-[#232521]">Logo Color</h3>
                <p className="text-lg text-[#545552]">#4E0009</p>
                <p className="text-xs text-gray-600">Official TradeSiteGenie logo brand color</p>
              </div>
            </div>
          </div>

          {/* SEMANTIC TOKENS SUBSECTION */}
          <div className="mt-12">
            <h3 className="text-2xl font-semibold text-[#232521] mb-3">
              Semantic Tokens
            </h3>
            <p className="text-gray-600 mb-6">
              Contextual colors for UI states, feedback, and interactive elements
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Success Status */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div 
                  className="w-full h-[150px] rounded-lg mb-6" 
                  style={{ backgroundColor: '#00A63E' }}
                />
                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold text-[#232521]">Success Status</h3>
                  <p className="text-lg text-[#545552]">#00A63E</p>
                  <p className="text-xs text-gray-600">Used for positive feedback, completed actions, and success confirmations</p>
                </div>
              </div>

              {/* Warning Status */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div 
                  className="w-full h-[150px] rounded-lg mb-6" 
                  style={{ backgroundColor: '#F0B100' }}
                />
                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold text-[#232521]">Warning Status</h3>
                  <p className="text-lg text-[#545552]">#F0B100</p>
                  <p className="text-xs text-gray-600">Used for caution messages, important notices, and pending states</p>
                </div>
              </div>

              {/* Critical Status */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div 
                  className="w-full h-[150px] rounded-lg mb-6" 
                  style={{ backgroundColor: '#E7000B' }}
                />
                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold text-[#232521]">Critical Status</h3>
                  <p className="text-lg text-[#545552]">#E7000B</p>
                  <p className="text-xs text-gray-600">Used for error states, validation failures, and destructive actions</p>
                </div>
              </div>

              {/* Neutral Status */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div 
                  className="w-full h-[150px] rounded-lg mb-6" 
                  style={{ backgroundColor: '#B5B6B5' }}
                />
                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold text-[#232521]">Neutral Status</h3>
                  <p className="text-lg text-[#545552]">#B5B6B5</p>
                  <p className="text-xs text-gray-600">Used for neutral states, disabled elements, and inactive content</p>
                </div>
              </div>

              {/* Surface */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div 
                  className="w-full h-[150px] rounded-lg mb-6" 
                  style={{ backgroundColor: '#F7F6F1' }}
                />
                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold text-[#232521]">Surface</h3>
                  <p className="text-lg text-[#545552]">#F7F6F1</p>
                  <p className="text-xs text-gray-600">Primary background surface for main content areas</p>
                </div>
              </div>

              {/* Surface Container */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div 
                  className="w-full h-[150px] rounded-lg mb-6" 
                  style={{ backgroundColor: '#F7F6F1' }}
                />
                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold text-[#232521]">Surface Container</h3>
                  <p className="text-lg text-[#545552]">#F7F6F1</p>
                  <p className="text-xs text-gray-600">Default container background for cards and sections</p>
                </div>
              </div>

              {/* Surface Container Lowest */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div 
                  className="w-full h-[150px] rounded-lg mb-6 border border-gray-200" 
                  style={{ backgroundColor: '#FFFFFF' }}
                />
                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold text-[#232521]">Surface Container Lowest</h3>
                  <p className="text-lg text-[#545552]">#FFFFFF</p>
                  <p className="text-xs text-gray-600">Lowest elevation surface for base layer elements</p>
                </div>
              </div>

              {/* Surface Container Low */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div 
                  className="w-full h-[150px] rounded-lg mb-6" 
                  style={{ backgroundColor: '#FAF9F5' }}
                />
                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold text-[#232521]">Surface Container Low</h3>
                  <p className="text-lg text-[#545552]">#FAF9F5</p>
                  <p className="text-xs text-gray-600">Low elevation surface for subtle container hierarchy</p>
                </div>
              </div>

              {/* Surface Container High */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div 
                  className="w-full h-[150px] rounded-lg mb-6" 
                  style={{ backgroundColor: '#F2F0E7' }}
                />
                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold text-[#232521]">Surface Container High</h3>
                  <p className="text-lg text-[#545552]">#F2F0E7</p>
                  <p className="text-xs text-gray-600">High elevation surface for prominent containers</p>
                </div>
              </div>

              {/* Surface Container Highest */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div 
                  className="w-full h-[150px] rounded-lg mb-6" 
                  style={{ backgroundColor: 'rgba(217, 213, 197, 0.4)' }}
                />
                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold text-[#232521]">Surface Container Highest</h3>
                  <p className="text-lg text-[#545552]">rgba(217, 213, 197, 0.4)</p>
                  <p className="text-xs text-gray-600">Highest elevation surface for modal overlays and top-layer elements</p>
                </div>
              </div>

              {/* Surface Primary Text */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div 
                  className="w-full h-[150px] rounded-lg mb-6" 
                  style={{ backgroundColor: '#232521' }}
                />
                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold text-[#232521]">Surface Primary Text</h3>
                  <p className="text-lg text-[#545552]">#232521</p>
                  <p className="text-xs text-gray-600">Primary text color on surface backgrounds</p>
                </div>
              </div>

              {/* Surface Secondary Text */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div 
                  className="w-full h-[150px] rounded-lg mb-6" 
                  style={{ backgroundColor: '#545552' }}
                />
                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold text-[#232521]">Surface Secondary Text</h3>
                  <p className="text-lg text-[#545552]">#545552</p>
                  <p className="text-xs text-gray-600">Secondary text color for supporting content</p>
                </div>
              </div>

              {/* Surface Tertiary Text */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div 
                  className="w-full h-[150px] rounded-lg mb-6 border border-gray-200" 
                  style={{ backgroundColor: '#FFFFFF' }}
                />
                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold text-[#232521]">Surface Tertiary Text</h3>
                  <p className="text-lg text-[#545552]">#FFFFFF</p>
                  <p className="text-xs text-gray-600">White text for use on dark backgrounds and surfaces</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TYPOGRAPHY SECTION */}
        <section>
          <h2 className="text-3xl font-bold text-[#232521] mb-6">Typography</h2>
          <p className="text-gray-600 mb-8">Consistent text styles for headings, body text, and UI elements</p>
          
          {/* HEADINGS SUBSECTION */}
          <div className="mb-12">
            <h3 className="text-2xl font-semibold text-[#232521] mb-6">Headings</h3>
            <div className="space-y-6">
              
              {/* Display Hero Large */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="text-6xl font-extrabold text-[#232521] leading-tight tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    The quick brown fox jumps
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Display Hero Large</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">64px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">800</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">120%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-6xl font-extrabold leading-tight tracking-tight
                  </code>
                </div>
              </div>

              {/* Display Hero Medium */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="text-5xl font-extrabold text-[#232521] leading-tight tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    The quick brown fox jumps
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Display Hero Medium</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">56px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">800</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">120%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-5xl font-extrabold leading-tight tracking-tight
                  </code>
                </div>
              </div>

              {/* Display Hero Small */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="text-5xl font-extrabold text-[#232521] leading-tight tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    The quick brown fox jumps over
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Display Hero Small</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">48px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">800</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">120%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-5xl font-extrabold leading-tight tracking-tight
                  </code>
                </div>
              </div>

              {/* Headline Page Large */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="text-4xl font-extrabold text-[#232521] leading-tight tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    The quick brown fox jumps over the lazy dog
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Headline Page Large</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">36px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">800</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">120%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-4xl font-extrabold leading-tight tracking-tight
                  </code>
                </div>
              </div>

              {/* Headline Section Large */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="text-3xl font-extrabold text-[#232521] leading-tight tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    The quick brown fox jumps over the lazy dog
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Headline Section Large</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">32px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">800</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">120%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-3xl font-extrabold leading-tight tracking-tight
                  </code>
                </div>
              </div>

              {/* Headline Page Medium */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="text-3xl font-extrabold text-[#232521] leading-tight tracking-tight" style={{ fontFamily: 'Manrope, sans-serif', fontSize: '28px' }}>
                    The quick brown fox jumps over the lazy dog
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Headline Page Medium</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">28px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">800</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">120%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-[28px] font-extrabold leading-tight tracking-tight
                  </code>
                </div>
              </div>

              {/* Headline Section Medium */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="text-2xl font-extrabold text-[#232521] leading-tight tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    The quick brown fox jumps over the lazy dog
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Headline Section Medium</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">24px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">800</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">120%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-2xl font-extrabold leading-tight tracking-tight
                  </code>
                </div>
              </div>

            </div>
          </div>

          {/* BODY TEXT SUBSECTION */}
          <div className="mb-12">
            <h3 className="text-2xl font-semibold text-[#232521] mb-6">Body Text</h3>
            <div className="space-y-6">
              
              {/* Body Large */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="text-lg text-[#232521] leading-relaxed">
                    The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Body Large</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">18px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">400</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">150%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-lg leading-relaxed
                  </code>
                </div>
              </div>

              {/* Body Large Strong */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="text-lg font-bold text-[#232521] leading-relaxed">
                    The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Body Large Strong</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">18px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">700</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">150%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-lg font-bold leading-relaxed
                  </code>
                </div>
              </div>

              {/* Body Medium */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="text-base text-[#232521] leading-relaxed">
                    The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Body Medium</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">16px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">400</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">150%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-base leading-relaxed
                  </code>
                </div>
              </div>

              {/* Body Table */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="text-xs text-[#232521] leading-relaxed" style={{ fontSize: '13px' }}>
                    The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Body Table</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">15px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">400</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">150%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-[15px] leading-relaxed
                  </code>
                </div>
              </div>

              {/* Body Table Link */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="text-xs font-bold text-[#232521] leading-relaxed" style={{ fontSize: '13px' }}>
                    The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Body Table Link</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">15px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">700</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">150%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-[15px] font-bold leading-relaxed
                  </code>
                </div>
              </div>

            </div>
          </div>

          {/* UI TEXT SUBSECTION */}
          <div>
            <h3 className="text-2xl font-semibold text-[#232521] mb-6">UI Text</h3>
            <div className="space-y-6">
              
              {/* Title Page Sub */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="text-lg font-bold text-[#232521] leading-tight tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Title Page Sub
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Title Page Sub</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">18px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">700</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">120%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-lg font-bold leading-tight tracking-tight
                  </code>
                </div>
              </div>

              {/* Label Button */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="text-base font-bold text-[#232521] leading-relaxed">
                    Label Button
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Label Button</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">16px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">700</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">150%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-base font-bold leading-relaxed
                  </code>
                </div>
              </div>

              {/* Title Card */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="font-bold text-[#232521] leading-relaxed tracking-tight" style={{ fontFamily: 'Manrope, sans-serif', fontSize: '15px' }}>
                    Title Card
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Title Card</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">16px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">700</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">150%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-[15px] font-bold leading-relaxed tracking-tight
                  </code>
                </div>
              </div>

              {/* Label Field */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="text-sm font-semibold text-[#232521] leading-relaxed tracking-tight">
                    Label Field
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Label Field</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">14px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">600</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">150%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-sm font-semibold leading-relaxed tracking-tight
                  </code>
                </div>
              </div>

              {/* Label Placeholder */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="text-sm text-[#232521] leading-relaxed tracking-tight">
                    Label Placeholder
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Label Placeholder</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">14px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">400</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">150%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-sm leading-relaxed tracking-tight
                  </code>
                </div>
              </div>

              {/* Title Table Header */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="text-xs font-semibold text-[#232521] leading-relaxed tracking-tight" style={{ fontSize: '13px' }}>
                    Title Table Header
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Title Table Header</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">15px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">600</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">150%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-[15px] font-semibold leading-relaxed tracking-tight
                  </code>
                </div>
              </div>

              {/* Title Card Sub */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="text-xs font-medium text-[#232521] leading-tight tracking-tight" style={{ fontSize: '13px' }}>
                    Title Card Sub
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Title Card Sub</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">15px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">500</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">120%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-[15px] font-medium leading-tight tracking-tight
                  </code>
                </div>
              </div>

              {/* Label Badge */}
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="mb-6">
                  <p className="text-xs font-medium text-[#232521] leading-relaxed" style={{ fontSize: '13px' }}>
                    Label Badge
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Style Name</p>
                    <p className="font-semibold">Label Badge</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Size</p>
                    <p className="font-mono">15px</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Weight</p>
                    <p className="font-mono">500</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Line Height</p>
                    <p className="font-mono">150%</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Tailwind Classes:</p>
                  <code className="text-xs bg-gray-50 px-3 py-2 rounded block">
                    text-[15px] font-medium leading-relaxed
                  </code>
                </div>
              </div>

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

            {/* Horizontal Tabs */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Horizontal Tabs</h3>
              <p className="text-gray-600 mb-6">Navigation tabs component for switching between different content views. Features Default, Hover, Active, and Disabled states with smooth transitions and accessibility support.</p>
              
              {/* Live Preview */}
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 font-semibold mb-4">Interactive Demo:</p>
                <HorizontalTabs
                  tabs={[
                    { id: 'active', label: 'Active Tickets' },
                    { id: 'pending', label: 'Pending Review' },
                    { id: 'resolved', label: 'Resolved' },
                    { id: 'disabled', label: 'Archived', disabled: true },
                  ]}
                  activeTabId={activeTab}
                  onChange={setActiveTab}
                />
                <div className="mt-4 p-4 bg-white rounded border border-gray-200">
                  <p className="text-sm text-gray-600">
                    Selected tab: <span className="font-semibold text-[#1B4A41]">{activeTab}</span>
                  </p>
                </div>
              </div>

              {/* States Showcase */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-4">All States:</p>
                <div className="space-y-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                  {/* Default State */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2 font-medium">Default:</p>
                    <button
                      className="
                        flex items-center justify-center 
                        px-4 py-2 
                        rounded-tl-md rounded-tr-md
                        border-b-[3px] border-solid
                        border-[#dadada]
                        text-[#262626]
                        font-semibold text-[14px] leading-[1.5] tracking-[-0.14px] text-center
                      "
                    >
                      Support Request
                    </button>
                  </div>

                  {/* Hover State */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2 font-medium">Hover:</p>
                    <button
                      className="
                        flex items-center justify-center 
                        px-4 py-2 
                        rounded-tl-md rounded-tr-md
                        border-b-[3px] border-solid
                        bg-[#FAF9F5]
                        border-[#dadada]
                        text-[#262626]
                        font-semibold text-[14px] leading-[1.5] tracking-[-0.14px] text-center
                      "
                    >
                      Support Request
                    </button>
                  </div>

                  {/* Active State */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2 font-medium">Active:</p>
                    <button
                      className="
                        flex items-center justify-center 
                        px-4 py-2 
                        rounded-tl-md rounded-tr-md
                        border-b-[3px] border-solid
                        bg-[#FAF9F5]
                        border-[#1B4A41]
                        text-[#1B4A41]
                        font-semibold text-[14px] leading-[1.5] tracking-[-0.14px] text-center
                      "
                    >
                      Support Request
                    </button>
                  </div>

                  {/* Disabled State */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2 font-medium">Disabled:</p>
                    <button
                      className="
                        flex items-center justify-center 
                        px-4 py-2 
                        rounded-tl-md rounded-tr-md
                        border-b-[3px] border-solid
                        border-[#dadada]
                        text-[#737373]
                        font-semibold text-[14px] leading-[1.5] tracking-[-0.14px] text-center
                        opacity-60 cursor-not-allowed
                      "
                      disabled
                    >
                      Support Request
                    </button>
                  </div>
                </div>
              </div>

              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Four distinct states: Default, Hover, Active, Disabled</li>
                  <li>Typography: Inter Semi Bold 14px, line-height 1.5, tracking -0.14px</li>
                  <li>Active state: Background #FAF9F5, border #1B4A41 (3px bottom), text #1B4A41</li>
                  <li>Hover state: Background #FAF9F5, border #DADADA (3px bottom), text #262626</li>
                  <li>Default state: No background, border #DADADA (3px bottom), text #262626</li>
                  <li>Disabled state: Border #DADADA, text #737373, opacity 60%, cursor not-allowed</li>
                  <li>Border radius: 6px on top-left and top-right corners only</li>
                  <li>Padding: 16px horizontal, 8px vertical</li>
                  <li>Smooth color transitions on state change</li>
                  <li>Keyboard accessible: Tab navigation with focus indicators</li>
                  <li>ARIA attributes: role="tab", aria-selected, aria-disabled</li>
                  <li>Prevents clicks on disabled tabs</li>
                  <li>Flexible: Accepts custom tab labels and IDs</li>
                </ul>
              </div>

              {/* Props */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Props:</p>
                <div className="bg-gray-50 rounded p-4">
                  <ul className="text-xs text-gray-700 space-y-2 font-mono">
                    <li><strong>tabs</strong>: TabItem[] - Array of tab items</li>
                    <li><strong>activeTabId</strong>: string - ID of currently active tab</li>
                    <li><strong>onChange</strong>: (tabId: string) =&gt; void - Callback when tab changes</li>
                    <li><strong>className?</strong>: string - Optional additional CSS classes</li>
                  </ul>
                </div>
              </div>

              {/* TabItem Interface */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">TabItem Interface:</p>
                <div className="bg-gray-50 rounded p-4">
                  <code className="text-xs text-gray-700 block whitespace-pre">
{`export interface TabItem {
  id: string;          // Unique identifier
  label: string;       // Display text
  disabled?: boolean;  // Optional disabled state
}`}
                  </code>
                </div>
              </div>

              {/* Code Example */}
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import HorizontalTabs from '@/components/ui/HorizontalTabs';
import { useState } from 'react';

function MyPage() {
  const [activeTab, setActiveTab] = useState('active');

  return (
    <HorizontalTabs
      tabs={[
        { id: 'active', label: 'Active Tickets' },
        { id: 'pending', label: 'Pending Review' },
        { id: 'resolved', label: 'Resolved' },
        { id: 'archived', label: 'Archived', disabled: true },
      ]}
      activeTabId={activeTab}
      onChange={setActiveTab}
    />
  );
}`}
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
              <p className="text-gray-600 mb-4">Checkbox component with checked indicator using Radix UI. Checked state uses blue (#51A2FF) for visual clarity.</p>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 rounded-sm border border-gray-300 flex items-center justify-center bg-white"></div>
                  <label className="text-sm font-medium text-gray-700">Unchecked state (border-gray-300)</label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 rounded-sm border border-[#51A2FF] bg-[#51A2FF] flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <label className="text-sm font-medium text-gray-700">Checked state (#51A2FF)</label>
                </div>
                
                <div className="flex items-center space-x-2 opacity-50">
                  <div className="h-4 w-4 rounded-sm border border-gray-400 flex items-center justify-center bg-gray-100 cursor-not-allowed"></div>
                  <label className="text-sm font-medium text-gray-700">Disabled state</label>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Unchecked: border-gray-300 with white background</li>
                  <li>Checked: bg-[#51A2FF] border-[#51A2FF] with white checkmark</li>
                  <li>Uses lucide-react Check icon</li>
                  <li>Built with @radix-ui/react-checkbox for accessibility</li>
                  <li>Focus ring for keyboard navigation</li>
                  <li>Disabled state with reduced opacity</li>
                </ul>
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

            <div>
              <h3 className="text-lg font-semibold text-[#232521] mb-4">Radio Input</h3>
              <p className="text-gray-600 mb-4">Radio input component with selected indicator using Radix UI. Selected state uses blue (#51A2FF) for visual clarity, matching checkbox style.</p>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 rounded-full border border-gray-300 flex items-center justify-center bg-white"></div>
                  <label className="text-sm font-medium text-gray-700">Unselected state (border-gray-300)</label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 rounded-full border-2 border-[#51A2FF] flex items-center justify-center bg-white">
                    <div className="h-2 w-2 rounded-full bg-[#51A2FF]"></div>
                  </div>
                  <label className="text-sm font-medium text-gray-700">Selected state (#51A2FF)</label>
                </div>
                
                <div className="flex items-center space-x-2 opacity-50">
                  <div className="h-4 w-4 rounded-full border border-gray-400 flex items-center justify-center bg-gray-100 cursor-not-allowed"></div>
                  <label className="text-sm font-medium text-gray-700">Disabled state</label>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Unselected: border-gray-300 with white background</li>
                  <li>Selected: text-[#51A2FF] for inner dot (matches checkbox blue)</li>
                  <li>Circular shape with rounded-full</li>
                  <li>Uses lucide-react Circle icon for selected state</li>
                  <li>Built with @radix-ui/react-radio-group for accessibility</li>
                  <li>Focus ring for keyboard navigation</li>
                  <li>Disabled state with reduced opacity</li>
                </ul>
              </div>
              
              <div className="mt-4 bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { RadioGroup, RadioGroupItem } from '@/components/ui/radio';

<RadioGroup value={selectedValue} onValueChange={setSelectedValue}>
  <div className="flex items-start gap-3">
    <RadioGroupItem value="option-1" id="option-1" />
    <div>
      <label htmlFor="option-1" className="font-medium text-[#232521]">
        Option Label
      </label>
      <p className="text-sm text-gray-600">Optional description text</p>
    </div>
  </div>
</RadioGroup>`}
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
              <p className="text-gray-600 mb-6">Displays scheduled meetings with a distinctive calendar badge featuring a red month bar. Shows meeting title, date/time, and "View Details" action button.</p>
              
              <div className="mb-6">
                <UpcomingMeetingCard meeting={mockMeeting} />
              </div>

              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Calendar badge: 64x64px with red (#e74c3c) month bar and gray background (#f2f2f2)</li>
                  <li>Meeting title: Manrope Bold 16px, line-height 1.5, color #232521</li>
                  <li>Date/time: Inter Medium 15px, line-height 1.2, color #545552</li>
                  <li>Action button: "View Details" in dark green (#1B4A41) with hover underline</li>
                  <li>4px border radius with subtle border (rgba(111,121,122,0.4))</li>
                  <li>16px padding and 16px gap between elements</li>
                  <li>Auto-formats date to Eastern Time (America/New_York)</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 whitespace-pre">
                  {`import { UpcomingMeetingCard } from '@/components/dashboard/UpcomingMeetingCard';
import { Timestamp } from 'firebase/firestore';

interface Meeting {
  id: string;
  title: string;
  date: Timestamp;
  meetingUrl: string;
  type: string;
  status: string;
}

const mockMeeting: Meeting = {
  id: "meeting-123",
  title: "Welcome Session",
  date: Timestamp.fromDate(new Date('2025-08-24T14:00:00')),
  meetingUrl: "https://meet.google.com/abc-defg-hij",
  type: "welcome-session",
  status: "scheduled"
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

            {/* ReportsTable */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Reports Table</h3>
              <p className="text-gray-600 mb-6">Fully responsive reports table with 4 breakpoint variants. Displays document title, created date, updated date, and download action. Includes sortable columns and hover states.</p>
              
              {/* Live Preview */}
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <ReportsTable 
                  reports={mockReports}
                  sortOrder={sortOrder}
                  onSortChange={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  onDownload={(report) => alert(`Downloading: ${report.title}`)}
                />
              </div>

              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Fully responsive with 4 breakpoints (Desktop 1360px, Tablet 1024px, Tablet 744px, Mobile 430px)</li>
                  <li>Column visibility adapts to screen size:</li>
                  <li className="ml-6">- Desktop: All columns visible (Document Title, Created Date, Updated Date, Action)</li>
                  <li className="ml-6">- Tablet 1024px: All columns visible</li>
                  <li className="ml-6">- Tablet 744px: Hides "Updated Date" column</li>
                  <li className="ml-6">- Mobile 430px: Shows only "Document Title" and "Action"</li>
                  <li>Sortable "Created Date" column with chevron indicator</li>
                  <li>Hover state: Background changes to #F2F0E7</li>
                  <li>Empty state: Displays "No reports available" message</li>
                  <li>Typography: Inter Semi Bold 15px for headers, Manrope Bold 16px for titles, Inter Medium 15px for dates</li>
                  <li>Uses TertiaryButton component for "Download" action</li>
                  <li>Border styling: rgba(111,121,122,0.4)</li>
                  <li>Background colors: #F7F6F1 for header, white for rows</li>
                </ul>
              </div>

              {/* Responsive Behavior */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Responsive Breakpoints:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li><strong>Desktop (default):</strong> All columns shown with full width layout</li>
                  <li><strong>Tablet (lg: 1024px):</strong> All columns visible, optimized spacing</li>
                  <li><strong>Tablet (sm: 744px):</strong> "Updated Date" column hidden, 3 columns visible</li>
                  <li><strong>Mobile (430px):</strong> Only "Document Title" and "Action" visible</li>
                </ul>
              </div>

              {/* Props */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Props:</p>
                <div className="bg-gray-50 rounded p-4">
                  <ul className="text-xs text-gray-700 space-y-2 font-mono">
                    <li><strong>reports</strong>: Report[] - Array of report objects to display</li>
                    <li><strong>onDownload?</strong>: (report: Report) =&gt; void - Callback when download is clicked</li>
                    <li><strong>sortOrder?</strong>: 'asc' | 'desc' - Current sort order (default: 'desc')</li>
                    <li><strong>onSortChange?</strong>: () =&gt; void - Callback when sort is toggled</li>
                  </ul>
                </div>
              </div>

              {/* Report Interface */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Report Interface:</p>
                <div className="bg-gray-50 rounded p-4">
                  <code className="text-xs text-gray-700 block whitespace-pre">
{`export interface Report {
  id: string;
  title: string;
  subtitle: string;
  createdDate: string;
  updatedDate: string;
  fileUrl?: string;
}`}
                  </code>
                </div>
              </div>

              {/* Code Example */}
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { ReportsTable, Report } from '@/components/reports/ReportsTable';
import { useState } from 'react';

const mockReports: Report[] = [
  {
    id: "report-1",
    title: "TSG Performance Report - Jan 2025",
    subtitle: "Performance Checkup",
    createdDate: "01-02-2025",
    updatedDate: "12-25-2025",
    fileUrl: "https://example.com/report-jan-2025.pdf"
  },
  // ... more reports
];

function MyPage() {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  return (
    <ReportsTable 
      reports={mockReports}
      sortOrder={sortOrder}
      onSortChange={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
      onDownload={(report) => {
        console.log('Downloading:', report.title);
        window.open(report.fileUrl, '_blank');
      }}
    />
  );
}`}
                </code>
              </div>
            </div>

            {/* TransactionsTable */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Transactions Table</h3>
              <p className="text-gray-600 mb-6">Fully responsive billing history table with 4 breakpoint variants. Displays order ID, description, date, amount, status badges, payment method, and download action. Perfect for transaction history and billing pages.</p>
              
              {/* Live Preview */}
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <TransactionsTable 
                  transactions={mockTransactions}
                  sortOrder={transactionSortOrder}
                  onSortChange={() => setTransactionSortOrder(transactionSortOrder === 'asc' ? 'desc' : 'asc')}
                  onDownload={(transaction) => alert(`Downloading invoice: ${transaction.orderId}`)}
                />
              </div>

              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Fully responsive with 4 breakpoints (Desktop 1360px, Tablet 1024px, Tablet 744px, Mobile 430px)</li>
                  <li>Column visibility adapts to screen size:</li>
                  <li className="ml-6">- Desktop: All columns (Order ID, Description, Date, Amount, Status, Payment Method, Action)</li>
                  <li className="ml-6">- Tablet 1024px: Hides Status and Payment Method columns</li>
                  <li className="ml-6">- Tablet 744px: Shows Order ID, Description, Amount, Action</li>
                  <li className="ml-6">- Mobile 430px: Shows only Order ID and Action</li>
                  <li>Sortable "Order ID" column with chevron indicator</li>
                  <li>Status badges with color coding:</li>
                  <li className="ml-6">- Completed: Green background (#dcfce7) with dark green text (#14532d)</li>
                  <li className="ml-6">- Failed: Red background (#feebeb) with dark red text (#e10e0e)</li>
                  <li className="ml-6">- Pending: Yellow background (#fef3c7) with dark yellow text (#92400e)</li>
                  <li>Hover state: Background changes to #F2F0E7</li>
                  <li>Empty state: Displays "No transactions available" message</li>
                  <li>Typography: Inter Semi Bold 15px for headers, Inter Regular 15px for data, Inter Medium 13px for badges</li>
                  <li>Uses TertiaryButton component for "Download" action</li>
                  <li>Border styling: #dadada for row dividers</li>
                  <li>Background colors: #F7F6F1 for header, white for rows</li>
                </ul>
              </div>

              {/* Responsive Behavior */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Responsive Breakpoints:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li><strong>Desktop (xl: 1280px+):</strong> All 7 columns visible</li>
                  <li><strong>Tablet Large (lg: 1024px):</strong> Hides Status and Payment Method (5 columns)</li>
                  <li><strong>Tablet (sm: 640px):</strong> Shows Order ID, Description, Amount, Action (4 columns)</li>
                  <li><strong>Mobile (default):</strong> Shows only Order ID and Action (2 columns)</li>
                </ul>
              </div>

              {/* Props */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Props:</p>
                <div className="bg-gray-50 rounded p-4">
                  <ul className="text-xs text-gray-700 space-y-2 font-mono">
                    <li><strong>transactions</strong>: Transaction[] - Array of transaction objects to display</li>
                    <li><strong>onDownload?</strong>: (transaction: Transaction) =&gt; void - Callback when download is clicked</li>
                    <li><strong>sortOrder?</strong>: 'asc' | 'desc' - Current sort order (default: 'desc')</li>
                    <li><strong>onSortChange?</strong>: () =&gt; void - Callback when sort is toggled</li>
                  </ul>
                </div>
              </div>

              {/* Transaction Interface */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Transaction Interface:</p>
                <div className="bg-gray-50 rounded p-4">
                  <code className="text-xs text-gray-700 block whitespace-pre">
{`export type TransactionStatus = 'completed' | 'failed' | 'pending';

export interface Transaction {
  id: string;
  orderId: string;
  description: string;
  date: string;
  amount: string;
  status: TransactionStatus;
  paymentMethod: string;
  invoiceUrl?: string;
}`}
                  </code>
                </div>
              </div>

              {/* Code Example */}
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { TransactionsTable, Transaction } from '@/components/transactions/TransactionsTable';
import { useState } from 'react';

const mockTransactions: Transaction[] = [
  {
    id: "txn-1",
    orderId: "#BCC-001205",
    description: "Genie Maintenance - Essential Plan",
    date: "06-01-2025",
    amount: "$209.00",
    status: "completed",
    paymentMethod: "•••• 3245",
    invoiceUrl: "https://example.com/invoice-001205.pdf"
  },
  {
    id: "txn-2",
    orderId: "#BCC-001202",
    description: "Genie Maintenance - Essential Plan",
    date: "05-01-2025",
    amount: "$209.00",
    status: "failed",
    paymentMethod: "•••• 3245",
    invoiceUrl: "https://example.com/invoice-001202.pdf"
  }
];

function MyPage() {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  return (
    <TransactionsTable 
      transactions={mockTransactions}
      sortOrder={sortOrder}
      onSortChange={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
      onDownload={(transaction) => {
        console.log('Downloading invoice:', transaction.orderId);
        window.open(transaction.invoiceUrl, '_blank');
      }}
    />
  );
}`}
                </code>
              </div>
            </div>

            {/* SupportTicketCard */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Support Ticket Card</h3>
              <p className="text-gray-600 mb-6">Displays support tickets with dynamic status badges, assignment information, and timestamps. Used in the Support Hub to show active and past tickets with proper status color coding.</p>
              
              {/* Live Preview - All States */}
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200 space-y-4">
                <p className="text-sm text-gray-600 font-semibold mb-2">All Status States:</p>
                
                {/* Open */}
                <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium">Open / New:</p>
                  <SupportTicketCard ticket={mockSupportTickets[0]} />
                </div>

                {/* In Progress */}
                <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium">In Progress:</p>
                  <SupportTicketCard ticket={mockSupportTickets[1]} />
                </div>

                {/* Awaiting Customer */}
                <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium">Awaiting Customer:</p>
                  <SupportTicketCard ticket={mockSupportTickets[2]} />
                </div>

                {/* Resolved */}
                <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium">Resolved:</p>
                  <SupportTicketCard ticket={mockSupportTickets[3]} />
                </div>

                {/* Closed */}
                <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium">Closed:</p>
                  <SupportTicketCard ticket={mockSupportTickets[4]} />
                </div>

                {/* Empty State */}
                <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium">Empty State:</p>
                  <SupportTicketCard variant="empty" />
                </div>
              </div>

              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Dynamic status badges with color-coded backgrounds and text (from @/types/support STATUS_COLORS)</li>
                  <li>Status colors: Open/Closed (gray), In Progress/Resolved (green), Awaiting Customer (yellow), Cancelled (red)</li>
                  <li>Title: Manrope Bold 16px (#232521) with line-height 1.5, tracking -0.16px</li>
                  <li>Metadata: Inter Medium 15px (#545552) with line-height 1.2, tracking -0.15px</li>
                  <li>Status badge: Inter Medium 13px with dynamic bg/text colors, rounded-full, px-2 py-1</li>
                  <li>Displays ticket ID, assigned agent, last updated time, and creation date</li>
                  <li>Smart time formatting: "X minutes/hours ago" for recent updates, "X days ago" for older</li>
                  <li>Empty state with centered text: "All clear!" heading and helpful message</li>
                  <li>Optional onClick handler for ticket navigation (cursor-pointer, hover effect)</li>
                  <li>Keyboard accessible: Tab navigation and Enter/Space activation</li>
                  <li>Border: rgba(111,121,122,0.4) with hover state rgba(111,121,122,0.6)</li>
                  <li>Background: #FAF9F5 (Surface Container Low)</li>
                  <li>Max width: 800px for optimal readability</li>
                  <li>Gap: 8px (gap-2) between elements</li>
                </ul>
              </div>

              {/* Status Badge Colors */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Status Badge Colors:</p>
                <div className="bg-gray-50 rounded p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 rounded-full bg-[#E5E7EB] text-[#374151] text-xs font-medium">Open</div>
                    <span className="text-xs text-gray-600">bg: #E5E7EB, text: #374151</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 rounded-full bg-[#D1FAE5] text-[#065F46] text-xs font-medium">In Progress</div>
                    <span className="text-xs text-gray-600">bg: #D1FAE5, text: #065F46</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] text-xs font-medium">Awaiting Customer</div>
                    <span className="text-xs text-gray-600">bg: #FEF3C7, text: #92400E</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 rounded-full bg-[#D1FAE5] text-[#065F46] text-xs font-medium">Resolved</div>
                    <span className="text-xs text-gray-600">bg: #D1FAE5, text: #065F46</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 rounded-full bg-[#E5E7EB] text-[#374151] text-xs font-medium">Closed</div>
                    <span className="text-xs text-gray-600">bg: #E5E7EB, text: #374151</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 rounded-full bg-[#FEE2E2] text-[#991B1B] text-xs font-medium">Cancelled</div>
                    <span className="text-xs text-gray-600">bg: #FEE2E2, text: #991B1B</span>
                  </div>
                </div>
              </div>

              {/* Props */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Props:</p>
                <div className="bg-gray-50 rounded p-4">
                  <ul className="text-xs text-gray-700 space-y-2 font-mono">
                    <li><strong>ticket?</strong>: SupportTicket - Ticket data from Firestore (from @/types/support)</li>
                    <li><strong>variant?</strong>: 'default' | 'empty' - Display mode (default: 'default')</li>
                    <li><strong>onClick?</strong>: () =&gt; void - Optional click handler for navigation</li>
                  </ul>
                </div>
              </div>

              {/* SupportTicket Interface Reference */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">SupportTicket Interface (from @/types/support):</p>
                <div className="bg-gray-50 rounded p-4">
                  <code className="text-xs text-gray-700 block whitespace-pre">
{`interface SupportTicket {
  ticketId: string;
  customerId: string;
  createdByUserId: string;
  title: string;
  description: string;
  status: TicketStatus; // 'Open' | 'In Progress' | 'Awaiting Customer' | 'Resolved' | 'Closed' | 'Cancelled'
  priority: TicketPriority;
  category: TicketCategory;
  channel: TicketChannel;
  assignedAgentId?: string;
  assignedAgentName?: string;
  createdAt: Timestamp;
  lastUpdatedAt: Timestamp;
  resolvedAt?: Timestamp;
  closedAt?: Timestamp;
  cancelledAt?: Timestamp;
  // ... other optional fields
}`}
                  </code>
                </div>
              </div>

              {/* Code Example */}
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import SupportTicketCard from '@/components/support/SupportTicketCard';
import type { SupportTicket } from '@/types/support';
import { Timestamp } from 'firebase/firestore';

const ticket: SupportTicket = {
  ticketId: "#TSG-1046",
  customerId: "user-123",
  createdByUserId: "user-123",
  title: "Cannot update billing address",
  description: "I'm trying to update my billing address...",
  status: "Open",
  priority: "Medium",
  category: "Bug Report",
  channel: "Support Hub",
  assignedAgentName: "Sarah M.",
  createdAt: Timestamp.fromDate(new Date('2026-01-15T10:00:00')),
  lastUpdatedAt: Timestamp.fromDate(new Date(Date.now() - 2 * 60 * 60 * 1000)),
};

// With click handler for navigation
<SupportTicketCard 
  ticket={ticket}
  onClick={() => router.push(\`/dashboard/support/tickets/\${ticket.ticketId}\`)}
/>

// Empty state
<SupportTicketCard variant="empty" />`}
                </code>
              </div>
            </div>

            {/* PastSupportTicketsTable */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Past Support Tickets Table</h3>
              <p className="text-gray-600 mb-6">Displays historical support tickets in a table format with ticket ID, description, status badge, dates, and download action. Features hover states and responsive design.</p>
              
              {/* Live Preview */}
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 font-semibold mb-4">Preview:</p>
                <PastSupportTicketsTable
                  tickets={mockSupportTickets.slice(3, 5)} // Show resolved and closed tickets
                  onDownload={(ticket) => alert(`Downloading report for ${ticket.ticketId}`)}
                />
              </div>

              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Table layout with fixed column widths for consistent alignment</li>
                  <li>Header row: Background #F7F6F1, Inter Semi Bold 15px</li>
                  <li>Data rows: Background white, hover state #F2F0E7</li>
                  <li>Ticket ID: Manrope Bold 16px (#232521), fixed width 300px</li>
                  <li>Description: Inter Medium 15px (#545552), flexible width</li>
                  <li>Status badge: Dynamic colors from STATUS_COLORS, Inter Medium 13px, rounded-full</li>
                  <li>Dates: Inter Medium 15px (#545552), flexible width</li>
                  <li>Download button: Inter Bold 16px (#1B4A41), hover underline, fixed width 80px</li>
                  <li>Border: rgba(111,121,122,0.4) on all sides</li>
                  <li>Padding: 18px on all cells</li>
                  <li>Gap: 16px between columns</li>
                  <li>Smooth hover transition on rows</li>
                  <li>Empty state with centered message</li>
                  <li>Click handler on download button with event.stopPropagation()</li>
                  <li>Date formatting: "Jan 10, 2026" format</li>
                </ul>
              </div>

              {/* Column Structure */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Column Structure:</p>
                <div className="bg-gray-50 rounded p-4">
                  <ul className="text-xs text-gray-700 space-y-2 font-mono">
                    <li><strong>Ticket ID</strong>: 300px fixed width - Displays ticket identifier</li>
                    <li><strong>Description</strong>: flex-1 - Ticket title/summary</li>
                    <li><strong>Status</strong>: flex-1 - Status badge with dynamic colors</li>
                    <li><strong>Created</strong>: flex-1 - Creation date</li>
                    <li><strong>Resolved</strong>: flex-1 - Resolution/closure date</li>
                    <li><strong>Action</strong>: 80px fixed width - Download button</li>
                  </ul>
                </div>
              </div>

              {/* Props */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Props:</p>
                <div className="bg-gray-50 rounded p-4">
                  <ul className="text-xs text-gray-700 space-y-2 font-mono">
                    <li><strong>tickets</strong>: SupportTicket[] - Array of past ticket data from Firestore</li>
                    <li><strong>onDownload?</strong>: (ticket: SupportTicket) =&gt; void - Callback when download is clicked</li>
                  </ul>
                </div>
              </div>

              {/* Hover States */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Interactive States:</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-10 bg-white border border-[rgba(111,121,122,0.4)] rounded flex items-center justify-center text-xs">
                      Default
                    </div>
                    <span className="text-sm text-gray-600">White background</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-10 bg-[#F2F0E7] border border-[rgba(111,121,122,0.4)] rounded flex items-center justify-center text-xs">
                      Hover
                    </div>
                    <span className="text-sm text-gray-600">Light beige background (#F2F0E7)</span>
                  </div>
                </div>
              </div>

              {/* Code Example */}
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import PastSupportTicketsTable from '@/components/support/PastSupportTicketsTable';
import type { SupportTicket } from '@/types/support';

const pastTickets: SupportTicket[] = [
  {
    ticketId: "#TSG-1047",
    title: "Plugin update causing site slowdown",
    status: "Resolved",
    createdAt: Timestamp.fromDate(new Date('2026-01-10')),
    resolvedAt: Timestamp.fromDate(new Date('2026-01-12')),
    // ... other fields
  },
  // ... more tickets
];

<PastSupportTicketsTable
  tickets={pastTickets}
  onDownload={(ticket) => {
    console.log('Downloading:', ticket.ticketId);
    // Handle download logic
  }}
/>`}
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
                      <h4 className="text-lg font-bold leading-relaxed text-[#232521]">Genie Maintenance - Monthly Plan</h4>
                    </div>
                    <button className="px-4 py-2 text-sm font-semibold text-[#1B4A41] hover:underline underline-offset-2 transition-all min-h-[40px]">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Plan name display with TSG branding</li>
                  <li>TertiaryButton component for remove action</li>
                  <li>Border styling in TSG secondary color (#1B4A41)</li>
                  <li>Optional onRemove callback</li>
                  <li>Defaults to routing back to /pricing if no callback provided</li>
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

            {/* StickyBottomBar */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Sticky Bottom Bar</h3>
              <p className="text-gray-600 mb-6">Fixed bottom bar for form edit modes. Displays action buttons (e.g. Cancel, Save Changes) when editing. Used with PageCard on My Company and similar edit-in-place pages.</p>
              
              {/* Visual Demo */}
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-4 font-semibold">Preview:</p>
                <div className="bg-[#F7F6F1] p-4 rounded-lg relative min-h-[120px]">
                  <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-4 rounded-b-lg">
                    <SecondaryButton onClick={() => {}}>Cancel</SecondaryButton>
                    <PrimaryButton onClick={() => {}}>Save Changes</PrimaryButton>
                  </div>
                  <p className="text-sm text-gray-500">Page content above the bar</p>
                </div>
              </div>
              
              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Fixed to bottom of viewport</li>
                  <li>White background with top border</li>
                  <li>Flex container with justify-end, gap-4</li>
                  <li>Accepts children (buttons) for flexibility</li>
                  <li>Use with pb-24 on parent to prevent content overlap</li>
                </ul>
              </div>
              
              {/* Code Example */}
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { StickyBottomBar } from '@/components/ui/StickyBottomBar';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';

// Usage (typically inside PageCard when isEditMode)
<StickyBottomBar>
  <SecondaryButton onClick={handleCancel}>Cancel</SecondaryButton>
  <PrimaryButton onClick={handleSave}>Save Changes</PrimaryButton>
</StickyBottomBar>`}
                </code>
              </div>
            </div>

            {/* Header */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Header</h3>
              <p className="text-gray-600 mb-6">Simple header component with TSG logo and bottom border. Uses the TSGLogo component for consistent branding. Used on authentication and standalone pages.</p>
              
              {/* Visual Demo */}
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-4 font-semibold">Preview:</p>
                <div className="bg-white border-b border-[rgba(111,121,122,0.4)]">
                  <div className="flex items-center px-6 py-5 md:px-10">
                    <TSGLogo />
                  </div>
                </div>
              </div>
              
              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>TSGLogo component from @/components/ui/logo</li>
                  <li>Bottom border: border-[rgba(111,121,122,0.4)]</li>
                  <li>Responsive padding: px-6 py-5 on mobile, md:px-10 on desktop</li>
                  <li>Full width layout</li>
                  <li>Used on auth pages, booking flows, checkout</li>
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
              <p className="text-gray-600 mb-6">Comprehensive navigation component with desktop top bar and mobile bottom navigation. Uses TSGLogo component for branding consistency. Includes user dropdown, settings access, and responsive layout with lucide-react icons.</p>
              
              {/* Visual Demo */}
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-4 font-semibold">Preview (Desktop):</p>
                {/* Desktop Nav */}
                <div className="bg-transparent rounded-lg mb-4 mt-4">
                  <div className="max-w-[1440px] mx-auto">
                    <div className="flex items-center justify-between h-16">
                      <div className="flex-shrink-0">
                        <TSGLogo />
                      </div>
                      <div className="flex items-center space-x-1">
                        {['Home', 'My Company', 'Sites', 'Reports', 'Support', 'Transactions'].map((item, idx) => (
                          <div 
                            key={item} 
                            className={`flex flex-col items-center min-w-[112px] min-h-[71px] justify-center rounded-lg text-sm font-medium transition-colors ${
                              idx === 0 ? 'bg-[#D9D5C5]/40 text-[#1B4A41]' : 'text-gray-600 hover:bg-[#D9D5C5]/40'
                            }`}
                          >
                            <Home className="h-5 w-5 mb-1" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 min-w-[112px] min-h-[71px] justify-center hover:bg-[#D9D5C5]/40 rounded-lg transition-colors">
                          <div className="w-8 h-8 rounded-full bg-[#1b4a41] flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">M</span>
                          </div>
                          <ChevronDown className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex items-center justify-center min-w-[112px] min-h-[71px] rounded-lg text-gray-600 hover:bg-[#D9D5C5]/40 transition-colors">
                          <Settings className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-4 font-semibold mt-6">Preview (Mobile Bottom Nav):</p>
                {/* Mobile Nav */}
                <div className="max-w-md mx-auto">
                  <div className="bg-white rounded-lg shadow-[0_8px_20px_0_rgba(85,85,85,0.10)] p-2 flex justify-center gap-3">
                    {[
                      { name: 'Home', icon: Home },
                      { name: 'My Company', icon: Building },
                      { name: 'Sites', icon: MonitorSmartphone },
                      { name: 'Reports', icon: BarChart3 },
                      { name: 'See All', icon: Menu }
                    ].map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <div 
                          key={item.name} 
                          className={`flex flex-col items-center justify-center p-5 rounded-lg transition-colors ${
                            idx === 0 ? 'text-[#1B4A41] bg-[#D9D5C5]/40' : 'text-gray-600 hover:bg-[#D9D5C5]/40'
                          }`}
                        >
                          <Icon className="w-6 h-6 mb-1" />
                          <span className="text-base font-medium whitespace-nowrap">{item.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>TSGLogo component from @/components/ui/logo</li>
                  <li>Responsive: desktop top bar (hidden lg:block), mobile bottom nav (lg:hidden)</li>
                  <li>Main nav items: Home, My Company, Sites, Reports</li>
                  <li>"See All" button opens AllPagesOverlay with full navigation grid (Home, Company, Sites, Reports, Support, Transactions, My Profile, Settings)</li>
                  <li>User dropdown with profile info and sign out</li>
                  <li>Settings icon button (linked to /dashboard/settings)</li>
                  <li>Active state: bg-[#D9D5C5]/40 text-[#1B4A41]</li>
                  <li>Hover states: hover:bg-[#D9D5C5]/40 active:bg-[#D9D5C5]/40</li>
                  <li>Uses lucide-react icons for all navigation items</li>
                  <li>Mobile: fixed bottom positioning with shadow</li>
                  <li>Min dimensions: min-w-[112px] min-h-[71px] for consistent sizing</li>
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

            {/* AllPagesOverlay */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">All Pages Overlay</h3>
              <p className="text-gray-600 mb-6">Bottom sheet overlay that opens when the &quot;See All&quot; button is clicked on mobile DashboardNav. Displays a grid of all navigation links (Home, Company, Sites, Reports, Support, Transactions, My Profile, Settings) with icons. Closes via X button, backdrop click, or Escape key.</p>
              
              {/* Interactive Demo */}
              <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-4 font-semibold">Interactive Demo:</p>
                <div className="flex justify-center">
                  <PrimaryButton onClick={() => setIsAllPagesOverlayOpen(true)}>
                    Open All Pages Overlay
                  </PrimaryButton>
                </div>
                <AllPagesOverlay isOpen={isAllPagesOverlayOpen} onClose={() => setIsAllPagesOverlayOpen(false)} />
              </div>
              
              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Slides up from bottom with rounded top corners</li>
                  <li>Header: X close button (left), &quot;All Pages&quot; title (centered)</li>
                  <li>4–5 column grid of nav items with icon above text</li>
                  <li>Items: Home, Company, Sites, Reports, Support, Transactions, My Profile, Settings</li>
                  <li>Active route highlighted with bg-[#D9D5C5]/40 text-[#1B4A41]</li>
                  <li>Closes on X click, backdrop click, or Escape key</li>
                  <li>Scrollable content when many items (max-h-[70vh])</li>
                </ul>
              </div>
              
              {/* Code Example */}
              <div className="bg-gray-50 rounded p-4">
                <code className="text-xs text-gray-700 block whitespace-pre">
{`import { AllPagesOverlay } from '@/components/ui/AllPagesOverlay';

// Usage (e.g. in DashboardNav when "See All" is clicked)
const [showAllPages, setShowAllPages] = useState(false);

<AllPagesOverlay isOpen={showAllPages} onClose={() => setShowAllPages(false)} />`}
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* MANAGE SUBSCRIPTION COMPONENTS SECTION */}
        <section>
          <h2 className="text-3xl font-bold text-[#232521] mb-6">Manage Subscription</h2>
          <p className="text-gray-600 mb-6">Complete subscription management flow with three-step cancellation process: ManageSubscriptionModal → CancelConfirmModal (reason collection with PrimaryButton hierarchy) → SafetyNetDownsellModal (last-chance downsell offer)</p>
          
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
                  <li>Displays current payment method with icon</li>
                  <li>TertiaryButton: "Update payment method" (closes modal, opens payment portal)</li>
                  <li>TertiaryButton: "Cancel subscription" (closes modal, opens CancelConfirmModal)</li>
                  <li>Modal closes automatically when action buttons are clicked</li>
                  <li>Child modals (CancelConfirm, SafetyNet) render independently after closure</li>
                  <li>ESC key and backdrop click to close</li>
                  <li>Focus trap for accessibility</li>
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
  onCancelClick={(reason) => {
    // Handle cancellation with reason
    console.log('Cancellation reason:', reason);
  }}
  onUpdatePaymentClick={async () => {
    // Handle payment update
  }}
  currentPaymentMethod="Visa •••• 4242"
/>`}
                </code>
              </div>
            </div>

            {/* UpdatePaymentMethodModal - REMOVED */}
            {/* This component requires Stripe Elements context and cannot be rendered in the design system */}
            {/* See the actual implementation in app/dashboard/transactions/page.tsx */}

            {/* CancelConfirmModal */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-[#232521] mb-4">Cancel Confirmation Modal</h3>
              <p className="text-gray-600 mb-6">First step in cancellation flow. Collects user's reason for canceling with radio button selection.</p>
              
              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>8 cancellation reason options with radio selection</li>
                  <li>Selected state with light green background (#F0F5F0) and 6px border radius</li>
                  <li>Continue button disabled until reason selected</li>
                  <li>"Keep subscription" uses PrimaryButton (bright green #9be382)</li>
                  <li>"Continue with cancellation" uses SecondaryButton (dark green border #1B4A41)</li>
                  <li>Opens SafetyNetDownsellModal after continuing</li>
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
              <p className="text-gray-600 mb-6">Final step in cancellation flow. Appears after CancelConfirmModal and offers reduced-price "Safety Net Plan" ($299/year) as last-chance downsell before full cancellation.</p>
              
              {/* Key Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#232521] mb-2">Key Features:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>$299/year Safety Net Plan downsell offer</li>
                  <li>Side-by-side feature comparison (included vs removed)</li>
                  <li>Check icons (green) for included features</li>
                  <li>X icons (red) for removed features</li>
                  <li>Renewal date and price comparison display</li>
                  <li>"Claim Offer and Switch" uses SecondaryButton (dark green border)</li>
                  <li>"Cancel My Subscription" uses DestructiveButton (red)</li>
                  <li>Opens after CancelConfirmModal in cancellation flow</li>
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
  onChangePlan={() => {
    setIsUpgradeConfirmationOpen(false);
    setIsPlanSelectionOpen(true);
  }}
/>`}
              </code>
            </div>
          </div>

          {/* PricingCard Component */}
          <div className="bg-white rounded-lg p-8 border border-gray-200 mt-8">
            <h3 className="text-xl font-semibold text-[#232521] mb-4">Pricing Card Component</h3>
            <p className="text-gray-600 mb-6">Reusable pricing card component used in the PlanSelectionModal with different variants for plan states.</p>
            
            {/* Visual Demo */}
            <div className="mb-6 p-6 bg-[#FAF9F5] rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-4 font-semibold">Variants Preview:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <PricingCard
                  tierName="Essential"
                  price="679"
                  features={[
                    '4 Annual support hours',
                    '8 Annual maintenance hours',
                    'Monthly Traffic Reports'
                  ]}
                  variant="current"
                />
                <PricingCard
                  tierName="Advanced"
                  price="1,299"
                  features={[
                    '8 Annual support hours',
                    '16 Annual maintenance hours',
                    'Bi-Weekly Traffic Reports'
                  ]}
                  variant="upgradeable"
                />
                <PricingCard
                  tierName="Premium"
                  price="2,599"
                  features={[
                    '20 Annual support hours',
                    '40 Annual maintenance hours',
                    'Weekly Traffic Reports'
                  ]}
                  variant="selected"
                />
                <PricingCard
                  tierName="Enterprise"
                  price="5,000"
                  features={[
                    'Unlimited support hours',
                    'Custom maintenance',
                    'Dedicated account manager'
                  ]}
                  variant="disabled"
                />
              </div>
            </div>
            
            {/* Key Features */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-[#232521] mb-2">Variants:</p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li><strong>current</strong>: Gray "Your Current Plan" button, non-clickable</li>
                <li><strong>upgradeable</strong>: Green "Upgrade" button (#9be382), clickable with hover state</li>
                <li><strong>selected</strong>: Dark border "Selected" button, green card border (#9be382)</li>
                <li><strong>disabled</strong>: Gray "Not Available" button, non-clickable</li>
              </ul>
            </div>
            
            <div className="mb-6">
              <p className="text-sm font-semibold text-[#232521] mb-2">Props:</p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li><strong>tierName</strong>: string - Plan name (e.g., "Essential", "Advanced")</li>
                <li><strong>price</strong>: string - Annual price without $ symbol (e.g., "679", "1,299")</li>
                <li><strong>features</strong>: string[] - Array of feature descriptions</li>
                <li><strong>variant</strong>: PricingCardVariant - Card state ('current' | 'upgradeable' | 'selected' | 'disabled')</li>
                <li><strong>onClick</strong>: () =&gt; void - Optional click handler (only works for upgradeable/selected variants)</li>
                <li><strong>className</strong>: string - Optional additional CSS classes</li>
              </ul>
            </div>
            
            {/* Code Example */}
            <div className="bg-gray-50 rounded p-4">
              <code className="text-xs text-gray-700 block whitespace-pre">
{`import { PricingCard } from '@/components/upgrade/PricingCard';

// Basic usage
<PricingCard
  tierName="Advanced"
  price="1,299"
  features={[
    '8 Annual support hours',
    '16 Annual maintenance hours',
    'Bi-Weekly Traffic Analytics Reports',
    'Bi-Weekly Performance Checkups',
    'Bi-Weekly Security Monitoring & Backups',
    'Bi-Weekly Plugin & Theme Updates'
  ]}
  variant="upgradeable"
  onClick={() => handleSelectPlan('advanced')}
/>

// Current plan (non-clickable)
<PricingCard
  tierName="Essential"
  price="679"
  features={['Feature 1', 'Feature 2']}
  variant="current"
/>

// Selected state
<PricingCard
  tierName="Premium"
  price="2,599"
  features={['Feature 1', 'Feature 2']}
  variant="selected"
  onClick={() => console.log('Already selected')}
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
        onCancelClick={(reason) => {
          console.log('Cancel subscription clicked with reason:', reason);
        }}
        onUpdatePaymentClick={async () => {
          console.log('Update payment clicked');
        }}
        currentPaymentMethod="Visa •••• 4242"
      />

      {/* Update Payment Method Modal Demo - REMOVED */}
      {/* This component requires Stripe Elements context and cannot be rendered without it */}
      {/* See the actual implementation in app/dashboard/transactions/page.tsx */}

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
          onChangePlan={() => {
            setIsUpgradeConfirmationOpen(false);
            setIsPlanSelectionOpen(true);
          }}
        />
      )}
    </div>
  );
}
