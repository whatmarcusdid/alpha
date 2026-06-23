import {
  SecurityFlag,
  SecurityFlagTier,
  Grade,
  TIER1_FLAGS,
  TIER2_FLAGS,
} from '@/lib/types/audit';

export function gradeSecurity(flags: SecurityFlag[]): {
  grade: Grade;
  flagTier: SecurityFlagTier;
} {
  if (flags.some(f => TIER1_FLAGS.has(f))) {
    return { grade: 'F', flagTier: 'tier1' };
  }

  const hasTier2 = flags.some(f => TIER2_FLAGS.has(f));
  const advisoryCount = flags.filter(
    f => !TIER1_FLAGS.has(f) && !TIER2_FLAGS.has(f)
  ).length;

  if (hasTier2) {
    return {
      grade: advisoryCount >= 4 ? 'F' : 'D',
      flagTier: 'tier2',
    };
  }

  if (advisoryCount === 0) return { grade: 'A', flagTier: 'none' };
  if (advisoryCount === 1) return { grade: 'B', flagTier: 'advisory' };
  if (advisoryCount === 2) return { grade: 'C', flagTier: 'advisory' };
  if (advisoryCount === 3) return { grade: 'D', flagTier: 'advisory' };
  return { grade: 'F', flagTier: 'advisory' };
}
