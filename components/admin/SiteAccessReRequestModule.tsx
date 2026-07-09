'use client';

import { useMemo, useState } from 'react';

import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import {
  ACCESS_TYPE_OPTIONS,
  EXPIRY_DAY_OPTIONS,
  getSiteAccessStatusChipClass,
  getSiteAccessStatusLabel,
  isScopeDescriptionValid,
  resolveSiteAccessDisplayStatus,
  shouldShowReRequestButton,
  shouldShowRevokeLink,
  shouldShowSiteAccessReRequestModule,
} from '@/lib/fix-jobs/site-access-rerequest-ui';
import {
  revokeSiteAccessReRequest,
  submitSiteAccessReRequest,
} from '@/lib/fix-jobs/site-access-rerequest-actions';
import type { FixJobStage } from '@/lib/types/fix-session';
import type {
  AccessType,
  SiteAccessRequestPayload,
} from '@/lib/types/site-access-request';

type SiteAccessReRequestModuleProps = {
  fixJobId: string;
  uid: string;
  stage: FixJobStage;
  siteAccessRequest: SiteAccessRequestPayload | null;
  onSiteAccessRequestChange: (next: SiteAccessRequestPayload | null) => void;
};

export function SiteAccessReRequestModule({
  fixJobId,
  uid,
  stage,
  siteAccessRequest,
  onSiteAccessRequestChange,
}: SiteAccessReRequestModuleProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [accessType, setAccessType] = useState<AccessType>('wp_admin');
  const [scopeDescription, setScopeDescription] = useState('');
  const [expiryDays, setExpiryDays] = useState<1 | 3 | 7 | 14>(7);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const displayStatus = resolveSiteAccessDisplayStatus(siteAccessRequest);
  const statusLabel = useMemo(
    () => getSiteAccessStatusLabel(displayStatus, siteAccessRequest?.expiresAt ?? null),
    [displayStatus, siteAccessRequest?.expiresAt]
  );

  if (!shouldShowSiteAccessReRequestModule(stage)) {
    return null;
  }

  const canSubmit = isScopeDescriptionValid(scopeDescription);

  async function handleSendReRequest() {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      const result = await submitSiteAccessReRequest({
        uid,
        sessionId: fixJobId,
        accessType,
        scopeDescription: scopeDescription.trim(),
        expiryDays,
      });

      if (!result.success) {
        setSubmitError(result.error);
        return;
      }

      onSiteAccessRequestChange(result.request);
      setFormOpen(false);
      setScopeDescription('');
      setExpiryDays(7);
      setSuccessMessage('Re-request sent — customer has been emailed.');
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Failed to send re-request'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke() {
    if (!siteAccessRequest) {
      return;
    }

    setRevoking(true);
    setRevokeError(null);

    try {
      const result = await revokeSiteAccessReRequest({
        requestId: siteAccessRequest.requestId,
        uid,
        current: siteAccessRequest,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      onSiteAccessRequestChange(result.request);
      setRevokeConfirmOpen(false);
      setSuccessMessage(null);
    } catch (error) {
      setRevokeError(
        error instanceof Error ? error.message : 'Failed to revoke access request'
      );
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-950">Site access re-request</p>
          <p className="mt-1 text-xs text-zinc-500">
            Use when submitted credentials didn&apos;t work or access expired mid-job.
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getSiteAccessStatusChipClass(displayStatus)}`}
        >
          {statusLabel}
        </span>
      </div>

      {successMessage && (
        <p className="mt-3 text-sm font-medium text-green-700">{successMessage}</p>
      )}

      {shouldShowReRequestButton(siteAccessRequest) && !formOpen && (
        <button
          type="button"
          onClick={() => {
            setFormOpen(true);
            setSubmitError(null);
            setSuccessMessage(null);
          }}
          className="mt-4 min-h-[40px] rounded-full bg-[#9be382] px-4 py-2 text-sm font-semibold text-[#232521] hover:bg-[#8dd370]"
        >
          Re-request site access
        </button>
      )}

      {formOpen && (
        <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
          <div>
            <label
              htmlFor="accessType"
              className="block text-sm font-medium text-gray-950"
            >
              Access type
            </label>
            <select
              id="accessType"
              value={accessType}
              onChange={(event) => setAccessType(event.target.value as AccessType)}
              className="mt-2 min-h-[40px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {ACCESS_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="scopeDescription"
              className="block text-sm font-medium text-gray-950"
            >
              What do we need access to?
            </label>
            <textarea
              id="scopeDescription"
              value={scopeDescription}
              onChange={(event) => setScopeDescription(event.target.value)}
              maxLength={500}
              placeholder="WordPress admin access to continue the security and speed fixes."
              className="mt-2 min-h-[100px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-zinc-500">
              {scopeDescription.trim().length} / 500 (minimum 10 characters)
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-950">Link expires after</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXPIRY_DAY_OPTIONS.map((days) => {
                const selected = expiryDays === days;
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setExpiryDays(days)}
                    className={`min-h-[40px] rounded-full px-4 py-2 text-sm font-medium ${
                      selected
                        ? 'bg-[#1B4A41] text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {days} day{days === 1 ? '' : 's'}
                  </button>
                );
              })}
            </div>
          </div>

          {submitError && <p className="text-sm text-red-700">{submitError}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={() => void handleSendReRequest()}
              className="min-h-[40px] rounded-full bg-[#9be382] px-4 py-2 text-sm font-semibold text-[#232521] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Send re-request'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setFormOpen(false);
                setSubmitError(null);
              }}
              className="min-h-[40px] rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {shouldShowRevokeLink(siteAccessRequest) && (
        <div className="mt-3">
          {!revokeConfirmOpen ? (
            <button
              type="button"
              onClick={() => {
                setRevokeConfirmOpen(true);
                setRevokeError(null);
              }}
              className="text-sm font-medium text-red-700 underline-offset-2 hover:underline"
            >
              Revoke access
            </button>
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-900">
                Revoke this access request? The customer&apos;s link will stop working.
              </p>
              {revokeError && <p className="mt-2 text-sm text-red-700">{revokeError}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={revoking}
                  onClick={() => void handleRevoke()}
                  className="min-h-[40px] rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {revoking ? 'Revoking…' : 'Confirm revoke'}
                </button>
                <button
                  type="button"
                  disabled={revoking}
                  onClick={() => setRevokeConfirmOpen(false)}
                  className="min-h-[40px] rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
