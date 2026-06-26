export default function WhileYouWaitCard() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold leading-[1.2] tracking-[-0.2px] text-gray-950 md:text-[22px] md:tracking-[-0.22px] lg:text-2xl lg:tracking-[-0.24px]">
        While you wait
      </h2>
      <div className="rounded-lg border-2 border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-2">
          <p className="text-lg font-semibold leading-[1.2] tracking-[-0.18px] text-gray-950 lg:text-xl lg:tracking-[-0.2px]">
            Have a question about the fixes?
          </p>
          <p className="text-sm tracking-[-0.14px] leading-[1.5] text-zinc-600">
            Reach out to our team anytime during the next 48 hours — we&apos;re happy to walk you through what&apos;s being done.
          </p>
        </div>
      </div>
    </div>
  );
}
