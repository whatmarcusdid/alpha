'use client';

import { PrimaryButton } from '@/components/ui/PrimaryButton';

type Props = {
  firstName: string;
  packageLabel: string | null;
  onDismiss: () => void;
};

const STEPS = [
  {
    icon: '🔑',
    title: 'Share access',
    description: "We'll ask for your website login so we can get to work.",
  },
  {
    icon: '🔧',
    title: 'We fix your site',
    description:
      'Our team works through Speed, Security, and SEO & AI Visibility fixes over 48 hours.',
  },
  {
    icon: '📋',
    title: 'You get a report',
    description: "When we're done, you'll get a full report and walkthrough.",
  },
] as const;

export function WelcomeModule({ firstName, packageLabel, onDismiss }: Props) {
  return (
    <section
      className="mb-6 rounded-lg border-2 border-blue-200 bg-[#EFF6FF] p-4 md:p-6"
      aria-labelledby="welcome-module-heading"
    >
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-1">
          <h2
            id="welcome-module-heading"
            className="text-xl font-semibold leading-[1.2] tracking-[-0.2px] text-gray-950 md:text-[22px] md:tracking-[-0.22px] lg:text-2xl lg:tracking-[-0.24px]"
          >
            Welcome, {firstName}! You&apos;re in the right place.
          </h2>
          {packageLabel != null && (
            <p className="text-base leading-[1.5] text-zinc-600 lg:text-lg">
              You purchased: {packageLabel}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="flex flex-1 flex-col gap-2 rounded-lg border border-blue-100 bg-white p-4"
            >
              <p className="text-sm font-semibold tracking-[-0.14px] text-blue-600">
                Step {index + 1}
              </p>
              <p className="text-base font-semibold leading-[1.5] text-gray-950">
                <span aria-hidden="true">{step.icon} </span>
                {step.title}
              </p>
              <p className="text-sm leading-[1.5] tracking-[-0.14px] text-zinc-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-start">
          <PrimaryButton type="button" onClick={onDismiss} className="min-h-[40px]">
            Got it
          </PrimaryButton>
        </div>
      </div>
    </section>
  );
}
