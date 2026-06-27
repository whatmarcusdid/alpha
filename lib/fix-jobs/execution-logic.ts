import type { PhaseKey } from '@/lib/fix-jobs/task-registry';
import { PHASE_TASKS } from '@/lib/fix-jobs/task-registry';
import type { FixJobEntitlements } from '@/lib/types/fix-job';
import type { LoopDocV0, LoopKey, PhaseCompletion } from '@/lib/types/loop';

export function getEnabledLoopKeys(entitlements: FixJobEntitlements): LoopKey[] {
  const keys: LoopKey[] = [];
  if (entitlements.speed) keys.push('speed');
  if (entitlements.security) keys.push('security');
  if (entitlements.seo) keys.push('seo');
  return keys;
}

export function getTaskIdsForPhase(phase: PhaseKey): string[] {
  return PHASE_TASKS[phase].map((task) => task.id);
}

export function getLoopKeysForTask(taskId: string, entitlements: FixJobEntitlements): LoopKey[] {
  const enabled = getEnabledLoopKeys(entitlements);

  if (taskId.startsWith('p0_') || taskId.startsWith('p4_')) {
    return enabled;
  }

  if (taskId.startsWith('p1_')) {
    return entitlements.security ? ['security'] : [];
  }

  if (taskId.startsWith('p2_')) {
    return entitlements.speed ? ['speed'] : [];
  }

  if (taskId.startsWith('p3_')) {
    return entitlements.seo ? ['seo'] : [];
  }

  return enabled;
}

export function isPhaseApplicable(
  phase: PhaseKey,
  entitlements: FixJobEntitlements
): boolean {
  if (phase === 'phase0' || phase === 'phase4') return true;
  if (phase === 'phase1') return entitlements.security;
  if (phase === 'phase2') return entitlements.speed;
  if (phase === 'phase3') return entitlements.seo;
  return false;
}

export function computePhaseCompletion(
  checkedTasks: string[],
  entitlements: FixJobEntitlements
): PhaseCompletion {
  const phases: PhaseKey[] = ['phase0', 'phase1', 'phase2', 'phase3', 'phase4'];

  const result: PhaseCompletion = {
    phase0: false,
    phase1: false,
    phase2: false,
    phase3: false,
    phase4: false,
  };

  for (const phase of phases) {
    if (!isPhaseApplicable(phase, entitlements)) {
      result[phase] = true;
      continue;
    }

    const taskIds = getTaskIdsForPhase(phase);
    result[phase] = taskIds.every((id) => checkedTasks.includes(id));
  }

  return result;
}

export function getTasksForLoop(
  loopKey: LoopKey,
  entitlements: FixJobEntitlements
): string[] {
  const tasks: string[] = [];

  tasks.push(...getTaskIdsForPhase('phase0'));

  if (loopKey === 'security' && entitlements.security) {
    tasks.push(...getTaskIdsForPhase('phase1'));
  }

  if (loopKey === 'speed' && entitlements.speed) {
    tasks.push(...getTaskIdsForPhase('phase2'));
  }

  if (loopKey === 'seo' && entitlements.seo) {
    tasks.push(...getTaskIdsForPhase('phase3'));
  }

  tasks.push(...getTaskIdsForPhase('phase4'));

  return tasks;
}

export function computeLoopStatus(
  loopDoc: Pick<LoopDocV0, 'checkedTasks' | 'status'>,
  loopKey: LoopKey,
  entitlements: FixJobEntitlements
): 'pending' | 'in_progress' | 'complete' {
  const requiredTasks = getTasksForLoop(loopKey, entitlements);
  const checkedCount = requiredTasks.filter((id) =>
    loopDoc.checkedTasks.includes(id)
  ).length;

  if (checkedCount === 0) {
    return 'pending';
  }

  if (checkedCount === requiredTasks.length) {
    return 'complete';
  }

  return 'in_progress';
}

export function countCompletedPhases(
  loopDocs: LoopDocV0[],
  entitlements: FixJobEntitlements
): number {
  const mergedChecked = new Set<string>();
  for (const doc of loopDocs) {
    for (const taskId of doc.checkedTasks) {
      mergedChecked.add(taskId);
    }
  }

  const phaseCompletion = computePhaseCompletion([...mergedChecked], entitlements);
  const phases: PhaseKey[] = ['phase0', 'phase1', 'phase2', 'phase3', 'phase4'];

  return phases.filter((phase) => phaseCompletion[phase]).length;
}

export function areAllPhasesComplete(
  loopDocs: LoopDocV0[],
  entitlements: FixJobEntitlements
): boolean {
  return countCompletedPhases(loopDocs, entitlements) === 5;
}

export function getPurchasedLoopsLabel(entitlements: FixJobEntitlements): string {
  const parts: string[] = [];

  if (entitlements.speed) parts.push('Speed');
  if (entitlements.security) parts.push('Security');
  if (entitlements.seo) parts.push('SEO & AI Visibility Fix');

  if (parts.length === 0) {
    return '[purchased loops]';
  }

  if (parts.length === 1) {
    const single = parts[0];
    return single.includes('Fix') ? single : `${single} fix`;
  }

  const last = parts[parts.length - 1];
  const prefix = parts.slice(0, -1).join(' + ');
  const lastLabel = last.includes('Fix') ? last : `${last} fix`;
  return `${prefix} + ${lastLabel}`;
}
