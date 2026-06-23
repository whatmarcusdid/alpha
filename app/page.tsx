import { ShieldCheck } from 'lucide-react';
import { Inter, Schibsted_Grotesk } from 'next/font/google';
import Link from 'next/link';

import { PrimaryButton } from '@/components/ui/PrimaryButton';

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

const FOOTER_LINKS = [
  'Terms of Service',
  'Privacy Policy',
  'Refund Policy',
  'Support Expectations',
] as const;

export default function LandingPage() {
  return (
    <div className={`${inter.className} flex min-h-screen flex-col bg-white`}>
      <div className="flex min-h-[500px] flex-1 flex-col items-center gap-20 px-8 pb-20 pt-8 md:gap-[100px] md:px-16 md:py-10 md:pb-[120px] lg:min-h-[700px] lg:gap-[140px] lg:px-[140px] lg:pt-10">
        <div className="w-full shrink-0 rounded-lg bg-white px-5 py-3 shadow-[0px_8px_20px_rgba(85,85,85,0.1)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-6 shrink-0 text-[#1d4ed8]" aria-hidden />
            <span className="text-[25px] font-normal uppercase leading-[1.5] text-[#030712]">
              Book Service
            </span>
          </div>
        </div>

        <div className="flex w-full max-w-[640px] flex-col items-center gap-6 text-center">
          <h1
            className={`${schibstedGrotesk.className} text-[40px] font-extrabold leading-[1.2] tracking-[-0.4px] text-[#172554] md:text-[48px] md:tracking-[-0.48px] lg:text-[60px] lg:tracking-[-0.6px]`}
          >
            Turn your reputation into booked work
          </h1>

          <p className="text-base leading-[1.5] text-[#52525b] lg:text-lg">
            Book Service helps service businesses prove trust fast with a
            website that converts—and tools to manage delivery and clients.
          </p>

          <div className="flex gap-6">
            <PrimaryButton
              href="/signin"
              className="min-h-[40px] w-[150px] rounded-lg !bg-[#1d4ed8] px-6 py-2.5 text-base font-semibold uppercase !text-white hover:!bg-[#1e40af]"
            >
              Sign In
            </PrimaryButton>

            <Link
              href="/signup"
              className="inline-flex min-h-[40px] w-[150px] items-center justify-center rounded-lg border-[3px] border-[#1d4ed8] bg-white px-6 py-2.5 text-base font-semibold uppercase text-[#1d4ed8] transition-colors hover:bg-[#eff6ff]"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>

      <footer className="bg-[#030712] px-8 py-10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-12">
          <div className="flex justify-start text-left">
            <div className="flex items-center justify-start gap-3">
              <ShieldCheck
                className="size-8 shrink-0 text-white"
                aria-hidden
              />
              <span className="text-[34px] font-normal uppercase leading-[1.5] text-white">
                Book Service
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <div className="border-t border-white/20" />

            <div className="flex flex-col gap-6 text-base leading-[1.5] text-white md:flex-row md:items-start md:justify-between">
              <p>© 2026 Tasomir Technologies LLC. All rights reserved.</p>

              <div className="flex flex-col gap-6 md:flex-row md:gap-6">
                {FOOTER_LINKS.map((label) => (
                  <a
                    key={label}
                    href="#"
                    className="underline underline-offset-2"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
