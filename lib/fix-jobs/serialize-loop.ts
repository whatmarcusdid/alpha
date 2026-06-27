import type {
  LoopDocV0,
  QADoc,
  SerializedLoopDocV0,
  SerializedQADoc,
} from '@/lib/types/loop';

export type { SerializedLoopDocV0, SerializedQADoc };

export function serializeLoopDoc(doc: LoopDocV0): SerializedLoopDocV0 {
  return {
    ...doc,
    completedAt: doc.completedAt ? doc.completedAt.toISOString() : null,
  };
}

export function parseSerializedLoopDoc(data: SerializedLoopDocV0): LoopDocV0 {
  return {
    ...data,
    completedAt: data.completedAt ? new Date(data.completedAt) : null,
  };
}

export function serializeQADoc(doc: QADoc): SerializedQADoc {
  return {
    ...doc,
    qaCompletedAt: doc.qaCompletedAt ? doc.qaCompletedAt.toISOString() : null,
  };
}

export function parseSerializedQADoc(data: SerializedQADoc): QADoc {
  return {
    ...data,
    qaCompletedAt: data.qaCompletedAt ? new Date(data.qaCompletedAt) : null,
  };
}
