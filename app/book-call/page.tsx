'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z, ZodIssue } from "zod";
import { TSGLogo } from "@/components/ui/logo";
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
    "Plumbing",
    "HVAC",
    "Electrical",
    "Roofing",
    "Painting",
    "Landscaping",
    "General Contractor",
    "Other",
  ];

  const frustrationOptions = [
    "Forms break randomly",
    "It's slow on mobile",
    "Get more calls",
    "Rank better locally",
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
    console.log("Form submitted!");
    setIsLoading(true);

    const processedData = {
      ...formData,
      websiteUrl: formData.websiteUrl?.startsWith("http")
        ? formData.websiteUrl
        : `https://${formData.websiteUrl}`,
    };

    console.log("Processed data:", processedData);

    const result = bookingIntakeSchema.safeParse(processedData);

    if (!result.success) {
      console.log("Validation errors:", result.error.issues);
      setErrors(result.error.issues);
      setIsLoading(false);
      return;
    }

    console.log("Validation passed! Saving to Firestore...");
    setErrors([]);

    try {
      const docId = await saveBookingIntake(result.data);
      console.log("Saved to Firestore with ID:", docId);

      sessionStorage.setItem("bookingIntakeId", docId);
      console.log("Saved to sessionStorage:", docId);

      console.log("Navigating to /book-call/schedule...");
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

  useEffect(() => {
    console.log("Current form data:", formData);
    console.log("Is form valid:", isFormValid);
  }, [formData, isFormValid]);

  return (
    <div className="bg-stone-50 min-h-screen flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-md">
        <div className="flex justify-center mb-8">
          <TSGLogo />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Tell us a little about your business
          </h1>
          <p className="mt-2 text-gray-600">
            Help us make your Website Game Plan Call worth your time. This takes
            2-3 minutes. Your answers let us tailor the plan to your goals.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="min-h-[40px]"
              />
              {errors.find((e) => e.path[0] === "firstName") && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.find((e) => e.path[0] === "firstName")?.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="min-h-[40px]"
              />
              {errors.find((e) => e.path[0] === "lastName") && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.find((e) => e.path[0] === "lastName")?.message}
                </p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              name="businessName"
              value={formData.businessName}
              onChange={handleInputChange}
              className="min-h-[40px]"
            />
            {errors.find((e) => e.path[0] === "businessName") && (
              <p className="text-red-500 text-sm mt-1">
                {errors.find((e) => e.path[0] === "businessName")?.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Business Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="mike@redmapleplumbing.com"
              className="min-h-[40px]"
            />
            {errors.find((e) => e.path[0] === "email") && (
              <p className="text-red-500 text-sm mt-1">
                {errors.find((e) => e.path[0] === "email")?.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="websiteUrl">Website URL</Label>
            <Input
              id="websiteUrl"
              name="websiteUrl"
              value={formData.websiteUrl}
              onChange={handleInputChange}
              placeholder="https://example.com"
              className="min-h-[40px]"
            />
            {errors.find((e) => e.path[0] === "websiteUrl") && (
              <p className="text-red-500 text-sm mt-1">
                {errors.find((e) => e.path[0] === "websiteUrl")?.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="tradeType">What is your trade?</Label>
              <select
                id="tradeType"
                name="tradeType"
                value={formData.tradeType}
                onChange={handleInputChange}
                className="w-full min-h-[40px] border-gray-300 rounded-md shadow-sm"
              >
                <option value="">Select your trade</option>
                {tradeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.find((e) => e.path[0] === "tradeType") && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.find((e) => e.path[0] === "tradeType")?.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="numEmployees">Number of Employees</Label>
              <Input
                id="numEmployees"
                name="numEmployees"
                type="text"
                value={formData.numEmployees}
                onChange={handleInputChange}
                className="min-h-[40px]"
              />
              {errors.find((e) => e.path[0] === "numEmployees") && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.find((e) => e.path[0] === "numEmployees")?.message}
                </p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="biggestFrustration">
              What's your single biggest frustration with your website?
            </Label>
            <select
              id="biggestFrustration"
              name="biggestFrustration"
              value={formData.biggestFrustration}
              onChange={handleInputChange}
              className="w-full min-h-[40px] border-gray-300 rounded-md shadow-sm"
            >
              <option value="">Select your biggest frustration</option>
              {frustrationOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.find((e) => e.path[0] === "biggestFrustration") && (
              <p className="text-red-500 text-sm mt-1">
                {
                  errors.find((e) => e.path[0] === "biggestFrustration")
                    ?.message
                }
              </p>
            )}
          </div>
          <Button
            type="submit"
            className={`w-full min-h-[40px] rounded-md font-medium transition-colors ${
              !isFormValid || isLoading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? "Saving..." : "Continue to scheduling"}
          </Button>
        </form>
        <p className="text-center text-gray-600 text-sm mt-8">
          We keep this simple and confidential. We'll never share your
          information, and we won't touch your website without permission.
        </p>
      </div>
    </div>
  );
}
