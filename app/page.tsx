import { Inter, Schibsted_Grotesk } from 'next/font/google';

import { AuthNavbar } from '@/components/auth/AuthNavbar';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
});

const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['800'],
  display: 'swap',
});

export default function LandingPage() {
  return (
    <div className={`${inter.className} flex min-h-screen flex-col bg-white`}>
      <div className="relative flex flex-1 flex-col items-center bg-[#f8fafc] px-6 pb-20 pt-8 md:px-10 lg:min-h-[800px] lg:px-[140px] lg:pb-[120px] lg:pt-8">
        <div className="w-full">
          <AuthNavbar />
        </div>

        <main className="flex w-full flex-1 flex-col items-center justify-center py-12 md:py-16 lg:py-20">
          <div className="flex w-full max-w-[640px] flex-col items-center gap-6 text-center">
            <h1
              className={`${schibstedGrotesk.className} text-[40px] font-extrabold leading-[1.2] tracking-[-0.4px] text-[#0c0a28] md:text-[48px] md:tracking-[-0.48px] lg:text-[60px] lg:tracking-[-0.6px]`}
            >
              Turn your reputation into booked work
            </h1>

            <p className="text-base leading-[1.5] text-[#52525b] lg:text-lg">
              Book Service helps service businesses prove trust fast with a website
              that converts—and tools to manage delivery and clients.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6">
              <PrimaryButton href="/signin" className="w-[160px]">
                Sign In
              </PrimaryButton>
              <SecondaryButton href="/signup">Sign Up</SecondaryButton>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
