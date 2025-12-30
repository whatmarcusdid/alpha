import { Header } from "@/components/layout/Header";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#faf9f5]">
      <Header />
      
      <main className="flex-1 flex items-center px-6 md:px-12 lg:px-20 py-12">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Column - Text Content */}
          <div className="space-y-6">
            <h1 className="text-5xl lg:text-6xl font-bold text-[#232521] leading-tight">
              Welcome to TradeSiteGenie
            </h1>
            
            <p className="text-lg text-gray-700 leading-relaxed">
              Update your site, track new leads, and request support from one dashboard
            </p>
            
            <p className="text-base text-gray-900 font-medium">
              If you already have an account, sign in. New to TradeSiteGenie? Sign up.
            </p>
            
            <div className="flex gap-4 pt-2">
              <PrimaryButton href="/signin">
                Sign In
              </PrimaryButton>
              
              <SecondaryButton href="/signup">
                Sign Up
              </SecondaryButton>
            </div>
          </div>
          
          {/* Right Column - Hero Image */}
          <div className="hidden lg:block">
            <div className="relative w-full h-[500px] rounded-2xl overflow-hidden">
              <img 
                src="/hero-tools.png" 
                alt="Professional tools and parts workspace" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}