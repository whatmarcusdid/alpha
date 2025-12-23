import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen bg-[#faf9f5]">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center text-center p-6">
        <div className="max-w-lg space-y-6">
          {/* Large 404 */}
          <h1 className="text-8xl font-bold text-[#232521]">404</h1>
          
          {/* Page not found */}
          <h2 className="text-3xl font-bold text-[#232521]">
            Page not found
          </h2>
          
          {/* Description */}
          <p className="text-base text-gray-700">
            This page may have moved, or the link is wrong.
          </p>
          
          {/* Buttons */}
          <div className="flex flex-row gap-4 justify-center pt-4">
            <Link href="/dashboard">
              <Button 
                variant="outline"
                size="lg"
                className="px-8 py-3 border-2 border-[#232521] text-[#232521] bg-white hover:bg-gray-50 rounded-full font-medium"
              >
                Go Back To Dashboard
              </Button>
            </Link>
            
            <Link href="/">
              <Button 
                size="lg"
                className="px-8 py-3 bg-[#9be382] hover:bg-[#8cd370] text-[#1b4a41] rounded-full font-semibold"
              >
                Go Back Home
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}