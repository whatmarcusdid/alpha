export function CampaignGoalsWidget() {
  return (
    <section
      className="w-full max-w-[552px] rounded-lg bg-gray-100 px-4 py-[14px] lg:shrink-0"
      aria-labelledby="campaign-goals-heading"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2
          id="campaign-goals-heading"
          className="text-lg leading-[1.5] text-[#172554]"
        >
          30 day campaign goals
        </h2>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
          Placeholder
        </span>
      </div>
      <p className="mt-1 text-xs leading-[1.5] text-zinc-600">
        Design targets only — not connected to live metrics yet.
      </p>

      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-2xl leading-[1.2] tracking-[-0.24px] text-gray-950">150</p>
          <p className="text-base leading-[1.5] text-gray-950">Innovators Cohort members</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl leading-[1.2] tracking-[-0.24px] text-gray-950">6</p>
          <p className="text-base leading-[1.5] text-gray-950">written NPS reviews</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl leading-[1.2] tracking-[-0.24px] text-gray-950">$60k</p>
          <p className="text-base leading-[1.5] text-gray-950">gross revenue</p>
        </div>
      </div>
    </section>
  );
}
