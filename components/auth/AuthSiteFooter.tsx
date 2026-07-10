import Image from 'next/image';
import Link from 'next/link';

const FOOTER_LINKS = [
  'Terms of Service',
  'Privacy Policy',
  'Refund Policy',
  'Support Expectations',
] as const;

export function AuthSiteFooter() {
  return (
    <footer className="bg-[#030712] px-8 py-10">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-12">
        <Link href="/" className="inline-flex items-center">
          <Image
            src="/brand/book-service-footer-logo.png"
            alt="Book Service"
            width={207}
            height={25}
            className="h-[25px] w-auto"
          />
        </Link>

        <div className="flex flex-col gap-8">
          <div className="border-t border-white/20" />

          <div className="flex flex-col gap-6 text-base leading-[1.5] text-white md:flex-row md:items-start md:justify-between">
            <p>© 2026 Tasomir Technologies LLC. All rights reserved.</p>

            <div className="flex flex-col gap-6 md:flex-row md:gap-6">
              {FOOTER_LINKS.map((label) => (
                <Link
                  key={label}
                  href="#"
                  className="underline underline-offset-2 hover:text-white/80"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
