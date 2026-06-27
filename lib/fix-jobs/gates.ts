import type { FixJob } from '@/lib/types/fix-job';

export function isJobSetupComplete(fixJob: FixJob): boolean {
  return (
    fixJob.linkedUserId !== null &&
    fixJob.linkedAuditLeadId !== null &&
    fixJob.linkedOrderId !== null &&
    (fixJob.entitlements.speed ||
      fixJob.entitlements.security ||
      fixJob.entitlements.seo)
  );
}

export function countJobSetupFieldsFilled(fixJob: FixJob): number {
  let count = 0;

  if (fixJob.linkedUserId !== null) count += 1;
  if (fixJob.linkedAuditLeadId !== null) count += 1;
  if (fixJob.linkedOrderId !== null) count += 1;
  if (
    fixJob.entitlements.speed ||
    fixJob.entitlements.security ||
    fixJob.entitlements.seo
  ) {
    count += 1;
  }

  return count;
}

export function isTriageComplete(fixJob: FixJob): boolean {
  return countTriageFieldsFilled(fixJob) === 3;
}

export function countTriageFieldsFilled(fixJob: FixJob): number {
  let count = 0;

  if (fixJob.triage?.clientGoal?.trim()) count += 1;
  if (fixJob.triage?.complexity) count += 1;
  if (fixJob.triage?.expectedTurnaround?.trim()) count += 1;

  return count;
}

export function isExecutionStarted(fixJob: FixJob): boolean {
  return ['InProgress', 'QA', 'ReportReady', 'Delivered'].includes(fixJob.stage);
}

export function isFixExecutionComplete(fixJob: FixJob): boolean {
  return ['QA', 'ReportReady', 'Delivered'].includes(fixJob.stage);
}

export function isQaComplete(fixJob: FixJob): boolean {
  return (
    fixJob.qa?.overallStatus === 'passed' ||
    fixJob.stage === 'ReportReady' ||
    fixJob.stage === 'Delivered'
  );
}

export function isDeliveryTabEnabled(fixJob: FixJob): boolean {
  return fixJob.stage === 'ReportReady' || fixJob.stage === 'Delivered';
}

export type FixJobTabIndex = 0 | 1 | 2 | 3 | 4;

export type TabGateState = {
  jobSetup: boolean;
  triage: boolean;
  fixExecution: boolean;
  qa: boolean;
  delivery: boolean;
};

export function getTabGateState(fixJob: FixJob): TabGateState {
  const jobSetup = isJobSetupComplete(fixJob);
  const triage = isTriageComplete(fixJob);
  const fixExecution = isFixExecutionComplete(fixJob);
  const qa = isQaComplete(fixJob);
  const delivery = isDeliveryTabEnabled(fixJob);

  return {
    jobSetup: true,
    triage: jobSetup,
    fixExecution: triage,
    qa: fixExecution,
    delivery,
  };
}

export function isTabEnabled(fixJob: FixJob, tabIndex: FixJobTabIndex): boolean {
  const gates = getTabGateState(fixJob);

  switch (tabIndex) {
    case 0:
      return gates.jobSetup;
    case 1:
      return gates.triage;
    case 2:
      return gates.fixExecution;
    case 3:
      return gates.qa;
    case 4:
      return gates.delivery;
    default:
      return false;
  }
}
