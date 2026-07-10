import Image from 'next/image';
import Link from 'next/link';

export function AuthNavbar() {
  return (
    <div className="mx-auto w-full max-w-[1160px] rounded-lg bg-[#fcfcfe] px-5 py-3 shadow-[0px_8px_20px_rgba(85,85,85,0.1)]">
      <Link href="/" className="inline-flex items-center">
        <Image
          src="/brand/book-service-nav-logo.png"
          alt="Book Service"
          width={194}
          height={25}
          priority
          className="h-[25px] w-auto"
        />
      </Link>
    </div>
  );
}
