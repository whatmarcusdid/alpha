import Link from 'next/link';

const ADMIN_PREVIEWS = [
  {
    href: '/admin/preview/job-setup-empty',
    label: 'Job Setup — Empty state',
    question:
      'Does the empty state communicate what Marcus needs to do first? (Confirm hosting context → Phase 0 → start work)',
  },
  {
    href: '/admin/preview/job-setup-filled',
    label: 'Job Setup — Filled / confirmed',
    question: 'Is the transition from setup → active work clear?',
  },
  {
    href: '/admin/preview/fix-execution',
    label: 'Fix Execution — In progress',
    question:
      "Is the phase/task structure scannable during actual work? Can you tell at a glance what's done, what's in progress, what's next?",
  },
  {
    href: '/admin/preview/qa-in-progress',
    label: 'QA — In progress',
    question:
      'Does the QA panel feel natural? Is the Pass/Fail button sizing right? Is the before/after grade strip clear?',
  },
  {
    href: '/admin/preview/qa-passed',
    label: 'QA — Passed / gate unlocked',
    question: 'Is the gate-unlock moment clear? Does "Report Ready" feel like a milestone?',
  },
  {
    href: '/admin/preview/delivery-in-progress',
    label: 'Delivery — In progress',
    question:
      'Is the path from report generated → send delivery clear? Does the recipient display and Loom URL input feel right?',
  },
  {
    href: '/admin/preview/delivery-complete',
    label: 'Delivery — Complete',
    question:
      'Does the delivered state feel like a clear conclusion? Is the summary readable?',
  },
] as const;

const CLIENT_PREVIEWS = [
  {
    href: '/admin/preview/client/home-active',
    label: 'Client Home — Active fix in progress',
    question: 'Speed Fix in progress with one client update and Work Started milestone complete.',
  },
  {
    href: '/admin/preview/client/home-delivered',
    label: 'Client Home — Fix delivered',
    question: 'All milestones complete with report and Loom deliverables visible.',
  },
  {
    href: '/admin/preview/client/home-empty',
    label: 'Client Home — No active fix (empty)',
    question: 'Empty state when no active fix session is linked.',
  },
] as const;

export default function PreviewIndexPage() {
  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-900">
          Preview — fixture data only
        </p>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-gray-950">
          Preview Pages — Fix Job States (Smith&apos;s Plumbing / Speed Fix)
        </h1>
        <ul className="mt-4 space-y-4">
          {ADMIN_PREVIEWS.map((preview) => (
            <li key={preview.href} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <Link href={preview.href} className="text-base font-semibold text-blue-700 hover:text-blue-800">
                {preview.label}
              </Link>
              <p className="mt-1 text-sm text-zinc-600">{preview.question}</p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-gray-950">Preview Pages — Client Dashboard States</h2>
        <ul className="mt-4 space-y-4">
          {CLIENT_PREVIEWS.map((preview) => (
            <li key={preview.href} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <Link href={preview.href} className="text-base font-semibold text-blue-700 hover:text-blue-800">
                {preview.label}
              </Link>
              <p className="mt-1 text-sm text-zinc-600">{preview.question}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
