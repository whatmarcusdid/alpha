import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPagesCreate = vi.fn();
const mockPagesUpdate = vi.fn();
const mockDataSourcesQuery = vi.fn();

vi.mock('@notionhq/client', () => ({
  Client: vi.fn().mockImplementation(() => ({
    pages: {
      create: mockPagesCreate,
      update: mockPagesUpdate,
    },
    dataSources: {
      query: mockDataSourcesQuery,
    },
  })),
}));

import {
  GROWTH_OPS_VALUES,
  upsertAccountCreation,
  upsertAuditCompletion,
  upsertPurchaseCompletion,
} from '@/lib/notion-growth-ops';

describe('notion-growth-ops', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NOTION_API_KEY = 'test-notion-key';
    process.env.NOTION_GROWTH_OPS_DB_ID = 'e7c4b6a2-2de2-4d52-bb7a-0f3584e46f55';
    mockPagesCreate.mockResolvedValue({ id: 'new-page-id' });
    mockPagesUpdate.mockResolvedValue({ id: 'existing-page-id' });
  });

  it('creates a new prospect when email is not found', async () => {
    mockDataSourcesQuery.mockResolvedValue({ results: [] });

    const result = await upsertAuditCompletion({
      email: 'prospect@example.com',
      businessName: 'Prospect Co',
      websiteUrl: 'https://prospect.example',
    });

    expect(result.success).toBe(true);
    expect(result.created).toBe(true);
    expect(mockPagesCreate).toHaveBeenCalledOnce();
    expect(mockPagesUpdate).not.toHaveBeenCalled();

    const createArgs = mockPagesCreate.mock.calls[0][0];
    expect(createArgs.parent.data_source_id).toBe('e7c4b6a22de24d52bb7a0f3584e46f55');
    expect(createArgs.properties['Client / Company Name']).toEqual({
      title: [{ text: { content: 'Prospect Co' } }],
    });
    expect(createArgs.properties['Funnel Stage']).toEqual({
      status: { name: GROWTH_OPS_VALUES.funnelStage.lead },
    });
    expect(createArgs.properties['Audit Results Ready']).toEqual({ checkbox: true });
    expect(createArgs.properties['Audit Submitted At']).toBeDefined();
    expect(createArgs.properties['Order Status']).toBeUndefined();
  });

  it('updates an existing prospect when email is found', async () => {
    mockDataSourcesQuery.mockResolvedValue({
      results: [
        {
          id: 'existing-page-id',
          properties: {
            'Client / Company Name': {
              title: [{ plain_text: 'Existing Co' }],
            },
          },
        },
      ],
    });

    const result = await upsertPurchaseCompletion({
      email: 'prospect@example.com',
      businessName: 'Existing Co',
      purchaseType: 'subscription',
      productLabel: 'Essential (Annual)',
      amount: 539,
    });

    expect(result.success).toBe(true);
    expect(result.created).toBe(false);
    expect(result.found).toBe(true);
    expect(mockPagesUpdate).toHaveBeenCalledOnce();
    expect(mockPagesCreate).not.toHaveBeenCalled();

    const updateArgs = mockPagesUpdate.mock.calls[0][0];
    expect(updateArgs.page_id).toBe('existing-page-id');
    expect(updateArgs.properties['Funnel Stage']).toEqual({
      status: { name: GROWTH_OPS_VALUES.funnelStage.sale },
    });
    expect(updateArgs.properties['Order Status']).toEqual({
      status: { name: GROWTH_OPS_VALUES.orderStatus.paid },
    });
    expect(updateArgs.properties['Payment Status']).toEqual({
      select: { name: GROWTH_OPS_VALUES.paymentStatus.paid },
    });
  });

  it('sets account creation fields without writing Order Status', async () => {
    mockDataSourcesQuery.mockResolvedValue({
      results: [
        {
          id: 'existing-page-id',
          properties: {
            'Client / Company Name': {
              title: [{ plain_text: 'Existing Co' }],
            },
          },
        },
      ],
    });

    await upsertAccountCreation({
      email: 'prospect@example.com',
      businessName: 'Existing Co',
      accountType: 'subscription',
    });

    const updateArgs = mockPagesUpdate.mock.calls[0][0];
    expect(updateArgs.properties['Funnel Stage']).toEqual({
      status: { name: GROWTH_OPS_VALUES.funnelStage.clientOnboarding },
    });
    expect(updateArgs.properties['Account Created']).toEqual({ checkbox: true });
    expect(updateArgs.properties['Order Status']).toBeUndefined();
  });

  it('returns an error when NOTION_GROWTH_OPS_DB_ID is missing', async () => {
    delete process.env.NOTION_GROWTH_OPS_DB_ID;

    const result = await upsertAuditCompletion({
      email: 'prospect@example.com',
      businessName: 'Prospect Co',
      websiteUrl: 'https://prospect.example',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('NOTION_GROWTH_OPS_DB_ID');
    expect(mockPagesCreate).not.toHaveBeenCalled();
  });
});
