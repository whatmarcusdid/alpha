'use client';

import { useEffect, useMemo, useState } from 'react';

import { submitHostingContextConfirm } from '@/lib/fix-jobs/hosting-context-actions';
import {
  CMS_PLATFORM_OPTIONS,
  HOSTING_PROVIDER_OPTIONS,
  addPluginTag,
  buildHostingContextSummary,
  getGeneratePlanTooltip,
  isHostingContextFormValid,
  removePluginTag,
} from '@/lib/fix-jobs/hosting-context-ui';
import type { HostingContextPayload } from '@/lib/types/hosting-context';

type HostingContextModuleProps = {
  fixJobId: string;
  uid: string;
  hostingContext: HostingContextPayload;
  onConfirmed: (updated: HostingContextPayload) => void;
};

function normalizeHostSelectValue(host: string): string {
  if (!host) {
    return '';
  }

  if (HOSTING_PROVIDER_OPTIONS.some((option) => option.value === host)) {
    return host;
  }

  return 'other';
}

export function HostingContextModule({
  fixJobId,
  uid,
  hostingContext,
  onConfirmed,
}: HostingContextModuleProps) {
  const [isEditing, setIsEditing] = useState(!hostingContext.isConfirmed);
  const [host, setHost] = useState(normalizeHostSelectValue(hostingContext.host));
  const [hostLabel, setHostLabel] = useState(hostingContext.hostLabel ?? '');
  const [cms, setCms] = useState(hostingContext.cms || '');
  const [cmsVersion, setCmsVersion] = useState(hostingContext.cmsVersion ?? '');
  const [plugins, setPlugins] = useState<string[]>(hostingContext.plugins ?? []);
  const [pluginDraft, setPluginDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setHost(normalizeHostSelectValue(hostingContext.host));
    setHostLabel(hostingContext.hostLabel ?? '');
    setCms(hostingContext.cms || '');
    setCmsVersion(hostingContext.cmsVersion ?? '');
    setPlugins(hostingContext.plugins ?? []);
    setIsEditing(!hostingContext.isConfirmed);
  }, [hostingContext]);

  const summary = useMemo(
    () =>
      buildHostingContextSummary({
        host: hostingContext.host,
        hostLabel: hostingContext.hostLabel,
        cms: hostingContext.cms,
        cmsVersion: hostingContext.cmsVersion,
        plugins: hostingContext.plugins,
      }),
    [hostingContext]
  );

  const canSubmit = isHostingContextFormValid({ host, hostLabel, cms });
  const generateTooltip = getGeneratePlanTooltip(hostingContext.isConfirmed);

  function resetFormFromContext(context: HostingContextPayload) {
    setHost(normalizeHostSelectValue(context.host));
    setHostLabel(context.hostLabel ?? '');
    setCms(context.cms || '');
    setCmsVersion(context.cmsVersion ?? '');
    setPlugins(context.plugins ?? []);
  }

  function handleAddPlugin() {
    setPlugins((current) => addPluginTag(current, pluginDraft));
    setPluginDraft('');
  }

  async function handleConfirm() {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const result = await submitHostingContextConfirm({
      fixJobId,
      uid,
      host,
      hostLabel: host === 'other' ? hostLabel.trim() : undefined,
      cms,
      cmsVersion: cmsVersion.trim() || undefined,
      plugins,
    });

    setSubmitting(false);

    if (!result.success) {
      setSubmitError(result.error);
      return;
    }

    onConfirmed(result.hostingContext);
    setIsEditing(false);
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-lg border border-gray-200 bg-[#FAF9F5] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-950">Hosting Context</p>
            <p className="mt-1 text-xs text-zinc-500">
              Confirm the customer&apos;s hosting stack before generating AI fix plans.
            </p>
          </div>
          {!isEditing && hostingContext.isConfirmed ? (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
              ✓ Confirmed
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              ⚠ Confirm before generating AI plan
            </span>
          )}
        </div>

        {!isEditing && hostingContext.isConfirmed ? (
          <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
            <p className="text-sm text-gray-800">{summary}</p>
            <button
              type="button"
              onClick={() => {
                resetFormFromContext(hostingContext);
                setIsEditing(true);
                setSubmitError(null);
              }}
              className="text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="hostingContextHost" className="block text-sm font-medium text-gray-950">
                  Host
                </label>
                <select
                  id="hostingContextHost"
                  value={host}
                  onChange={(event) => setHost(event.target.value)}
                  className="mt-2 min-h-[40px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select host…</option>
                  {HOSTING_PROVIDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="hostingContextCms" className="block text-sm font-medium text-gray-950">
                  CMS
                </label>
                <select
                  id="hostingContextCms"
                  value={cms}
                  onChange={(event) => setCms(event.target.value)}
                  className="mt-2 min-h-[40px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select CMS…</option>
                  {CMS_PLATFORM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="hostingContextCmsVersion"
                  className="block text-sm font-medium text-gray-950"
                >
                  Version
                </label>
                <input
                  id="hostingContextCmsVersion"
                  type="text"
                  value={cmsVersion}
                  onChange={(event) => setCmsVersion(event.target.value)}
                  placeholder="6.4"
                  className="mt-2 min-h-[40px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {host === 'other' && (
              <div>
                <label htmlFor="hostingContextHostLabel" className="block text-sm font-medium text-gray-950">
                  Other host name
                </label>
                <input
                  id="hostingContextHostLabel"
                  type="text"
                  value={hostLabel}
                  onChange={(event) => setHostLabel(event.target.value)}
                  placeholder="e.g. Pagely, Nexcess"
                  className="mt-2 min-h-[40px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            )}

            <div>
              <label htmlFor="hostingContextPluginDraft" className="block text-sm font-medium text-gray-950">
                Active plugins
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {plugins.map((plugin) => (
                  <span
                    key={plugin}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800"
                  >
                    {plugin}
                    <button
                      type="button"
                      aria-label={`Remove ${plugin}`}
                      onClick={() => setPlugins((current) => removePluginTag(current, plugin))}
                      className="min-h-[24px] min-w-[24px] rounded-full text-gray-600 hover:bg-gray-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  id="hostingContextPluginDraft"
                  type="text"
                  value={pluginDraft}
                  onChange={(event) => setPluginDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddPlugin();
                    }
                  }}
                  placeholder="Type a plugin name and press Enter"
                  className="min-h-[40px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddPlugin}
                  className="min-h-[40px] rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                >
                  + Add plugin
                </button>
              </div>
            </div>

            {submitError && <p className="text-sm text-red-700">{submitError}</p>}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!canSubmit || submitting}
                onClick={() => void handleConfirm()}
                className="min-h-[40px] rounded-full bg-[#9be382] px-4 py-2 text-sm font-semibold text-[#232521] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Confirming…' : 'Confirm hosting context'}
              </button>
              {hostingContext.isConfirmed && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    resetFormFromContext(hostingContext);
                    setIsEditing(false);
                    setSubmitError(null);
                  }}
                  className="min-h-[40px] rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div>
        {/* TODO: wire to POST /api/admin/generate-fix-plan once Gemini prompt passes quality gate */}
        <button
          type="button"
          disabled
          title={generateTooltip}
          className="min-h-[40px] cursor-not-allowed rounded-full bg-[#9be382] px-4 py-2 text-sm font-semibold text-[#232521] opacity-60"
        >
          Generate AI Fix Plan
        </button>
      </div>
    </div>
  );
}
