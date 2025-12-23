import { Header } from "@/components/layout/Header";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <div className="min-h-screen w-full bg-[#faf9f5] flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-6 py-12 md:px-10 md:py-16 lg:py-28">
        <SignUpForm />
      </main>
    </div>
  );
}
