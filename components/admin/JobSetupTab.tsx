'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CreditCard,
  Minus,
  Plus,
  UserRound,
} from 'lucide-react';

import { AdminLinkingDrawer } from '@/components/admin/AdminLinkingDrawer';
import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import { countJobSetupFieldsFilled, isJobSetupComplete } from '@/lib/fix-jobs/gates';
import { parseSerializedFixJob, type SerializedFixJob } from '@/lib/fix-jobs/serialize';
import type {
  AdminAuditLeadListItem,
  AdminClientListItem,
  AdminOrderListItem,
} from '@/lib/types/admin-linking';
import type { FixJobEntitlements } from '@/lib/types/fix-job';

type DrawerKind = 'client' | 'audit' | 'order' | null;

type Props = {
  job: SerializedFixJob;
  onJobUpdated: (job: SerializedFixJob) => void;
  onContinueToTriage: () => void;
};

const loopOptions: Array<{
  key: keyof FixJobEntitlements;
  label: string;
  description: string;
}> = [
  {
    key: 'speed',
    label: 'Speed',
    description: 'Core Web Vitals — LCP, CLS, TBT, PageSpeed score',
  },
  {
    key: 'security',
    label: 'Security',
    description: 'SSL, WAF, mixed content, plugin vulnerabilities',
  },
  {
    key: 'seo',
    label: 'SEO & AI Visibility Fix',
    description: 'Schema, meta tags, AI search presence, local SEO',
  },
];

function formatListDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoDate));
}

