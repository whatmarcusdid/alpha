'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z, ZodIssue } from "zod";
import { BookingLayout } from "@/components/layouts/booking-layout";
import { BookingCard } from "@/components/ui/booking-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveBookingIntake } from "@/lib/booking";

const bookingIntakeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  businessName: z.string().min(1, "Business name is required"),
  email: z.string().email("Please enter a valid email address"),
  websiteUrl: z.string().min(1, "Website URL is required"),
  tradeType: z.string().min(1, "Please select a trade type"),
  numEmployees: z.string().min(1, "Number of employees is required"),
  biggestFrustration: z
    .string()
    .min(1, "Please select your biggest frustration"),
});

type BookingIntakeData = z.infer<typeof bookingIntakeSchema>;

export default function BookCallPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<BookingIntakeData>>({
    firstName: "",
    lastName: "",
    businessName: "",
    email: "",
    websiteUrl: "",
    tradeType: "",
    numEmployees: "",
    biggestFrustration: "",
  });
  const [errors, setErrors] = useState<ZodIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const tradeOptions = [
    "Plumbing only",
    "HVAC only",
    "Electrical only",
    "Multi-trade",
    "General Contractor",
    "Roofing",
    "Painting",
    "Landscaping",
    "Pest Control",
    "Junk Removal",
    "Tree Service",
    "Pressure Washing",
    "Septic",
  ];

  const frustrationOptions = [
    "Site is slow (especially on mobile)",
    "Site goes down or breaks randomly",
    "Contact forms don't work (leads get missed)",
    "Too many spam leads / spam form submissions",
    "Not showing up on Google (local search)",
    "Website looks outdated / not professional",
    "Hard to update content (I have to call someone)",
    "Security concerns (hacks, malware, warnings)",
    "Plugin/theme updates are risky (something always breaks)",
    "Hosting issues (slow, unreliable, confusing)",
    "I don't know what's wrong — I just know it's not working",
    "Other",
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const processedData = {
      ...formData,
      websiteUrl: formData.websiteUrl?.startsWith("http")
        ? formData.websiteUrl
        : `https://${formData.websiteUrl}`,
    };

    const result = bookingIntakeSchema.safeParse(processedData);

    if (!result.success) {
      setErrors(result.error.issues);
      setIsLoading(false);
      return;
    }

    setErrors([]);

    try {
      const docId = await saveBookingIntake(result.data);
      sessionStorage.setItem("bookingIntakeId", docId);
      router.push("/book-call/schedule");
    } catch (error) {
      console.error("Error saving information:", error);
      alert("There was an error saving your information. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = bookingIntakeSchema.safeParse({
    ...formData,
    websiteUrl: formData.websiteUrl?.startsWith("http")
      ? formData.websiteUrl
      : `https://${formData.websiteUrl}`,
  }).success;

  return (
    <BookingLayout>
        <BookingCard>
      {/* Page Header */}
      <div className="w-full">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Tell us a little about your business
        </h1>
        <p className="mt-3 text-base leading-relaxed text-gray-600">
          Help us make your Website Game Plan Call worth your time. This takes
          2-3 minutes. Your answers let us tailor the plan to your goals.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-6">
        <div>
            <Label
              htmlFor="firstName"
              className="mx-auto max-w-[600px] block text-sm font-semibold text-gray-900"
            >
              Business Owner First Name
            </Label>
            <Input
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="Mike"
              className="mx-auto max-w-[600px] mt-2 block w-full rounded-md border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500"
            />
            {errors.find((e) => e.path[0] === "firstName") && (
              <p className="mt-2 text-sm text-red-600">
                {errors.find((e) => e.path[0] === "firstName")?.message}
              </p>
            )}
        </div>
        <div>
            <Label
              htmlFor="lastName"
              className="mx-auto max-w-[600px] block text-sm font-semibold text-gray-900"
            >
              Business Owner Last Name
            </Label>
            <Input
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Johnson"
              className="mx-auto max-w-[600px] mt-2 block w-full rounded-md border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500"
            />
            {errors.find((e) => e.path[0] === "lastName") && (
              <p className="mt-2 text-sm text-red-600">
                {errors.find((e) => e.path[0] === "lastName")?.message}
              </p>
            )}
        </div>

        {/* Business Name */}
        <div>
          <Label
            htmlFor="businessName"
            className="mx-auto max-w-[600px] block text-sm font-semibold text-gray-900"
          >
            Business name
          </Label>
          <Input
            id="businessName"
            name="businessName"
            value={formData.businessName}
            onChange={handleInputChange}
            placeholder="Red Maple Plumbing"
            className="mx-auto max-w-[600px] mt-2 block w-full rounded-md border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500"
          />
          {errors.find((e) => e.path[0] === "businessName") && (
              <p className="mt-2 text-sm text-red-600">
                {errors.find((e) => e.path[0] === "businessName")?.message}
              </p>
            )}
        </div>

        {/* Business Email */}
        <div>
          <Label
            htmlFor="email"
            className="mx-auto max-w-[600px] block text-sm font-semibold text-gray-900"
          >
            Business email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="mike@redmapleplumbing.com"
            className="mx-auto max-w-[600px] mt-2 block w-full rounded-md border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500"
          />
          {errors.find((e) => e.path[0] === "email") && (
            <p className="mt-2 text-sm text-red-600">
              {errors.find((e) => e.path[0] === "email")?.message}
            </p>
          )}
        </div>

        {/* Website URL */}
        <div>
          <Label
            htmlFor="websiteUrl"
            className="mx-auto max-w-[600px] block text-sm font-semibold text-gray-900"
          >
            Business Website URL
          </Label>
          <Input
            id="websiteUrl"
            name="websiteUrl"
            value={formData.websiteUrl}
            onChange={handleInputChange}
            placeholder="www.redmapleplumbing.com"
            className="mx-auto max-w-[600px] mt-2 block w-full rounded-md border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500"
          />
          {errors.find((e) => e.path[0] === "websiteUrl") && (
            <p className="mt-2 text-sm text-red-600">
              {errors.find((e) => e.path[0] === "websiteUrl")?.message}
            </p>
          )}
        </div>
        <div>
            <Label
              htmlFor="tradeType"
              className="mx-auto max-w-[600px] block text-sm font-semibold text-gray-900"
            >
              Trade / service type
            </Label>
            <select
              id="tradeType"
              name="tradeType"
              value={formData.tradeType}
              onChange={handleInputChange}
              className="mx-auto max-w-[600px] mt-2 block w-full rounded-md border border-[#B5B6B5] bg-white px-4 py-2.5 text-gray-900 shadow-sm transition-colors focus:border-green-500 focus:ring-green-500"
            >
              <option value="" className="text-gray-400">
                Please select one
              </option>
              {tradeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.find((e) => e.path[0] === "tradeType") && (
              <p className="mt-2 text-sm text-red-600">
                {errors.find((e) => e.path[0] === "tradeType")?.message}
              </p>
            )}
          </div>
          <div>
            <Label
              htmlFor="numEmployees"
              className="mx-auto max-w-[600px] block text-sm font-semibold text-gray-900"
            >
              Number of employees
            </Label>
            <Input
              id="numEmployees"
              name="numEmployees"
              type="text"
              value={formData.numEmployees}
              onChange={handleInputChange}
              placeholder="5"
              className="mx-auto max-w-[600px] mt-2 block w-full rounded-md border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500"
            />
            {errors.find((e) => e.path[0] === "numEmployees") && (
              <p className="mt-2 text-sm text-red-600">
                {errors.find((e) => e.path[0] === "numEmployees")?.message}
              </p>
            )}
          </div>

        {/* Biggest Frustration */}
        <div>
          <Label
            htmlFor="biggestFrustration"
            className="mx-auto max-w-[600px] block text-sm font-semibold text-gray-900"
          >
            Biggest frustration with your website today
          </Label>
          <select
            id="biggestFrustration"
            name="biggestFrustration"
            value={formData.biggestFrustration}
            onChange={handleInputChange}
            className="mx-auto max-w-[600px] mt-2 block w-full rounded-md border border-[#B5B6B5] bg-white px-4 py-2.5 text-gray-900 shadow-sm transition-colors focus:border-green-500 focus:ring-green-500"
          >
            <option value="" className="text-gray-400">
              Please select one
            </option>
            {frustrationOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.find((e) => e.path[0] === "biggestFrustration") && (
            <p className="mt-2 text-sm text-red-600">
              {
                errors.find((e) => e.path[0] === "biggestFrustration")
                  ?.message
              }
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex w-full justify-center pt-2">
          <Button
            type="submit"
            disabled={!isFormValid || isLoading}
            className={`min-w-[264px] rounded-[360px] px-6 py-3 text-base font-semibold transition-all ${
              !isFormValid || isLoading
                ? "cursor-not-allowed bg-gray-200 text-gray-500"
                : "bg-green-500 text-[#1B4A41] shadow-sm hover:bg-green-600 hover:shadow-md active:scale-[0.98]"
            }`}
          >
            {isLoading ? (
               <span className="flex items-center justify-center">
                <svg
                  className="-ml-1 mr-3 h-5 w-5 animate-spin text-[#1B4A41]"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </span>
            ) : (
              "Continue to scheduling"
            )}
          </Button>
        </div>
      </form>

      {/* Privacy Notice */}
      <p className="w-full text-center text-sm leading-relaxed text-gray-500">
        We keep this simple and confidential. We'll never share your
        information, and we won't touch your website without permission.
      </p>
      </BookingCard>
    </BookingLayout>
  );
}
