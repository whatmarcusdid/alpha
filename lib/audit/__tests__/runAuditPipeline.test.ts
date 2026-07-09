import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  fetchPageSpeed,
  extractSpeedTopIssues,
  gradeSpeed,
  checkSafeBrowsing,
  checkSucuri,
  checkHttpsSecurity,
  gradeSecurity,
  crawlPage,
  gradeSEO,
} = vi.hoisted(() => ({
  fetchPageSpeed: vi.fn(),
  extractSpeedTopIssues: vi.fn(),
  gradeSpeed: vi.fn(),
  checkSafeBrowsing: vi.fn(),
  checkSucuri: vi.fn(),
  checkHttpsSecurity: vi.fn(),
  gradeSecurity: vi.fn(),
  crawlPage: vi.fn(),
  gradeSEO: vi.fn(),
}));

vi.mock('@/lib/audit/pagespeed', () => ({ fetchPageSpeed }));
vi.mock('@/lib/audit/speedTopIssues', () => ({ extractSpeedTopIssues }));
vi.mock('@/lib/grading', () => ({ gradeSpeed, gradeSecurity }));
vi.mock('@/lib/audit/safeBrowsing', () => ({ checkSafeBrowsing }));
vi.mock('@/lib/audit/sucuri', () => ({ checkSucuri }));
vi.mock('@/lib/audit/httpsCheck', () => ({ checkHttpsSecurity }));
vi.mock('@/lib/audit/crawlPage', () => ({ crawlPage }));
vi.mock('@/lib/audit/gradeSEO', () => ({ gradeSEO }));

import { runAuditPipeline } from '@/lib/audit/runAuditPipeline';

describe('runAuditPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('speed pillar failure does not affect security or seo results', async () => {
    fetchPageSpeed.mockRejectedValue(new Error('psi down'));

    checkSafeBrowsing.mockResolvedValue({ success: true, flagged: false });
    checkSucuri.mockResolvedValue({
      success: true,
      flagged: false,
      missingHeadersCount: 0,
      outdatedCms: false,
    });
    checkHttpsSecurity.mockResolvedValue([]);
    gradeSecurity.mockReturnValue({ grade: 'A', flagTier: 'none' });

    crawlPage.mockResolvedValue('<html></html>');
    gradeSEO.mockReturnValue({
      seoGrade: 'B',
      seoScore: 80,
      seoFailingSignals: ['missing_title'],
    });

    const result = await runAuditPipeline('https://example.com', {
      speed: true,
      security: true,
      seo: true,
    });

    expect(result.speed?.status).toBe('failed');
    expect(result.security?.status).toBe('completed');
    expect(result.security?.data?.grade).toBe('A');
    expect(result.seo?.status).toBe('completed');
    expect(result.seo?.data?.grade).toBe('B');
  });

  it('seo pillar failure does not affect speed or security results', async () => {
    fetchPageSpeed.mockResolvedValue({
      success: true,
      data: { categories: { performance: { score: 0.9 } } },
      audits: {},
    });
    extractSpeedTopIssues.mockReturnValue(['lcp_slow']);
    gradeSpeed.mockReturnValue({ letterGrade: 'A', performanceScore: 90 });

    checkSafeBrowsing.mockResolvedValue({ success: true, flagged: false });
    checkSucuri.mockResolvedValue({
      success: true,
      flagged: false,
      missingHeadersCount: 0,
      outdatedCms: false,
    });
    checkHttpsSecurity.mockResolvedValue([]);
    gradeSecurity.mockReturnValue({ grade: 'B', flagTier: 'none' });

    crawlPage.mockRejectedValue(new Error('crawl failed'));

    const result = await runAuditPipeline('https://example.com', {
      speed: true,
      security: true,
      seo: true,
    });

    expect(result.speed?.status).toBe('completed');
    expect(result.security?.status).toBe('completed');
    expect(result.seo?.status).toBe('failed');
  });

  it('pillarSelection false skips that pillar entirely (no function calls)', async () => {
    const result = await runAuditPipeline('https://example.com', {
      speed: false,
      security: false,
      seo: false,
    });

    expect(result).toEqual({});
    expect(fetchPageSpeed).not.toHaveBeenCalled();
    expect(checkSafeBrowsing).not.toHaveBeenCalled();
    expect(crawlPage).not.toHaveBeenCalled();
  });

  it('all three pillars complete returns all three in result', async () => {
    fetchPageSpeed.mockResolvedValue({
      success: true,
      data: { categories: { performance: { score: 0.75 } } },
      audits: {},
    });
    extractSpeedTopIssues.mockReturnValue(['lcp_slow']);
    gradeSpeed.mockReturnValue({ letterGrade: 'C', performanceScore: 75 });

    checkSafeBrowsing.mockResolvedValue({ success: true, flagged: false });
    checkSucuri.mockResolvedValue({
      success: true,
      flagged: false,
      missingHeadersCount: 1,
      outdatedCms: false,
    });
    checkHttpsSecurity.mockResolvedValue(['no_https']);
    gradeSecurity.mockReturnValue({ grade: 'D', flagTier: 'advisory' });

    crawlPage.mockResolvedValue('<html></html>');
    gradeSEO.mockReturnValue({
      seoGrade: 'F',
      seoScore: 40,
      seoFailingSignals: ['missing_meta_description'],
    });

    const result = await runAuditPipeline('https://example.com', {
      speed: true,
      security: true,
      seo: true,
    });

    expect(result.speed?.status).toBe('completed');
    expect(result.security?.status).toBe('completed');
    expect(result.seo?.status).toBe('completed');
    expect(result.speed?.data?.grade).toBe('C');
    expect(result.security?.data?.grade).toBe('D');
    expect(result.seo?.data?.grade).toBe('F');
  });
});
