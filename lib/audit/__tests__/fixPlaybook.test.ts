import { describe, expect, it } from 'vitest'

import {
  FIX_PLAYBOOK,
  getPlaybookEntriesForPillar,
  getPlaybookEntry,
  getPillarForSignal,
  PHASE_0_PRECONDITIONS,
  type AllFixSignalKey,
} from '@/lib/audit/fixPlaybook'

describe('FIX_PLAYBOOK', () => {
  it('has an entry for every AllFixSignalKey', () => {
    const keys = Object.keys(FIX_PLAYBOOK) as AllFixSignalKey[]
    expect(keys).toHaveLength(39)
  })
})

describe('getPlaybookEntriesForPillar', () => {
  it('returns 8 speed entries', () => {
    expect(getPlaybookEntriesForPillar('speed')).toHaveLength(8)
  })

  it('returns 10 security entries', () => {
    expect(getPlaybookEntriesForPillar('security')).toHaveLength(10)
  })

  it('returns 21 SEO entries', () => {
    expect(getPlaybookEntriesForPillar('seo_ai_visibility')).toHaveLength(21)
  })
})

describe('getPlaybookEntry', () => {
  it('returns the entry for a known signal key', () => {
    const entry = getPlaybookEntry('oversized_images')
    expect(entry.signalKey).toBe('oversized_images')
    expect(entry.pillar).toBe('speed')
    expect(entry.title).toBeTruthy()
  })
})

describe('getPillarForSignal', () => {
  it('maps speed keys to speed pillar', () => {
    expect(getPillarForSignal('render_blocking_resources')).toBe('speed')
  })

  it('maps security keys to security pillar', () => {
    expect(getPillarForSignal('no_https')).toBe('security')
  })

  it('maps SEO keys to seo_ai_visibility pillar', () => {
    expect(getPillarForSignal('missing_title_tag')).toBe('seo_ai_visibility')
  })
})

describe('FIX_PLAYBOOK content quality', () => {
  it('has no TODO strings in any entry', () => {
    const entries = Object.values(FIX_PLAYBOOK)
    for (const entry of entries) {
      expect(entry.verification).not.toContain('TODO')
      expect(entry.clientSummaryTemplate).not.toContain('TODO')
      for (const step of entry.steps) {
        expect(step.instruction).not.toContain('TODO')
      }
    }
  })

  it('every entry has at least 3 steps with non-empty instructions and a non-empty verification', () => {
    const entries = Object.entries(FIX_PLAYBOOK)
    for (const [key, entry] of entries) {
      expect(entry.steps.length).toBeGreaterThanOrEqual(3)
      for (const step of entry.steps) {
        expect(step.instruction.trim().length).toBeGreaterThan(0)
      }
      expect(entry.verification.trim().length).toBeGreaterThan(0)
    }
  })

  it('no clientSummaryTemplate contains a denylisted tool name', () => {
    const denylist = [
      'WP Rocket',
      'Perfmatters',
      'ShortPixel',
      'Sucuri',
      'MalCare',
      'Yoast',
      'Rank Math',
      'AIOSEO',
      'Asset CleanUp',
      'GTmetrix',
      'Query Monitor',
    ]
    const entries = Object.values(FIX_PLAYBOOK)
    for (const entry of entries) {
      for (const term of denylist) {
        expect(entry.clientSummaryTemplate).not.toContain(term)
      }
    }
  })

  it('per-pillar estimatedMinutes sums fall within target ranges', () => {
    const speedTotal = getPlaybookEntriesForPillar('speed').reduce(
      (sum, e) => sum + e.estimatedMinutes,
      0
    )
    const securityTotal = getPlaybookEntriesForPillar('security').reduce(
      (sum, e) => sum + e.estimatedMinutes,
      0
    )
    const seoTotal = getPlaybookEntriesForPillar('seo_ai_visibility').reduce(
      (sum, e) => sum + e.estimatedMinutes,
      0
    )

    expect(speedTotal).toBeGreaterThanOrEqual(180)
    expect(speedTotal).toBeLessThanOrEqual(240)
    expect(securityTotal).toBeGreaterThanOrEqual(270)
    expect(securityTotal).toBeLessThanOrEqual(330)
    expect(seoTotal).toBeGreaterThanOrEqual(90)
    expect(seoTotal).toBeLessThanOrEqual(130)
  })

  it('PHASE_0_PRECONDITIONS exports exactly 5 steps with no TODO content', () => {
    expect(PHASE_0_PRECONDITIONS).toHaveLength(5)
    for (const step of PHASE_0_PRECONDITIONS) {
      expect(step.instruction).not.toContain('TODO')
      expect(step.instruction.trim().length).toBeGreaterThan(0)
    }
  })
})
