import { Timestamp } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ordersWhereGet, usersWhereGet } = vi.hoisted(() => ({
  ordersWhereGet: vi.fn(),
  usersWhereGet: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (name: string) => {
      if (name === 'orders') {
        return {
          where: (field: string, op: string, value: unknown) => {
            expect(field).toBe('auditLeadLinked');
            expect(op).toBe('==');
            expect(value).toBe(false);
            return { get: ordersWhereGet };
          },
        };
      }

      if (name === 'users') {
        return {
          where: (field: string, op: string, value: unknown) => {
            expect(field).toBe('auditLeadLinked');
            expect(op).toBe('==');
            expect(value).toBe(false);
            return { get: usersWhereGet };
          },
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    },
  },
}));

import { listUnlinkedAuditLeadRecords } from '@/lib/admin/list-unlinked-audit-leads';

describe('listUnlinkedAuditLeadRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ordersWhereGet.mockResolvedValue({ docs: [] });
    usersWhereGet.mockResolvedValue({ docs: [] });
  });

  it('queries orders and users where auditLeadLinked == false', async () => {
    await listUnlinkedAuditLeadRecords();

    expect(ordersWhereGet).toHaveBeenCalledTimes(1);
    expect(usersWhereGet).toHaveBeenCalledTimes(1);
  });

  it('maps order and account rows with expected fields', async () => {
    ordersWhereGet.mockResolvedValue({
      docs: [
        {
          id: 'order-1',
          data: () => ({
            normalizedEmail: 'buyer@example.com',
            sku: 'speed_fix',
            createdAt: Timestamp.fromDate(new Date('2026-07-17T12:00:00Z')),
            auditLeadId: 'audit-lead-missing',
          }),
        },
      ],
    });

    usersWhereGet.mockResolvedValue({
      docs: [
        {
          id: 'user-1',
          data: () => ({
            email: 'account@example.com',
            siteFix: {
              contactEmail: 'account@example.com',
              auditLeadId: 'audit-lead-account',
              accountCreatedAt: Timestamp.fromDate(new Date('2026-07-17T13:00:00Z')),
            },
          }),
        },
      ],
    });

    const records = await listUnlinkedAuditLeadRecords();

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      type: 'account',
      recordId: 'user-1',
      customerEmail: 'account@example.com',
      sku: null,
      auditLeadId: 'audit-lead-account',
    });
    expect(records[1]).toMatchObject({
      type: 'order',
      recordId: 'order-1',
      customerEmail: 'buyer@example.com',
      sku: 'Speed Fix',
      auditLeadId: 'audit-lead-missing',
    });
  });
});
