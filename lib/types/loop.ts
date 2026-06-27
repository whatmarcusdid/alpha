export type LoopKey = 'speed' | 'security' | 'seo';

export type LoopStatus = 'pending' | 'in_progress' | 'complete';

export type PhaseKey = 'phase0' | 'phase1' | 'phase2' | 'phase3' | 'phase4';

export type PhaseCompletion = {
  phase0: boolean;
  phase1: boolean;
  phase2: boolean;
  phase3: boolean;
  phase4: boolean;
};

/**
 * v0 loop execution log.
 * Firestore path: fixJobs/{fixJobId}/loops/{loopKey}
 */
export type LoopDocV0 = {
  loopKey: LoopKey;
  status: LoopStatus;
  checkedTasks: string[];
  phaseCompletion: PhaseCompletion;
  completedAt: Date | null;
};

export type SerializedLoopDocV0 = Omit<LoopDocV0, 'completedAt'> & {
  completedAt: string | null;
};

export type ApprovalGate = 'execution_start';

/**
 * Firestore path: fixJobs/{fixJobId}/approvals/{autoId}
 */
export type ApprovalDoc = {
  gate: ApprovalGate;
  approvedBy: string;
  approvedAt: Date;
};

export type QAResult = 'pass' | 'flag' | 'fail' | null;

export type QAItemState = {
  result: QAResult;
  flagNote: string | null;
};

/**
 * Firestore path: fixJobs/{fixJobId}/qa/current
 */
export type QADoc = {
  overallStatus: 'not_started' | 'in_progress' | 'passed' | 'failed';
  qaCompletedAt: Date | null;
  items: Record<string, QAItemState>;
};

export type SerializedQADoc = Omit<QADoc, 'qaCompletedAt'> & {
  qaCompletedAt: string | null;
};
