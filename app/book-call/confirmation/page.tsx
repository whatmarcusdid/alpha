'use client'

import { TSGLogo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { CheckCircle, Clock, Calendar, Globe, Mail, Video } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface BookingData {
  id: string
  firstName?: string
  email?: string
  scheduledTime?: string
}

export default function ConfirmationPage() {
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userTimeZone, setUserTimeZone] = useState('America/New_York')
  const router = useRouter()

  useEffect(() => {
    setUserTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [])

  const fetchBookingData = useCallback(async (id: string) => {
    try {
      const docRef = doc(db, 'bookingIntakes', id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        setBookingData(docSnap.data() as BookingData)
      } else {
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
    if (bookingId) {
      fetchBookingData(bookingId)
    } else {
      router.push('/book-call')
    }
  }, [fetchBookingData, router])

  const formattedDate = bookingData?.scheduledTime
    ? new Date(bookingData.scheduledTime).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      })
    : 'Sat, Dec 19 2025 at 9:30am' // Placeholder

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
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

      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
              You're booked for our TradeSiteGenie Website Game Plan Call!
            </h1>
            <p className="mt-4 text-base md:text-lg text-gray-600">
              Hi {bookingData?.firstName}, here's everything you need for the call — plus how to get the most out of it.
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Meeting details</h2>
            <div className="space-y-5 max-w-md mx-auto">
              <div className="flex items-start">
                <Clock className="h-6 w-6 text-gray-500 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">15-20 minutes</p>
                </div>
              </div>
              <div className="flex items-start">
                <Calendar className="h-6 w-6 text-gray-500 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">{formattedDate}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Globe className="h-6 w-6 text-gray-500 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">{userTimeZone}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Mail className="h-6 w-6 text-gray-500 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">{bookingData?.email}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Video className="h-6 w-6 text-gray-500 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Zoom Video Meeting</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <p className="text-gray-600">
              A meeting invite has been sent to your email.
            </p>
            <div className="mt-8">
              <Link href="/">
                <Button variant="outline">Return to Homepage</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
