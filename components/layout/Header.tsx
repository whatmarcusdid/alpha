// components/layout/Header.tsx
import { TSGLogo } from "@/components/ui/TSGLogo";

export function Header() {
  return (
    <header className="w-full border-b border-[rgba(111,121,122,0.4)]">
      <div className="flex items-center px-6 py-5 md:px-10">
        <TSGLogo />
      </div>
    </header>
  );
}
