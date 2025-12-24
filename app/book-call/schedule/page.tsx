'use client'

import { TSGLogo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { ArrowLeft, Building, Mail, Monitor, User, Users, Wrench, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { db } from '@/lib/firebase'

interface BookingData {
  id: string
  firstName?: string
  lastName?: string
  businessName?: string
  websiteUrl?: string
  callGoal?: string
  email?: string
  tradeType?: string
  numEmployees?: string
  biggestFrustration?: string
  scheduledTime?: string
}

export default function SchedulePage() {
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hasBookedTime, setHasBookedTime] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const fetchBookingData = useCallback(async (id: string) => {
    try {
      console.log('Fetching booking data for ID:', id)
      const docRef = doc(db, 'bookingIntakes', id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data() as BookingData
        console.log('Booking data loaded:', data)
        setBookingData({ id, ...data })
      } else {
        console.log('No booking data found, redirecting to /book-call')
        router.push('/book-call')
      }
    } catch (error) {
      console.error('Error fetching booking data:', error)
      router.push('/book-call')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    const bookingId = sessionStorage.getItem('bookingIntakeId')
    console.log('Session storage bookingIntakeId:', bookingId)
    if (bookingId) {
      fetchBookingData(bookingId)
    } else {
      console.log('No bookingIntakeId in session storage, redirecting')
      router.push('/book-call')
    }
  }, [fetchBookingData, router])

  const handleCloseModal = () => {
    setIsModalOpen(false)
    // User has interacted with the calendar, assume they booked
    setHasBookedTime(true)
  }

  const handleConfirm = async () => {
    if (bookingData && hasBookedTime) {
      try {
        console.log('Confirming and navigating to confirmation...');
        const docRef = doc(db, 'bookingIntakes', bookingData.id)
        await updateDoc(docRef, { 
          status: 'scheduled',
          scheduledTime: new Date().toISOString() // Save timestamp of when they confirmed
        })
        console.log('Status updated to scheduled')
        router.push('/book-call/confirmation')
      } catch (error) {
        console.error('Error updating booking:', error)
        alert('There was an error confirming your booking. Please try again.')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <TSGLogo />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - My Company */}
            <div className="md:border-r border-gray-200 md:pr-8 pb-8 md:pb-0">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">My Company</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <User className="h-5 w-5 text-gray-500 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Business Owner First Name</p>
                    <p className="font-medium text-gray-900">{bookingData?.firstName}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Users className="h-5 w-5 text-gray-500 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Business Owner Last Name</p>
                    <p className="font-medium text-gray-900">{bookingData?.lastName}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Building className="h-5 w-5 text-gray-500 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Business name</p>
                    <p className="font-medium text-gray-900">{bookingData?.businessName}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-gray-500 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Business email</p>
                    <p className="font-medium text-gray-900">{bookingData?.email}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Monitor className="h-5 w-5 text-gray-500 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Business Website URL</p>
                    <p className="font-medium text-gray-900">{bookingData?.websiteUrl}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Wrench className="h-5 w-5 text-gray-500 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Trade / service type</p>
                    <p className="font-medium text-gray-900">{bookingData?.tradeType}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Users className="h-5 w-5 text-gray-500 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Number of employees</p>
                    <p className="font-medium text-gray-900">{bookingData?.numEmployees}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-gray-500 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Biggest frustration with your website today</p>
                    <p className="font-medium text-gray-900">{bookingData?.biggestFrustration}</p>
                  </div>
                </div>
              </div>
              <Link href="/book-call" className="mt-8 inline-block">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>
              </Link>
            </div>

            {/* Right Column - Scheduling */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Schedule your Website Game Plan Call
              </h1>
              <p className="mt-4 text-lg text-gray-600">
                Pick a time that works. We'll come prepared. This is a 15-20 minute call. We'll walk through:
              </p>
              <ul className="mt-4 space-y-2 text-gray-600">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>what we found in your Speed + Safety audit</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>the fastest wins to stabilize and protect your site</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>the right plan (if it's a fit)</span>
                </li>
              </ul>

              {/* Pick Time Button */}
              <div className="mt-8">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full px-6 py-3 border-2 border-green-500 text-green-600 rounded-md hover:bg-green-50 font-medium transition-colors text-lg"
                >
                  Pick A Time & Day
                </button>
              </div>

              {/* Selected indicator */}
              {hasBookedTime && (
                <p className="mt-4 text-center text-gray-900 font-medium">
                  <span className="font-bold">Selected:</span> Sat, Dec 19 2025 at 9:30am
                </p>
              )}

              {/* Confirm Button */}
              <div className="mt-6">
                <button
                  onClick={handleConfirm}
                  disabled={!hasBookedTime}
                  className={`w-full px-6 py-3 rounded-md font-medium transition-colors text-lg ${
                    hasBookedTime
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Confirm & schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Google Calendar Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Select Your Time</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <iframe
              src="https://calendar.google.com/calendar/appointments/schedules/AcZssZ1OeIYKWEZawHk8YC_p5MGYl9tg4vYbDjCrfEcsWZe96yRROfzeoFK2R0gm9-cmA_KnoWibRspw?gv=true"
              style={{ border: 0 }}
              width="100%"
              height="600"
              frameBorder="0"
            ></iframe>
            <div className="mt-6 pt-6 border-t">
              <button
                onClick={handleCloseModal}
                className="w-full px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 font-medium text-lg"
              >
                Done - Close Calendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
