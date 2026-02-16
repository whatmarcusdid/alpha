import './globals.css'
import type { Metadata } from 'next'
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: {
    default: 'TradeSiteGenie',
    template: '%s | TradeSiteGenie',
  },
  description: 'WordPress maintenance for trades contractors. We handle the tech stuff while you focus on running your business.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
