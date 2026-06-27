'use client';

import { useRouter, useSearchParams } from 'next/navigation';

type StateOption = {
  key: string;
  label: string;
};

type Props = {
  states: StateOption[];
  currentState: string;
  basePath: string;
};

export function PreviewStateSelector({ states, currentState, basePath }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSelect(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('state', key);
    router.replace(`${basePath}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="mb-6 rounded-lg border border-dashed border-[#1D4ED8]/40 bg-[#EFF6FF] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full bg-[#1D4ED8] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
          Preview
        </span>
        <p className="text-sm font-medium text-gray-950">Select a fixture state</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {states.map((state) => {
          const isActive = state.key === currentState;

          return (
            <button
              key={state.key}
              type="button"
              onClick={() => handleSelect(state.key)}
              className={`min-h-[40px] rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? 'border-[#1D4ED8] bg-[#2563EB] text-white'
                  : 'border-gray-300 bg-white text-gray-950 hover:border-gray-400'
              }`}
            >
              {state.label}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-zinc-600">
        Switch preview:{' '}
        <a
          href={
            basePath.includes('admin-dashboard')
              ? '/admin/preview/client-dashboard?state=awaiting-setup'
              : '/admin/preview/admin-dashboard?state=job-setup-empty'
          }
          className="font-semibold text-[#1D4ED8] hover:underline"
        >
          {basePath.includes('admin-dashboard') ? 'Client dashboard' : 'Admin dashboard'}
        </a>
      </p>
    </div>
  );
}