function formatCurrency(amount: number | null): string {
  if (amount == null) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

async function patchFixJob(
  fixJobId: string,
  body: Record<string, unknown>
): Promise<SerializedFixJob> {
  const response = await fetchWithAdminAuth(`/api/admin/fix-jobs/${fixJobId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to update fix job');
  }

  return payload.data as SerializedFixJob;
}

export function JobSetupTab({ job, onJobUpdated, onContinueToTriage }: Props) {
  const [activeDrawer, setActiveDrawer] = useState<DrawerKind>(null);
  const [linkedClient, setLinkedClient] = useState<AdminClientListItem | null>(null);
  const [linkedAudit, setLinkedAudit] = useState<AdminAuditLeadListItem | null>(null);
  const [linkedOrder, setLinkedOrder] = useState<AdminOrderListItem | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const parsedJob = parseSerializedFixJob(job);
  const filledCount = countJobSetupFieldsFilled(parsedJob);
  const setupComplete = isJobSetupComplete(parsedJob);

  useEffect(() => {
    let cancelled = false;

    async function loadLinkedEntities() {
      try {
        if (job.linkedUserId) {
          const response = await fetchWithAdminAuth('/api/admin/users');
          const payload = await response.json();
          if (!cancelled && response.ok) {
            const clients = payload.data as AdminClientListItem[];
            setLinkedClient(clients.find((item) => item.userId === job.linkedUserId) ?? null);
          }
        } else {
          setLinkedClient(null);
        }

        if (job.linkedAuditLeadId) {
          const response = await fetchWithAdminAuth('/api/admin/audit-leads');
          const payload = await response.json();
          if (!cancelled && response.ok) {
            const audits = payload.data as AdminAuditLeadListItem[];
            setLinkedAudit(
              audits.find((item) => item.auditLeadId === job.linkedAuditLeadId) ?? null
            );
          }
        } else {
          setLinkedAudit(null);
        }

        if (job.linkedOrderId) {
          const response = await fetchWithAdminAuth('/api/admin/orders');
          const payload = await response.json();
          if (!cancelled && response.ok) {
            const orders = payload.data as AdminOrderListItem[];
            setLinkedOrder(orders.find((item) => item.orderId === job.linkedOrderId) ?? null);
          }
        } else {
          setLinkedOrder(null);
        }
      } catch {
        if (!cancelled) {
          setLinkedClient(null);
          setLinkedAudit(null);
          setLinkedOrder(null);
        }
      }
    }

    void loadLinkedEntities();

    return () => {
      cancelled = true;
    };
  }, [job.linkedUserId, job.linkedAuditLeadId, job.linkedOrderId]);

  async function applyPatch(body: Record<string, unknown>) {
    setIsSaving(true);
    try {
      const updated = await patchFixJob(job.id, body);
      onJobUpdated(updated);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEntitlementChange(key: keyof FixJobEntitlements, checked: boolean) {
    await applyPatch({
      entitlements: {
        ...job.entitlements,
        [key]: checked,
      },
    });
  }

  async function handleContinue() {
    if (!setupComplete) {
      return;
    }

    await applyPatch({ stage: 'Triage' });
    onContinueToTriage();
  }

  return (
    <>
      <div className="mx-auto max-w-[900px] pb-32">
        <header className="mb-6">
          <h2 className="text-2xl leading-[1.2] tracking-[-0.24px] text-gray-950">Job setup</h2>
          <p className="mt-2 text-base leading-[1.35] text-zinc-600">
            All fields required to advance to Triage
          </p>
        </header>

        <div className="flex flex-col gap-6">
          <section>
            <h3 className="mb-2 text-lg leading-[1.5] text-gray-950">Client account</h3>
            <SetupLinkRow
              icon={<UserRound className="h-6 w-6 text-zinc-500" aria-hidden="true" />}
              isFilled={job.linkedUserId !== null}
              emptyLabel="No client account added"
              onAdd={() => setActiveDrawer('client')}
              onRemove={() => applyPatch({ linkedUserId: null })}
              filledTitle={linkedClient?.businessName ?? 'Linked client'}
              filledMeta={
                linkedClient
                  ? [linkedClient.contactName, linkedClient.websiteUrl, linkedClient.industry]
                      .filter(Boolean)
                      .join(' · ')
                  : ''
              }
            />
          </section>

          <hr className="border-gray-200" />

          <section>
            <h3 className="mb-2 text-lg leading-[1.5] text-gray-950">Linked site audit</h3>
            <SetupLinkRow
              icon={<BarChart3 className="h-6 w-6 text-zinc-500" aria-hidden="true" />}
              isFilled={job.linkedAuditLeadId !== null}
              emptyLabel="No site audit added"
              onAdd={() => setActiveDrawer('audit')}
              onRemove={() => applyPatch({ linkedAuditLeadId: null })}
              filledTitle={linkedAudit?.displayId ?? 'Linked audit'}
              filledMeta={
                linkedAudit
                  ? `${linkedAudit.websiteUrl} · ${formatListDate(linkedAudit.timestamp)}`
                  : ''
              }
            />
          </section>

          <hr className="border-gray-200" />

          <section>
            <h3 className="mb-2 text-lg leading-[1.5] text-gray-950">Linked order</h3>
            <SetupLinkRow
              icon={<CreditCard className="h-6 w-6 text-zinc-500" aria-hidden="true" />}
              isFilled={job.linkedOrderId !== null}
              emptyLabel="No linked order added"
              onAdd={() => setActiveDrawer('order')}
              onRemove={() => applyPatch({ linkedOrderId: null })}
              filledTitle={linkedOrder ? `#${linkedOrder.displayId}` : 'Linked order'}
              filledMeta={
                linkedOrder
                  ? `${linkedOrder.skuDescription} · ${formatCurrency(linkedOrder.amount)} · ${formatListDate(linkedOrder.timestamp)}`
                  : ''
              }
            />
          </section>

          <section>
            <h3 className="mb-2 text-lg leading-[1.5] text-gray-950">Active fix loops</h3>
            <div className="flex flex-col gap-2">
              {loopOptions.map((option) => (
                <label
                  key={option.key}
                  className="flex items-start gap-3 rounded-md p-2 hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold leading-[1.35] text-gray-950">
                      {option.label}
                    </p>
                    <p className="text-base leading-[1.35] text-zinc-600">{option.description}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={job.entitlements[option.key]}
                    disabled={isSaving}
                    onChange={(event) =>
                      handleEntitlementChange(option.key, event.target.checked)
                    }
                    className="mt-1 h-6 w-6 shrink-0 rounded border-2 border-zinc-400 accent-[#1D4ED8]"
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs leading-[1.5] tracking-[-0.12px] text-zinc-600">
              Only selected loops will appear in Fix Execution. This should match the purchased
              package.
            </p>
          </section>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white px-6 py-5 shadow-[0_-1px_20px_rgba(85,85,85,0.1)] lg:px-10">
        <div className="mx-auto flex max-w-[1408px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={`text-lg leading-[1.5] ${
              setupComplete ? 'text-green-700' : 'text-[#545552]'
            }`}
          >
            {setupComplete
              ? `Setup complete • ${filledCount} of 4 fields filled`
              : `Setup incomplete • ${filledCount} of 4 fields filled`}
          </p>

          <button
            type="button"
            disabled={!setupComplete || isSaving}
            onClick={handleContinue}
            className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border-2 px-6 py-2 text-base font-semibold uppercase ${
              setupComplete
                ? 'border-[#1D4ED8] bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
                : 'cursor-not-allowed border-zinc-400 text-zinc-400'
            }`}
          >
            Continue to triage
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </footer>

      {activeDrawer === 'client' && (
        <AdminLinkingDrawer
          kind="client"
          isOpen
          linkedId={job.linkedUserId}
          onClose={() => setActiveDrawer(null)}
          onSelect={(userId) => applyPatch({ linkedUserId: userId })}
          onRemove={() => applyPatch({ linkedUserId: null })}
        />
      )}

      {activeDrawer === 'audit' && (
        <AdminLinkingDrawer
          kind="audit"
          isOpen
          linkedId={job.linkedAuditLeadId}
          onClose={() => setActiveDrawer(null)}
          onSelect={(auditLeadId) => applyPatch({ linkedAuditLeadId: auditLeadId })}
          onRemove={() => applyPatch({ linkedAuditLeadId: null })}
        />
      )}

      {activeDrawer === 'order' && (
        <AdminLinkingDrawer
          kind="order"
          isOpen
          linkedId={job.linkedOrderId}
          onClose={() => setActiveDrawer(null)}
          onSelect={(orderId) => applyPatch({ linkedOrderId: orderId })}
          onRemove={() => applyPatch({ linkedOrderId: null })}
        />
      )}
    </>
  );
}

type SetupLinkRowProps = {
  icon: React.ReactNode;
  isFilled: boolean;
  emptyLabel: string;
  filledTitle: string;
  filledMeta: string;
  onAdd: () => void;
  onRemove: () => void;
};

function SetupLinkRow({
  icon,
  isFilled,
  emptyLabel,
  filledTitle,
  filledMeta,
  onAdd,
  onRemove,
}: SetupLinkRowProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg py-2">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        {isFilled ? (
          <>
            <p className="text-base font-semibold leading-[1.35] text-gray-950">{filledTitle}</p>
            {filledMeta && (
              <p className="text-base leading-[1.35] text-zinc-600">{filledMeta}</p>
            )}
          </>
        ) : (
          <p className="text-base font-semibold leading-[1.35] text-zinc-400">{emptyLabel}</p>
        )}
      </div>

      {isFilled ? (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-2 text-base font-semibold uppercase text-zinc-400 hover:text-zinc-600"
        >
          <Minus className="h-5 w-5" aria-hidden="true" />
          Remove
        </button>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 text-base font-semibold uppercase text-[#1D4ED8] hover:underline"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Add
        </button>
      )}
    </div>
  );
}
