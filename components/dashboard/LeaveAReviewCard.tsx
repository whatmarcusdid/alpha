type Props = {
  googleReviewUrl: string;
};

export function LeaveAReviewCard({ googleReviewUrl }: Props) {
  if (!googleReviewUrl) return null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold leading-[1.2] tracking-[-0.2px] text-gray-950 md:text-[22px] md:tracking-[-0.22px] lg:text-2xl lg:tracking-[-0.24px]">
        Share your experience
      </h2>
      <div className="rounded-lg border-2 border-gray-200 bg-white p-4">
        <p className="mb-2 text-lg font-semibold leading-[1.2] tracking-[-0.18px] text-gray-950 lg:text-xl lg:tracking-[-0.2px]">
          Happy with your fixes?
        </p>
        <p className="text-sm tracking-[-0.14px] leading-[1.5] text-zinc-600 mb-4">
          A quick review helps other trade business owners find us. Takes less than a minute.
        </p>
        <a
          href={googleReviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[40px] items-center rounded border-2 border-blue-700 px-4 py-2 text-sm font-semibold tracking-[-0.14px] text-blue-700 transition-colors hover:bg-blue-50"
        >
          Review on Google
        </a>
      </div>
    </div>
  );
}
